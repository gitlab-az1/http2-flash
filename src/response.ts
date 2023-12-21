import * as http from 'node:http';
import * as http2 from 'node:http2';

import UnprocessableEntityError from '@lib/errors/http/UnprocessableEntityError';


/**
 * Represents an extended HTTP response object, a subclass of the native `http.ServerResponse` class.
 * Additions to the native class are:
 * - `json` - a method for sending JSON responses
 * - `status` - a method for setting the response status code
 */
export interface ExtendedResponse extends http.ServerResponse {

  /**
   * Sends a JSON response.
   * 
   * @param {*} data The data to send 
   */
  json(data: any): ExtendedResponse;

  /**
   * Sets the response status code.
   * 
   * @see https://developer.mozilla.org/docs/Web/HTTP/Status
   * 
   * @param {number} code The status code to set 
   */
  status(code: number): ExtendedResponse;
}


/**
 * Represents an extended HTTP/2 response object, a subclass of the native `http2.Http2ServerResponse` class.
 * Additions to the native class are:
 * - `json` - a method for sending JSON responses
 * - `status` - a method for setting the response status code
 */
export interface ExtendedHttp2Response extends http2.Http2ServerResponse {

  /**
   * Sends a JSON response.
   * 
   * @param {*} data The data to send 
   */
  json(data: any): ExtendedHttp2Response;

  /**
   * Sets the response status code.
   * 
   * @see https://developer.mozilla.org/docs/Web/HTTP/Status
   * 
   * @param {number} code The status code to set 
   */
  status(code: number): ExtendedHttp2Response;
}


/**
 * Represents an HTTP response object extending the native `http.ServerResponse` class.
 */
export class Response extends http.ServerResponse implements ExtendedResponse {
  #sendJSON(data: any): ExtendedResponse {
    let serialized: string;

    try {
      serialized = JSON.stringify(data);
    } catch (err: any) {
      throw new UnprocessableEntityError(
        'Failed to serialize response data',
        'Check if the provided data is serializable',
        'Response->json',
        { data } // eslint-disable-line comma-dangle
      );
    }

    if(!this.headersSent) {
      this.setHeader('Content-Type', 'application/json; charset=UTF-8');
    }

    this.write(serialized);
    return this;
  }

  /**
   * Sends a JSON response.
   * 
   * @param {*} data The data to send 
   */
  public json(data: any): ExtendedResponse {
    return this.#sendJSON(data);
  }

  /**
   * Sets the response status code.
   * 
   * @see https://developer.mozilla.org/docs/Web/HTTP/Status
   * 
   * @param {number} code The status code to set 
   */
  public status(code: number): ExtendedResponse {
    this.statusCode = code;
    return this;
  }
}


/**
 * Represents an HTTP/2 response object extending the native `http2.Http2ServerResponse`
 */
export class Http2Response extends http2.Http2ServerResponse implements ExtendedHttp2Response {
  #sendJSON(data: any): ExtendedHttp2Response {
    let serialized: string;

    try {
      serialized = JSON.stringify(data);
    } catch (err: any) {
      throw new UnprocessableEntityError(
        'Failed to serialize response data',
        'Check if the provided data is serializable',
        'Response->json',
        { data } // eslint-disable-line comma-dangle
      );
    }

    if(!this.headersSent) {
      this.setHeader('Content-Type', 'application/json; charset=UTF-8');
    }

    this.write(serialized);
    return this;
  }

  /**
   * Sends a JSON response.
   * 
   * @param {*} data The data to send 
   */
  public json(data: any): ExtendedHttp2Response {
    return this.#sendJSON(data);
  }

  /**
   * Sets the response status code.
   * 
   * @see https://developer.mozilla.org/docs/Web/HTTP/Status
   * 
   * @param {number} code The status code to set 
   */
  public status(code: number): ExtendedHttp2Response {
    this.statusCode = code;
    return this;
  }
}


const _default = {
  Response,
  Http2Response,
} as const;

export default Object.freeze(_default);