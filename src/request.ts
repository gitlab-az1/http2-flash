import * as net from 'node:net';
import * as http from 'node:http';
import * as http2 from 'node:http2';
import * as stream from 'node:stream';

import { Crypto } from 'typesdk/crypto';
import type { Dict, ReadonlyDict } from './types';

import * as inet from './lib/inet';

import { now } from './utils';
import { parseRequestBody } from './lib/body-parser';
import BadRequestError from './lib/errors/http/BadRequestError';


/**
 * Represents the client's internet connection information.
 */
export interface RequestInet {

  /** The client's IP address as an IPv4 or IPv6 object. */
  readonly ip: inet.IPv4 | inet.IPv6;
}

/**
 * Represents an extended HTTP request object, a subclass of the native `http.IncomingMessage` class.
 * 
 * Additions to the native class are:
 * 
 * - `requestId` - a unique request identifier
 * 
 * - `requestTime` - the time the request was received
 * 
 * - `context` - an extensible object for storing request-specific data
 * 
 * - `inet` - some information about the client's internet connection
 * 
 *    - `ip` - the client's IP address
 */
export interface ExtendedRequest extends http.IncomingMessage {

  /** An unique identifier for this request instance */
  readonly requestId: string;

  /** The precise timestamp when the request was received */
  readonly requestTime: number;

  /** An extensible object for storing request-specific data */
  readonly context: { readonly [key: string]: any };

  /** Information about the client's internet connection */
  readonly inet: RequestInet;

  /**
   * The request parameters extracted from the route path.
   */
  readonly params: Dict<string>;

  /**
   * Sets a value in the request context.
   * 
   * @param {string} key The key to set 
   * @param {*} value The value to set
   */
  setContext<K extends string = '', T = any>(key: K, value: T): void;

  /**
   * Gets a value from the request context.
   * 
   * @param {string} key The key to get
   */
  getContext<T = any, K extends string = ''>(key: K): T | null;

  /**
   * Check if a key exists in the request context.
   * 
   * @param {string} key The key to check
   */
  hasContextKey<K extends string = ''>(key: K): boolean;

  /**
   * Removes a key from the request context.
   * 
   * @param {string} key The key to remove 
   */
  removeContextKey<K extends string = ''>(key: K): void;

  /**
   * Parses the request body and returns a promise with the parsed body.
   */
  body<T>(): Promise<T>;
}


/**
 * Represents an extended HTTP/2 request object, a subclass of the native `http2.Http2ServerRequest` class.
 * 
 * Additions to the native class are:
 * 
 * - `requestId` - a unique request identifier
 * 
 * - `requestTime` - the time the request was received
 * 
 * - `context` - an extensible object for storing request-specific data
 * 
 * - `inet` - some information about the client's internet connection
 * 
 *    - `ip` - the client's IP address
 */
export interface ExtendedHttp2Request extends http2.Http2ServerRequest {

  /** An unique identifier for this request instance */
  readonly requestId: string;

  /** The precise timestamp when the request was received */
  readonly requestTime: number;

  /** An extensible object for storing request-specific data */
  readonly context: { readonly [key: string]: any };

  /** Information about the client's internet connection */
  readonly inet: RequestInet;

  /**
   * The request parameters extracted from the route path.
   */
  readonly params: Dict<string>;

  /**
   * Sets a value in the request context.
   * 
   * @param {string} key The key to set 
   * @param {*} value The value to set
   */
  setContext<K extends string = '', T = any>(key: K, value: T): void;

  /**
   * Gets a value from the request context.
   * 
   * @param {string} key The key to get
   */
  getContext<T = any, K extends string = ''>(key: K): T | null;

  /**
   * Check if a key exists in the request context.
   * 
   * @param {string} key The key to check
   */
  hasContextKey<K extends string = ''>(key: K): boolean;

  /**
   * Removes a key from the request context.
   * 
   * @param {string} key The key to remove 
   */
  removeContextKey<K extends string = ''>(key: K): void;

  /**
   * Parses the request body and returns a promise with the parsed body.
   */
  body<T>(): Promise<T>;
}


