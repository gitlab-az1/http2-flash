import * as http1 from 'node:http';
import * as http2 from 'node:http2';
import { format } from 'typesdk/utils/asci';
import { Crypto, Hash } from 'typesdk/crypto';
import { isPlainObject } from 'typesdk/utils/is';
import { assertString } from 'typesdk/utils/assertions';
import { EventEmitter, Event as BaseEvent } from 'typesdk/events';

import inet from './lib/inet';
import { isString, now } from './utils';
import { parseRequestBody } from './lib/body-parser';
import type { Dict, GenericFunction } from './types';
import { ExtendedSerializableError } from './lib/errors/http';
import { ExtendedHttp2Request, ExtendedRequest } from './request';
import { ExtendedHttp2Response, ExtendedResponse } from './response';
import UnprocessableEntityError from './lib/errors/http/UnprocessableEntityError';


class RouteNotFoundEvent extends BaseEvent<{ readonly route: string; readonly enrichedHandler: string; readonly method: string; }> {
  constructor(target: { readonly route: string; readonly enrichedHandler: string; readonly method: string; }) {
    super('404', {
      target,
      cancelable: false,
    });
  }
}

class MethodNotAllowedEvent extends BaseEvent<{ readonly route: string; readonly enrichedHandler: string; readonly method: string; }> {
  constructor(target: { readonly route: string; readonly enrichedHandler: string; readonly method: string; }) {
    super('405', {
      target,
      cancelable: false,
    });
  }
}

class ErrorEvent extends BaseEvent<ExtendedSerializableError> {
  constructor(error: ExtendedSerializableError) {
    super('error', {
      target: error,
      cancelable: false,
    });
  }
}


/**
 * The default events map for the `Router` class
 */
export interface DefaultRouterEventsMap {
  /** An error event emitted when an error occurs */
  error: ErrorEvent;

  /** An event emitted when a route is not found */
  '404': RouteNotFoundEvent;

  /** An event emitted when a route is found but the method is not allowed */
  '405': MethodNotAllowedEvent;
}


interface EventSubscriptionObject {
  readonly callback: GenericFunction<any>;
  unsubscribe(): void;
  readonly signature: string;
  readonly eventId: string;
  readonly event: string;
}


const FIND_ROUTE_REGEX = /([^/]+)/g;
const ROUTE_PARAM_REGEX = /:(\w+)/g;


/**
 * Type definition for the `next` function
 */
export type NextFunction = ((error?: ExtendedSerializableError) => void);


/**
 * Type definition for a route handler (HTTP/1)
 */
export type RouteHandler = ((request: ExtendedRequest, response: ExtendedResponse, next: NextFunction) => Promise<void>);


/**
 * Type definition for a route handler (HTTP/2)
 */
export type Http2RouteHandler = ((request: http2.Http2ServerRequest, response: http2.Http2ServerResponse, next: NextFunction) => Promise<void>);


/**
 * Type definition for a request handler (HTTP/1)
 */
export type RequestHandler = ((request: ExtendedRequest, response: ExtendedResponse, next: NextFunction) => Promise<void>);


/**
 * Type definition for a request handler (HTTP/2)
 */
export type Http2RequestHandler = ((request: http2.Http2ServerRequest, response: http2.Http2ServerResponse, next: NextFunction) => Promise<void>);

/**
 * A route handler with the parameters extracted from the route path (HTTP/1)
 */
export interface EnrichedHandler {

  /**
   * The handler function
   */
  readonly handlers: RequestHandler[];

  /**
   * Readonly array with the parameters extracted from the route path
   */
  readonly params: readonly string[];
}


/**
 * A route handler with the parameters extracted from the route path (HTTP/2)
 */
export interface Http2EnrichedHandler {

  /**
   * The handler function
   */
  readonly handlers: Http2RequestHandler[];
    
  /**
   * Readonly array with the parameters extracted from the route path
   */
  readonly params: readonly string[];
}

/**
 * Represents an map object with the route handler as value
 */
export type RouteList = Map<string, RouteHandler[]>;

/**
 * Represents an map object with the route handler as value (HTTP/2)
 */
export type Http2RouteList = Map<string, Http2RouteHandler[]>;

/**
 * The options for the `Router` class
 */
export type RouterProps = {

  /**
   * Whether to use strict routing or not
   */
  strict?: boolean;

  /**
   * Whether to debug informations in console or not
   */
  verbose?: boolean;
}

const DEFAULT_OPTIONS: RouterProps = {
  verbose: true,
  strict: false,
};

export class Router extends EventEmitter {
  readonly #prefix: string = '';
  readonly #baseRoutes: RouteList;
  readonly #enrichedRoutes: Map<string, EnrichedHandler>;
    
  #options: RouterProps = {};
  #events: EventSubscriptionObject[];
  #defaultHandlers: RequestHandler[] = [];

