import * as net from 'node:net';
import * as tls from 'node:tls';
import * as http2 from 'node:http2';


/**
 * Represents a client with a session and socket for HTTP/2 communication.
 */
export interface Client {
  /** The HTTP/2 session associated with the client. */
  readonly session: http2.ClientHttp2Session;
  /** The socket (TLS or regular) associated with the client. */
  readonly socket: tls.TLSSocket | net.Socket;
}


/**
 * Creates a new HTTP/2 client with the given authority and options.
 * 
 * @param authority - The authority (hostname:port) for the HTTP/2 connection.
 * @param options - (Optional) Options for the HTTP/2 client session.
 * @returns A Promise resolving to a Client object representing the created HTTP/2 client.
 */
export function createClient(authority: string, options?: http2.ClientSessionOptions): Promise<Client> {
  return new Promise<Client>((resolve, reject) => {
    try {
      http2.connect(authority, options, (session, socket) => {
        resolve({ session, socket });
      });
    } catch (err) {
      reject(err);
    }
  });
}


/**
 * Represents an HTTP/2 client with a session and socket.
 */
export class Http2Client {
  readonly #session: http2.ClientHttp2Session;
  readonly #socket: tls.TLSSocket | net.Socket;

  /**
   * Private constructor for creating an instance of Http2Client.
   * 
   * @param session - The HTTP/2 session associated with the client.
   * @param socket - The socket (TLS or regular) associated with the client.
   */
  private constructor(session: http2.ClientHttp2Session, socket: tls.TLSSocket | net.Socket) {
    this.#session = session;
    this.#socket = socket;
  }

  /**
   * Creates and returns a new instance of Http2Client by connecting to the specified authority.
   * 
   * @param authority - The authority (hostname:port) for the HTTP/2 connection.
   * @param options - (Optional) Options for the HTTP/2 client session.
   * @returns A Promise resolving to a new Http2Client instance.
   */
  public static async connect(authority: string, options?: http2.ClientSessionOptions): Promise<Http2Client> {
    const { session, socket } = await createClient(authority, options);
    return new Http2Client(session, socket);
  }
}


const _default = {
  createClient,
  Http2Client,
} as const;

export default Object.freeze(_default);