import * as http2 from 'node:http2';


/**
 * Represents an extended HTTP/2 response object, a subclass of the native `http2.Http2ServerResponse` class.
 * Additions to the native class are:
 * - None
 */
export interface ExtendedResponse extends http2.Http2ServerResponse {}


/**
 * Represents an HTTP/2 response object extending the native `http2.Http2ServerResponse`
 */
export class Response extends http2.Http2ServerResponse implements ExtendedResponse {}

export default Response;