  /**
   * Creates a new instance of `Router`
   * 
   * @param {string|undefined} prefix The prefix to be used for all routes
   */
  constructor(prefix?: string);

  /**
   * Creates a new instance of `Router`
   * 
   * @param {string|undefined} prefix The prefix to be used for all routes
   * @param {RouterProps|undefined} props Initializations options
   */
  constructor(prefix?: string, options?: RouterProps);

  /**
   * Creates a new instance of `Router`
   * 
   * @param {Router[]|undefined} routes An array of `Router` instances 
   */
  constructor(routes?: Router[]);

  /**
   * Creates a new instance of `Router`
   * 
   * @param {Router[]|undefined} routes An array of `Router` instances 
   * @param {RouterProps|undefined} options Initializations options 
   */
  constructor(routes?: Router[], options?: RouterProps);

  /**
   * Creates a new instance of `Router`
   * 
   * @param {RouterProps|undefined} options Initializations options 
   */
  constructor(options?: RouterProps);

  /**
   * Creates a new instance of `Router`
   * 
   * @param {string|Router[]|undefined} x Either the prefix string or an array of `Router` instances 
   * @param {RouterProps|undefined} options Initializations options 
   */
  constructor(x?: string | Router[] | RouterProps, options?: RouterProps) {
    if(!x && !options) return;

    let rp: string | Router[];
    let o: RouterProps;

    if(isString(x)) {
      rp = x;
      o = options && isPlainObject(options) ? options : {};
    } else if (Array.isArray(x)) {
      if(!x.every(r => r instanceof Router)) {
        throw new TypeError('Some of the routes are not instances of `Router`');
      }

      rp = x;
      o = options && isPlainObject(options) ? options : {};
    } else {
      rp = [];
      o = x && isPlainObject(x) ? x : {};
    }

    super();
    this.#options = Object.assign(DEFAULT_OPTIONS, o);

    if(isString(rp)) {
      this.#prefix = rp;

      this.#baseRoutes = new Map<string, RouteHandler[]>();
      this.#enrichedRoutes = new Map<string, EnrichedHandler>();
    } else if(Array.isArray(rp) && rp.every(r => r instanceof Router)) {
      this.#prefix = '';

      this.#enrichedRoutes = new Map(rp.flatMap(router => {
        return [...router.parsedRoutes];
      }));

      this.#baseRoutes = new Map(rp.flatMap(router => {
        return [...router.routes];
      }));
    }
  }

  /**
   * The prefix used for all routes
   */
  public get prefix(): string {
    return this.#prefix;
  }

  /**
   * Returns a copy of the base routes in this router instance
   */
  public get routes(): RouteList {
    return new Map(this.#baseRoutes);
  }

  /**
   * Returns a copy of the enriched routes in this router instance
   */
  public get parsedRoutes(): Map<string, EnrichedHandler> {
    return new Map(this.#enrichedRoutes);
  }

  #extendNativeObjects(request: http1.IncomingMessage, response: http1.ServerResponse): { readonly extendedRequest: ExtendedRequest; readonly extendedResponse: ExtendedResponse } {
    const extendedRequest: ExtendedRequest = Object.assign(request, Object.freeze({
      requestId: Crypto.uuid().replace(/-/g, ''),
      requestTime: now(),
      context: {} as Dict<any>,
      inet: {
        ip: inet.extractIPFromRequest(request),
      },
      params: {} as Dict<string>,

      setContext(key: string, value: any): ExtendedRequest {
        this.context ??= {};
        this.context[key] = value;

        return this as unknown as ExtendedRequest;
      },

      getContext(key: string): any {
        return this.context?.[key] ?? null;
      },

      hasContextKey(key: string): boolean {
        return Object.prototype.hasOwnProperty.call(this.context ?? {}, key);
      },

      removeContextKey(key: string): void {
        delete this.context?.[key];
      },

      body(): Promise<any> {
        return parseRequestBody(request);
      },
    }));

    const extendedResponse: ExtendedResponse = Object.assign(response, Object.freeze({
      json(body: any): ExtendedResponse {
        let serialized: string;

        try {
          serialized = JSON.stringify(body);
        } catch (err: any) {
          throw new UnprocessableEntityError(
            'Failed to serialize response data',
            'Check if the provided data is serializable',
            'Response->json',
            { body } // eslint-disable-line comma-dangle
          );
        }

        if(!(this as unknown as http1.ServerResponse).headersSent) {
          (this as unknown as http1.ServerResponse).setHeader('Content-Type', 'application/json; charset=UTF-8');
        }

        (this as unknown as http1.ServerResponse).write(serialized);
        return this as ExtendedResponse;
      },

      status(code: number): ExtendedResponse {
        (this as unknown as http1.ServerResponse).statusCode = code;
        return this as unknown as ExtendedResponse;
      },

      send(data: string | Buffer | Uint8Array, options?: { ignoreNullByteCharacter?: boolean }): void {
        if(isString(data) && options?.ignoreNullByteCharacter !== true) {
          data = `${data}\n`;
        }

        (this as unknown as http1.ServerResponse).write(data);
        (this as unknown as http1.ServerResponse).end();
      },
    }));

    return { extendedRequest, extendedResponse };
  }

  /**
   * Handles a request and returns a promise that resolves when the request is handled
   * 
   * @param {http1.IncomingMessage} request The request object 
   * @param {http1.ServerResponse} response The response object 
   */
  public async executeHandler(request: http1.IncomingMessage, response: http1.ServerResponse): Promise<void> {
    const searchUrl = `${request.method?.toUpperCase()} ${request.url}` ?? '';
    const maybeHandlers = await this.#findAndParse(searchUrl);

    if(this.#options.verbose) {
      process.stdout.write(`->> ${searchUrl} from ${request.headers.host ?? 'Unknown host'}\n`);
    }

    let duration: number = now();

    try {
      if(maybeHandlers) {
        const { extendedRequest, extendedResponse } = this.#extendNativeObjects(request, response);
        const { handlers, params } = maybeHandlers;

        Object.assign(extendedRequest.params, params);
  
        for(let i = 0; i < this.#defaultHandlers.length - 1; i++) {
          const handler = this.#defaultHandlers[i];
          let handleNextRoute = false;

          const next = (error?: ExtendedSerializableError) => {
            if(error) {
              this.emit('error', error);
              return Promise.resolve();
            } else {
              handleNextRoute = true;
              return Promise.resolve();
            }
          };

          await handler(extendedRequest, extendedResponse, next);
          if(!handleNextRoute) break;
        }

        let handleRoutes = false;

        if(this.#defaultHandlers.length - 1 > -1) {
          await this.#defaultHandlers[this.#defaultHandlers.length - 1](extendedRequest, extendedResponse, (error?: ExtendedSerializableError) => {
            if(error) {
              this.emit('error', error);
              return Promise.resolve();
            } else {
              handleRoutes = true;
              return Promise.resolve();
            }
          });
        } else {
          handleRoutes = true;
        }

        if(!handleRoutes) return;

        for(const handler of handlers) {
          let handleNextRoute = false;

          const next = (error?: ExtendedSerializableError) => {
            if(error) {
              this.emit('error', error);
              return Promise.resolve();
            } else {
              handleNextRoute = true;
              return Promise.resolve();
            }
          };

          await handler(extendedRequest, extendedResponse, next);
          if(!handleNextRoute) break;
        }
      } else {
        if(this.#existsWithAnotherMethod(searchUrl)) {
          if(this.#options.verbose) {
            process.stdout.write(`<<- ${searchUrl} :: ${format.colors.brightYellow}405 Method Not Allowed ${format.colors.magenta}(${(now() - duration).toFixed(2)}ms)${format.reset}\n`);
          }

          this.emit('405', new MethodNotAllowedEvent({
            route: searchUrl,
            enrichedHandler: '',
            method: request.method?.toUpperCase() ?? '',
          }));

          response.writeHead(405, {
            'Content-Type': 'text/plain',
          });

          return void response.end();
        } else {
          if(this.#options.verbose) {
            process.stdout.write(`<<- ${searchUrl} :: ${format.colors.brightYellow}404 Not Found ${format.colors.magenta}(${(now() - duration).toFixed(2)}ms)${format.reset}\n`);
          }

          this.emit('404', new RouteNotFoundEvent({
            route: searchUrl,
            enrichedHandler: '',
            method: request.method?.toUpperCase() ?? '',
          }));

          response.writeHead(404, {
            'Content-Type': 'text/plain',
          });
    
          return void response.end();
        }
      }
    } catch (err: any) {
      this.emit('error', new ErrorEvent(err));
      throw err;
    } finally {
      duration = now() - duration;

      if(this.#options.verbose) {
        process.stdout.write(`<<- ${searchUrl} :: ${format.colors.brightYellow}${response.statusCode} ${format.colors.magenta}(${duration.toFixed(2)}ms)${format.reset}\n`);
      }
    }
  }

  async #findAndParse(url: string): Promise<{
    handlers: RequestHandler[];
    params: Dict<string>;
  } | undefined> {
    for(const [path, enrichedHandler] of this.#enrichedRoutes.entries()) {
      const matches = new RegExp(path).exec(url);
      if(!matches) continue;

      const params = matches.slice(1).reduce((accumulator, value, index) => {
        accumulator[enrichedHandler.params[index]] = value;
        return accumulator;
      }, {} as Dict<string>);

      return {
        handlers: enrichedHandler.handlers,
        params,
      };
    }

    return void 0;
  }

  #existsWithAnotherMethod(url: string): boolean {
    return [...this.#enrichedRoutes.keys()].map(r => {
      return new RegExp(r.split(' ')[1]);
    }).some(r => r.test(url));
  }

  /**
   * Adds a GET route to the router
   *
   * @param {string} path The route path
   * @param {RequestHandler[]} handlers The route handlers
   * @returns {this} The router instance
   */
  public get(path: string, ...handlers: RequestHandler[]): this {
    return this.#addRoute('GET', path, handlers);
  }

  /**
   * Adds a POST route to the router
   *
   * @param {string} path The route path
   * @param {RequestHandler[]} handlers The route handlers
   * @returns {this} The router instance
   */
  public post(path: string, ...handlers: RequestHandler[]): this {
    return this.#addRoute('POST', path, handlers);
  }

  /**
   * Adds a PUT route to the router
   *
   * @param {string} path The route path
   * @param {RequestHandler[]} handlers The route handlers
   * @returns {this} The router instance
   */
  public put(path: string, ...handlers: RequestHandler[]): this {
    return this.#addRoute('PUT', path, handlers);
  }

  /**
   * Adds a PATCH route to the router
   *
   * @param {string} path The route path
   * @param {RequestHandler[]} handlers The route handlers
   * @returns {this} The router instance
   */
  public patch(path: string, ...handlers: RequestHandler[]): this {
    return this.#addRoute('PATCH', path, handlers);
  }

  /**
   * Adds a DELETE route to the router
   *
   * @param {string} path The route path
   * @param {RequestHandler[]} handlers The route handlers
   * @returns {this} The router instance
   */
  public delete(path: string, ...handlers: RequestHandler[]): this {
    return this.#addRoute('DELETE', path, handlers);
  }

  /**
   * Adds a OPTIONS route to the router
   *
   * @param {string} path The route path
   * @param {RequestHandler[]} handlers The route handlers
   * @returns {this} The router instance
   */
  public options(path: string, ...handlers: RequestHandler[]): this {
    return this.#addRoute('OPTIONS', path, handlers);
  }

  /**
   * Adds a HEAD route to the router
   *
   * @param {string} path The route path
   * @param {RequestHandler[]} handlers The route handlers
   * @returns {this} The router instance
   */
  public head(path: string, ...handlers: RequestHandler[]): this {
    return this.#addRoute('HEAD', path, handlers);
  }

  /**
   * Adds a TRACE route to the router
   *
   * @param {string} path The route path
   * @param {RequestHandler[]} handlers The route handlers
   * @returns {this} The router instance
   */
  public trace(path: string, ...handlers: RequestHandler[]): this {
    return this.#addRoute('TRACE', path, handlers);
  }

  /**
   * Adds a CONNECT route to the router
   *
   * @param {string} path The route path
   * @param {RequestHandler[]} handlers The route handlers
   * @returns {this} The router instance
   */
  public connect(path: string, ...handlers: RequestHandler[]): this {
    return this.#addRoute('CONNECT', path, handlers);
  }

  /**
   * Concatenates the given handlers to the router
   * 
   * @param {(RequestHandler|Router)[]} handlers The handlers to be concatenated
   * @returns {this} The router instance
   */
  public use(...handlers: (RequestHandler | Router)[]): this {
    for(const item of handlers) {
      if(item instanceof Router) {
        for(const [path, enrichedHandler] of item.parsedRoutes.entries()) {
          this.#enrichedRoutes.set(path, enrichedHandler);
        }

        for(const [path, handlers] of item.routes.entries()) {
          this.#baseRoutes.set(path, handlers);
        }      
      } else {
        this.#defaultHandlers.push(item);
      }
    }

    return this;
  }

  #addRoute(method: string, path: string, handlers: RequestHandler[]): this {
    const parsedRoute = `${method.toUpperCase()} ${this.#prefix}${path === '/' ? '' : path}`;
    
    this.#baseRoutes.set(parsedRoute, handlers);
    const [parsedURL, enrichedHandler] = this.#parse(parsedRoute, handlers)[0];
    
    this.#enrichedRoutes.set(parsedURL, enrichedHandler);
    return this;
  }

  #parse(routes: RouteList): [string, EnrichedHandler][];
  #parse(url: string, handlers: RequestHandler[]): [string, EnrichedHandler][];
  #parse(listOrUrl: RouteList | string, handlers?: RequestHandler[]) {
    const routeMap = new Map<string, EnrichedHandler>();
    if(isString(listOrUrl) && handlers) return this.#parse(new Map([[listOrUrl, handlers]]));

    if(listOrUrl instanceof Map) {
      for(const [key, handlers] of listOrUrl.entries()) {
        let parsedKey = key;
        let enrichedObject: EnrichedHandler = {
          params: [],
          handlers,
        };

        const paramMatches = key.match(ROUTE_PARAM_REGEX);
        
        if(paramMatches) {
          parsedKey = key.replaceAll(ROUTE_PARAM_REGEX, FIND_ROUTE_REGEX.source);
          enrichedObject = {
            handlers,
            params: paramMatches.map(paramether => paramether.slice(1)),
          };
        }
        
        routeMap.set(parsedKey, enrichedObject);
      }
    }

    return Array.from(routeMap);
  }

  /**
   * Adds a listener for the given event
   * 
   * @param {string} event The event name 
   * @param {Function} callback The callback function
   */
  public addEventListener<K extends keyof DefaultRouterEventsMap>(event: K | Omit<string, K>, callback: ((event: DefaultRouterEventsMap[K]) => void)) {
    assertString(event);

    const subscription = this.subscribe(event, callback);
    const signature = Hash.sha256(callback.toString());

    this.#events.push({
      callback,
      unsubscribe: subscription.unsubscribe,
      signature,
      eventId: Crypto.uuid(),
      event,
    });
  }

  /**
   * Removes a listener for the given event
   * 
   * @param {string} event The event name 
   * @param {Function} callback The callback function
   */
  public removeEventListener<K extends keyof DefaultRouterEventsMap>(event: K | Omit<string, K>, callback: ((event: DefaultRouterEventsMap[K]) => void)) {
    assertString(event);
    
    const signature = Hash.sha256(callback.toString());
    const index = this.#events.findIndex(e => e.event === event && e.signature === signature);
    
    if(index < 0) return;
    
    this.#events[index].unsubscribe();
    this.#events.splice(index, 1);
  }

  /**
   * Removes all listeners for the given event
   * 
   * @param {string} event The event name 
   */
  public off<K extends keyof DefaultRouterEventsMap>(event: K | Omit<string, K>): void {
    const arr = this.#events.filter(e => e.event === event);
    arr.forEach(listener => listener.unsubscribe());

    this.#events = this.#events.filter(e => e.event !== event);
  }

  /**
   * Removes all listeners for all events
   */
  public removeAllEventListeners() {
    for(const listener of this.#events) {
      listener.unsubscribe();
    }
    
    this.#events = [];
  }
}