/**
 * Represents an HTTP request object extending the native `http.IncomingMessage` class
 */
export class Request extends http.IncomingMessage implements ExtendedRequest {
  readonly #requestId: string;
  readonly #requestTime: number;
  readonly #params: Dict<string>;
  readonly #clientIp: inet.IPv4 | inet.IPv6;
  #ctx: Dict<any>;

  constructor(
    socket: net.Socket,
    params: Dict<string> // eslint-disable-line comma-dangle
  ) {
    super(socket);

    // Generate a unique request ID
    this.#requestId = Crypto.uuid().replace(/-/g, '');

    // Store the route parameters
    this.#params = params;

    // Initialize the request context
    this.#ctx = {};
    
    // Extract the client's IP address
    this.#clientIp = inet.extractIPFromRequest(this);

    // Record the request time
    this.#requestTime = now();
  }

  public get requestId(): string {
    return this.#requestId;
  }

  public get requestTime(): number {
    return this.#requestTime;
  }

  public get context(): ReadonlyDict<any> {
    return Object.freeze(this.#ctx);
  }

  public get inet(): RequestInet {
    return Object.freeze({
      ip: this.#clientIp,
    });
  }

  public get params(): Dict<string> {
    return this.#params;
  }

  public setContext<K extends string = '', T = any>(key: K, value: T): void {
    this.#ctx[key] = value;
  }

  public getContext<T = any, K extends string = ''>(key: K): T | null {
    return (this.#ctx[key] ?? null);
  }

  public hasContextKey<K extends string = ''>(key: K): boolean {
    return Object.prototype.hasOwnProperty.call(this.#ctx, key);
  }

  public removeContextKey<K extends string = ''>(key: K): void {
    delete this.#ctx[key];
  }

  public async body<T>(): Promise<T> {
    const body = await parseRequestBody<T>(this);

    if(!body) {
      throw new BadRequestError('Failed to parse request body');
    }

    return body;
  }
}


export class Http2Request extends http2.Http2ServerRequest implements ExtendedHttp2Request {
  readonly #requestId: string;
  readonly #requestTime: number;
  readonly #params: Dict<string>;
  readonly #clientIp: inet.IPv4 | inet.IPv6;
  #ctx: Dict<any>;

  constructor(
    stream: http2.ServerHttp2Stream,
    headers: http2.IncomingHttpHeaders,
    options: stream.ReadableOptions,
    rawHeaders: readonly string[],
    params: Dict<string> // eslint-disable-line comma-dangle
  ) {
    super(stream, headers, options, rawHeaders);

    // Generate a unique request ID
    this.#requestId = Crypto.uuid().replace(/-/g, '');

    // Store the route parameters
    this.#params = params;

    // Initialize the request context
    this.#ctx = {};
    
    // Extract the client's IP address
    this.#clientIp = inet.extractIPFromRequest(this);

    // Record the request time
    this.#requestTime = now();
  }

  public get requestId(): string {
    return this.#requestId;
  }

  public get requestTime(): number {
    return this.#requestTime;
  }

  public get context(): ReadonlyDict<any> {
    return Object.freeze(this.#ctx);
  }

  public get inet(): RequestInet {
    return Object.freeze({
      ip: this.#clientIp,
    });
  }

  public get params(): Dict<string> {
    return this.#params;
  }

  public setContext<K extends string = '', T = any>(key: K, value: T): void {
    this.#ctx[key] = value;
  }

  public getContext<T = any, K extends string = ''>(key: K): T | null {
    return (this.#ctx[key] ?? null);
  }

  public hasContextKey<K extends string = ''>(key: K): boolean {
    return Object.prototype.hasOwnProperty.call(this.#ctx, key);
  }

  public removeContextKey<K extends string = ''>(key: K): void {
    delete this.#ctx[key];
  }

  public async body<T>(): Promise<T> {
    const body = await parseRequestBody<T>(this);

    if(!body) {
      throw new BadRequestError('Failed to parse request body');
    }

    return body;
  }
}



const _default = {
  Request,
  Http2Request,
} as const;

export default Object.freeze(_default);