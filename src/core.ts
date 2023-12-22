import math from 'typesdk/math';
import * as tls from 'node:tls';
import * as http from 'node:http';
import * as https from 'node:https';
import { format } from 'typesdk/utils/asci';
import { jsonSafeStringify } from 'typesdk/safe-json';

import inet from './lib/inet';
import { Router } from './router';
import { ExtendedSerializableError } from './lib/errors/http';


export type ServerContext = {
  readonly secure: true;
  readonly server: https.Server;
} | {
  readonly secure: false;
  readonly server: http.Server;
};

export interface HttpServer {
  readonly router: Router;
  readonly context: ServerContext;
}


export type ServerProps = {
  port?: number;
  secure?: boolean;
  verbose?: boolean;
  ssl?: tls.SecureContextOptions & tls.TlsOptions;
}

export function createServer(port?: number, options?: ServerProps): Promise<HttpServer>;
export function createServer(options?: ServerProps): Promise<HttpServer>;
export function createServer(portOrOptions?: number | ServerProps, options?: ServerProps): Promise<HttpServer> {
  let port: number;
  let o: ServerProps;

  if(typeof portOrOptions === 'number') {
    port = portOrOptions;
    o = options ?? {};
  } else {
    port = portOrOptions?.port ?? math.random.uniform(2100, 18900, 'round');
    o = portOrOptions ?? {};
  }

  let srv: http.Server | https.Server;
  const r = new Router({ verbose: typeof o.verbose === 'boolean' ? o.verbose : false });
  
  if(o.secure === true) {
    srv = https.createServer({ ...o.ssl }, _handleRequest(r));
  } else {
    srv = http.createServer(_handleRequest(r));
  }

  return new Promise((resolve, reject) => {
    srv.listen(port, () => {
      process.stdout.write(`${format.colors.magenta}[http2-flash] ${format.colors.green}HTTP/1${format.reset} Server is listening on: ${format.underline}${format.colors.cyan}http${o.secure === true ? 's' : ''}://${inet.localIP().address}:${port}${format.reset}\n`);

      const context = o.secure === true ? {
        secure: true as const,
        server: srv as https.Server,
      } : {
        secure: false as const,
        server: srv as http.Server,
      };

      resolve(Object.freeze({
        router: r,
        context,
      }));
    });

    srv.on('error', (err) => {
      srv?.close();
      reject(err);
    });
  });
}


function _handleRequest(router: Router, options?: Omit<ServerProps, 'ssl'>): http.RequestListener {
  return async (request, response) => {
    try {
      return void await router.executeHandler(request, response);
    } catch (err: any) {
      if(options?.verbose === true) {
        process.stderr.write(err.message + '\n');
        process.stderr.write('at ' + err.stack + '\n');
      }

      if(err instanceof ExtendedSerializableError) {
        response.statusCode = err.statusCode;
        response.setHeader('Content-Type', 'application/json');
        response.write(JSON.stringify(err.serialize()));

        return void response.end();
      } else {
        response.statusCode = err.statusCode ?? 500;
        response.setHeader('Content-Type', 'application/json');

        response.write(jsonSafeStringify({
          action: err.action ?? 'Check the server logs for more information.',
          context: err.context ?? {},
          message: err.message,
        }));

        return void response.end();
      }
    }
  };
}