export class Http2Router extends EventEmitter {
  readonly #prefix: string = '';
  readonly #baseRoutes: Http2RouteList;
  readonly #enrichedRoutes: Map<string, Http2EnrichedHandler>;
    
  #options: RouterProps = {};
  #events: EventSubscriptionObject[];
  #defaultHandlers: Http2RequestHandler[] = [];

  /**
   * Creates a new instance of `Router`
   * 
   * @param {string|undefined} prefix The prefix to be used for all routes
   */
  constructor(prefix?: string);

  /**
   * Creates a new instance of `Router`
   * 
   * @param {string|undefined} prefix The prefix to be used for all routes
   * @param {RouterProps|undefined} props Initializations options
   */
  constructor(prefix?: string, options?: RouterProps);

  /**
   * Creates a new instance of `Router`
   * 
   * @param {Http2Router[]|undefined} routes An array of `Router` instances 
   */
  constructor(routes?: Http2Router[]);

  /**
   * Creates a new instance of `Router`
   * 
   * @param {Http2Router[]|undefined} routes An array of `Router` instances 
   * @param {RouterProps|undefined} options Initializations options 
   */
  constructor(routes?: Http2Router[], options?: RouterProps);

  /**
   * Creates a new instance of `Router`
   * 
   * @param {RouterProps|undefined} options Initializations options 
   */
  constructor(options?: RouterProps);

