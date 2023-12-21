import * as http2 from 'node:http2';


/**
 * Represents an extended HTTP/2 request object, a subclass of the native `http2.Http2ServerRequest` class.
 * Additions to the native class are:
 * - None
 */
export interface ExtendedRequest extends http2.Http2ServerRequest {}


/**
 * Represents an HTTP/2 request object extending the native `http2.Http2ServerRequest`
 */
export class Request extends http2.Http2ServerRequest implements ExtendedRequest {}

export default Request;