import * as http from 'node:http';
import * as http2 from 'node:http2';
import type { Dict } from 'typesdk/types';

import BadRequestError from '@lib/errors/http/BadRequestError';


export { BodyParser } from 'typesdk/http/response';


/**
 * Parses the request body
 * 
 * @param {http.IncomingMessage|http2.Http2ServerRequest} request The request object
 * @returns {Promise<any>} The parsed body
 */
export async function parseRequestBody<T>(request: http.IncomingMessage | http2.Http2ServerRequest): Promise<T | null> {
  function parseJSONBody() {
    let body: string = '';

    return new Promise<T>((resolve, reject) => {
      request.on('data', chunk => {
        body += chunk.toString();
      });
  
      request.on('end', () => {
        try {
          const data = JSON.parse(body);
          resolve(data);
        } catch {
          reject(new BadRequestError('Failed to parse request body'));
        }
      });

      request.on('error', (err) => reject(new BadRequestError('Failed to parse request body', undefined, 'parseRequestBody', { error: err, reason: err.message })));
    });  
  }


  function parseTextPlain() {
    let body: string = '';

    return new Promise<T>((resolve, reject) => {
      request.on('data', chunk => {
        body += chunk.toString();
      });
  
      request.on('end', () => {
        resolve(body as unknown as T);
      });

      request.on('error', (err) => reject(new BadRequestError('Failed to parse request body', undefined, 'parseRequestBody', { error: err, reason: err.message })));
    });
  }


  function parseURLEncoded() {
    let body: string = '';

    return new Promise<T>((resolve, reject) => {
      request.on('data', chunk => {
        body += chunk.toString();
      });
  
      request.on('end', () => {
        const dict: Dict<string> = {};

        body.split('&').forEach(pair => {
          const [key, value] = pair.split('=').map(item => item.trim());
          dict[key] = decodeURIComponent(value);
        });

        resolve(dict as T);
      });

      request.on('error', (err) => reject(new BadRequestError('Failed to parse request body', undefined, 'parseRequestBody', { error: err, reason: err.message })));
    });
  }


  let result: T | null = null;
  const contentType = (request.headers['content-type'] || request.headers['Content-Type']) as string | undefined;

  if(!contentType) return null;

  switch(contentType.trim().toLowerCase()) {
    case 'application/json':
      result = await parseJSONBody();
      break;
    case 'text/plain':
      result = await parseTextPlain();
      break;
    case 'application/x-www-form-urlencoded':
      result = await parseURLEncoded();
      break;
    default:
      result = (await parseTextPlain()) ?? null;
  }

  return result;
}