  /**
   * Creates a new instance of `Router`
   * 
   * @param {string|Http2Router[]|undefined} x Either the prefix string or an array of `Router` instances 
   * @param {RouterProps|undefined} options Initializations options 
   */
  constructor(x?: string | Http2Router[] | RouterProps, options?: RouterProps) {
    if(!x && !options) return;

    let rp: string | Http2Router[];
    let o: RouterProps;

    if(isString(x)) {
      rp = x;
      o = options && isPlainObject(options) ? options : {};
    } else if (Array.isArray(x)) {
      if(!x.every(r => r instanceof Http2Router)) {
        throw new TypeError('Some of the routes are not instances of `Http2Router`');
      }

      rp = x;
      o = options && isPlainObject(options) ? options : {};
    } else {
      rp = [];
      o = x && isPlainObject(x) ? x : {};
    }

    super();
    this.#options = Object.assign(DEFAULT_OPTIONS, o);

    if(isString(rp)) {
      this.#prefix = rp;

      this.#baseRoutes = new Map<string, Http2RouteHandler[]>();
      this.#enrichedRoutes = new Map<string, Http2EnrichedHandler>();
    } else if(Array.isArray(rp) && rp.every(r => r instanceof Http2Router)) {
      this.#prefix = '';

      this.#enrichedRoutes = new Map(rp.flatMap(router => {
        return [...router.parsedRoutes];
      }));

      this.#baseRoutes = new Map(rp.flatMap(router => {
        return [...router.routes];
      }));
    }
  }

  /**
   * The prefix used for all routes
   */
  public get prefix(): string {
    return this.#prefix;
  }

  /**
   * Returns a copy of the base routes in this router instance
   */
  public get routes(): Http2RouteList {
    return new Map(this.#baseRoutes);
  }

  /**
   * Returns a copy of the enriched routes in this router instance
   */
  public get parsedRoutes(): Map<string, Http2EnrichedHandler> {
    return new Map(this.#enrichedRoutes);
  }

  #extendNativeObjects(request: http2.Http2ServerRequest, response: http2.Http2ServerResponse): { readonly extendedRequest: ExtendedHttp2Request; readonly extendedResponse: ExtendedHttp2Response } {
    const extendedRequest: ExtendedHttp2Request = Object.assign(request, Object.freeze({
      requestId: Crypto.uuid().replace(/-/g, ''),
      requestTime: now(),
      context: {} as Dict<any>,
      inet: {
        ip: inet.extractIPFromRequest(request),
      },
      params: {} as Dict<string>,

      setContext(key: string, value: any): ExtendedHttp2Request {
        this.context ??= {};
        this.context[key] = value;

        return this as unknown as ExtendedHttp2Request;
      },

      getContext(key: string): any {
        return this.context?.[key] ?? null;
      },

      hasContextKey(key: string): boolean {
        return Object.prototype.hasOwnProperty.call(this.context ?? {}, key);
      },

      removeContextKey(key: string): void {
        delete this.context?.[key];
      },

      body(): Promise<any> {
        return parseRequestBody(request);
      },
    }));

    const extendedResponse: ExtendedHttp2Response = Object.assign(response, Object.freeze({
      json(body: any): ExtendedHttp2Response {
        let serialized: string;

        try {
          serialized = JSON.stringify(body);
        } catch (err: any) {
          throw new UnprocessableEntityError(
            'Failed to serialize response data',
            'Check if the provided data is serializable',
            'Response->json',
            { body } // eslint-disable-line comma-dangle
          );
        }

        if(!(this as unknown as http2.Http2ServerResponse).headersSent) {
          (this as unknown as http2.Http2ServerResponse).setHeader('Content-Type', 'application/json; charset=UTF-8');
        }

        (this as unknown as http2.Http2ServerResponse).write(serialized);
        return this as unknown as ExtendedHttp2Response;
      },

      status(code: number): ExtendedHttp2Response {
        (this as unknown as http2.Http2ServerResponse).statusCode = code;
        return this as unknown as ExtendedHttp2Response;
      },

      send(data: string | Buffer | Uint8Array, options?: { ignoreNullByteCharacter?: boolean }): void {
        if(isString(data) && options?.ignoreNullByteCharacter !== true) {
          data = `${data}\n`;
        }

        (this as unknown as http2.Http2ServerResponse).write(data);
        (this as unknown as http2.Http2ServerResponse).end();
      },
    }));

    return { extendedRequest, extendedResponse };
  }

  /**
   * Handles a request and returns a promise that resolves when the request is handled
   * 
   * @param {http1.IncomingMessage} request The request object 
   * @param {http1.ServerResponse} response The response object 
   */
  public async executeHandler(request: http2.Http2ServerRequest, response: http2.Http2ServerResponse): Promise<void> {
    const searchUrl = `${request.method?.toUpperCase()} ${request.url}` ?? '';
    const maybeHandlers = await this.#findAndParse(searchUrl);

    if(this.#options.verbose) {
      process.stdout.write(`->> ${searchUrl} from ${request.headers.host ?? 'Unknown host'}\n`);
    }

    let duration: number = now();

    try {
      if(maybeHandlers) {
        const { extendedRequest, extendedResponse } = this.#extendNativeObjects(request, response);
        const { handlers, params } = maybeHandlers;

        Object.assign(extendedRequest.params, params);
  
        for(let i = 0; i < this.#defaultHandlers.length - 1; i++) {
          const handler = this.#defaultHandlers[i];
          let handleNextRoute = false;

          const next = (error?: ExtendedSerializableError) => {
            if(error) {
              this.emit('error', error);
              return Promise.resolve();
            } else {
              handleNextRoute = true;
              return Promise.resolve();
            }
          };

          await handler(extendedRequest, extendedResponse, next);
          if(!handleNextRoute) break;
        }

        let handleRoutes = false;

        await this.#defaultHandlers[this.#defaultHandlers.length - 1](extendedRequest, extendedResponse, (error?: ExtendedSerializableError) => {
          if(error) {
            this.emit('error', error);
            return Promise.resolve();
          } else {
            handleRoutes = true;
            return Promise.resolve();
          }
        });

        if(!handleRoutes) return;

        for(const handler of handlers) {
          let handleNextRoute = false;

          const next = (error?: ExtendedSerializableError) => {
            if(error) {
              this.emit('error', error);
              return Promise.resolve();
            } else {
              handleNextRoute = true;
              return Promise.resolve();
            }
          };

          await handler(extendedRequest, extendedResponse, next);
          if(!handleNextRoute) break;
        }
      } else {
        if(this.#existsWithAnotherMethod(searchUrl)) {
          if(this.#options.verbose) {
            process.stdout.write(`<<- ${searchUrl} :: ${format.colors.brightYellow}405 Method Not Allowed ${format.colors.magenta}(${(now() - duration).toFixed(2)}ms)${format.reset}\n`);
          }

          this.emit('405', new MethodNotAllowedEvent({
            route: searchUrl,
            enrichedHandler: '',
            method: request.method?.toUpperCase() ?? '',
          }));

          response.writeHead(405, {
            'Content-Type': 'text/plain',
          });

          return void response.end();
        } else {
          if(this.#options.verbose) {
            process.stdout.write(`<<- ${searchUrl} :: ${format.colors.brightYellow}404 Not Found ${format.colors.magenta}(${(now() - duration).toFixed(2)}ms)${format.reset}\n`);
          }

          this.emit('404', new RouteNotFoundEvent({
            route: searchUrl,
            enrichedHandler: '',
            method: request.method?.toUpperCase() ?? '',
          }));

          response.writeHead(404, {
            'Content-Type': 'text/plain',
          });
    
          return void response.end();
        }
      }
    } catch (err: any) {
      this.emit('error', new ErrorEvent(err));
      throw err;
    } finally {
      duration = now() - duration;

      if(this.#options.verbose) {
        process.stdout.write(`<<- ${searchUrl} :: ${format.colors.brightYellow}${response.statusCode} ${format.colors.magenta}(${duration.toFixed(2)}ms)${format.reset}\n`);
      }
    }
  }

  async #findAndParse(url: string): Promise<{
    handlers: Http2RequestHandler[];
    params: Dict<string>;
  } | undefined> {
    for(const [path, enrichedHandler] of this.#enrichedRoutes.entries()) {
      const matches = new RegExp(path).exec(url);
      if(!matches) continue;

      const params = matches.slice(1).reduce((accumulator, value, index) => {
        accumulator[enrichedHandler.params[index]] = value;
        return accumulator;
      }, {} as Dict<string>);

      return {
        handlers: enrichedHandler.handlers,
        params,
      };
    }

    return void 0;
  }

  #existsWithAnotherMethod(url: string): boolean {
    return [...this.#enrichedRoutes.keys()].map(r => {
      return new RegExp(r.split(' ')[1]);
    }).some(r => r.test(url));
  }

  /**
   * Adds a GET route to the router
   *
   * @param {string} path The route path
   * @param {Http2RequestHandler[]} handlers The route handlers
   * @returns {this} The router instance
   */
  public get(path: string, ...handlers: Http2RequestHandler[]): this {
    return this.#addRoute('GET', path, handlers);
  }

  /**
   * Adds a POST route to the router
   *
   * @param {string} path The route path
   * @param {Http2RequestHandler[]} handlers The route handlers
   * @returns {this} The router instance
   */
  public post(path: string, ...handlers: Http2RequestHandler[]): this {
    return this.#addRoute('POST', path, handlers);
  }

  /**
   * Adds a PUT route to the router
   *
   * @param {string} path The route path
   * @param {Http2RequestHandler[]} handlers The route handlers
   * @returns {this} The router instance
   */
  public put(path: string, ...handlers: Http2RequestHandler[]): this {
    return this.#addRoute('PUT', path, handlers);
  }

  /**
   * Adds a PATCH route to the router
   *
   * @param {string} path The route path
   * @param {Http2RequestHandler[]} handlers The route handlers
   * @returns {this} The router instance
   */
  public patch(path: string, ...handlers: Http2RequestHandler[]): this {
    return this.#addRoute('PATCH', path, handlers);
  }

  /**
   * Adds a DELETE route to the router
   *
   * @param {string} path The route path
   * @param {Http2RequestHandler[]} handlers The route handlers
   * @returns {this} The router instance
   */
  public delete(path: string, ...handlers: Http2RequestHandler[]): this {
    return this.#addRoute('DELETE', path, handlers);
  }

  /**
   * Adds a OPTIONS route to the router
   *
   * @param {string} path The route path
   * @param {Http2RequestHandler[]} handlers The route handlers
   * @returns {this} The router instance
   */
  public options(path: string, ...handlers: Http2RequestHandler[]): this {
    return this.#addRoute('OPTIONS', path, handlers);
  }

  /**
   * Adds a HEAD route to the router
   *
   * @param {string} path The route path
   * @param {Http2RequestHandler[]} handlers The route handlers
   * @returns {this} The router instance
   */
  public head(path: string, ...handlers: Http2RequestHandler[]): this {
    return this.#addRoute('HEAD', path, handlers);
  }

  /**
   * Adds a TRACE route to the router
   *
   * @param {string} path The route path
   * @param {Http2RequestHandler[]} handlers The route handlers
   * @returns {this} The router instance
   */
  public trace(path: string, ...handlers: Http2RequestHandler[]): this {
    return this.#addRoute('TRACE', path, handlers);
  }

  /**
   * Adds a CONNECT route to the router
   *
   * @param {string} path The route path
   * @param {Http2RequestHandler[]} handlers The route handlers
   * @returns {this} The router instance
   */
  public connect(path: string, ...handlers: Http2RequestHandler[]): this {
    return this.#addRoute('CONNECT', path, handlers);
  }

  /**
   * Concatenates the given handlers to the router
   * 
   * @param {(Http2RequestHandler|Router)[]} handlers The handlers to be concatenated
   * @returns {this} The router instance
   */
  public use(...handlers: (Http2RequestHandler | Http2Router)[]): this {
    for(const item of handlers) {
      if(item instanceof Http2Router) {
        for(const [path, enrichedHandler] of item.parsedRoutes.entries()) {
          this.#enrichedRoutes.set(path, enrichedHandler);
        }

        for(const [path, handlers] of item.routes.entries()) {
          this.#baseRoutes.set(path, handlers);
        }      
      } else {
        this.#defaultHandlers.push(item);
      }
    }

    return this;
  }

  #addRoute(method: string, path: string, handlers: Http2RequestHandler[]): this {
    const parsedRoute = `${method.toUpperCase()} ${this.#prefix}${path === '/' ? '' : path}`;
    
    this.#baseRoutes.set(parsedRoute, handlers);
    const [parsedURL, enrichedHandler] = this.#parse(parsedRoute, handlers)[0];
    
    this.#enrichedRoutes.set(parsedURL, enrichedHandler);
    return this;
  }

  #parse(routes: Http2RouteList): [string, Http2EnrichedHandler][];
  #parse(url: string, handlers: Http2RequestHandler[]): [string, Http2EnrichedHandler][];
  #parse(listOrUrl: Http2RouteList | string, handlers?: Http2RequestHandler[]) {
    const routeMap = new Map<string, Http2EnrichedHandler>();
    if(isString(listOrUrl) && handlers) return this.#parse(new Map([[listOrUrl, handlers]]));

    if(listOrUrl instanceof Map) {
      for(const [key, handlers] of listOrUrl.entries()) {
        let parsedKey = key;
        let enrichedObject: Http2EnrichedHandler = {
          params: [],
          handlers,
        };

        const paramMatches = key.match(ROUTE_PARAM_REGEX);
        
        if(paramMatches) {
          parsedKey = key.replaceAll(ROUTE_PARAM_REGEX, FIND_ROUTE_REGEX.source);
          enrichedObject = {
            handlers,
            params: paramMatches.map(paramether => paramether.slice(1)),
          };
        }
        
        routeMap.set(parsedKey, enrichedObject);
      }
    }

    return Array.from(routeMap);
  }

  /**
   * Adds a listener for the given event
   * 
   * @param {string} event The event name 
   * @param {Function} callback The callback function
   */
  public addEventListener<K extends keyof DefaultRouterEventsMap>(event: K | Omit<string, K>, callback: ((event: DefaultRouterEventsMap[K]) => void)) {
    assertString(event);

    const subscription = this.subscribe(event, callback);
    const signature = Hash.sha256(callback.toString());

    this.#events.push({
      callback,
      unsubscribe: subscription.unsubscribe,
      signature,
      eventId: Crypto.uuid(),
      event,
    });
  }

  /**
   * Removes a listener for the given event
   * 
   * @param {string} event The event name 
   * @param {Function} callback The callback function
   */
  public removeEventListener<K extends keyof DefaultRouterEventsMap>(event: K | Omit<string, K>, callback: ((event: DefaultRouterEventsMap[K]) => void)) {
    assertString(event);
    
    const signature = Hash.sha256(callback.toString());
    const index = this.#events.findIndex(e => e.event === event && e.signature === signature);
    
    if(index < 0) return;
    
    this.#events[index].unsubscribe();
    this.#events.splice(index, 1);
  }

  /**
   * Removes all listeners for the given event
   * 
   * @param {string} event The event name 
   */
  public off<K extends keyof DefaultRouterEventsMap>(event: K | Omit<string, K>): void {
    const arr = this.#events.filter(e => e.event === event);
    arr.forEach(listener => listener.unsubscribe());

    this.#events = this.#events.filter(e => e.event !== event);
  }

  /**
   * Removes all listeners for all events
   */
  public removeAllEventListeners() {
    for(const listener of this.#events) {
      listener.unsubscribe();
    }
    
    this.#events = [];
  }
}



const _default = {
  Router,
  Http2Router,
} as const;

export default Object.freeze(_default);