
/**
 * An abstract representation of a route holding the most common properties
 */
export interface AbstractRoute {

  /** The body of the request */
  body?: unknown;

  /** Request headers  */
  headers?: unknown;

  /** Search params from the request URL */
  query?: unknown;

  /** Bindings parameters from the route path */
  params?: unknown;

  /** Cookies from the request */
  cookie?: unknown;

  /** The response object */
  response?: unknown;
}