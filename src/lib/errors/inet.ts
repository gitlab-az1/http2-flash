import type { Dict } from 'typesdk/types';
import { Exception } from 'typesdk/errors';


/**
 * Represents an exception thrown when an invalid IP address processed.
 */
export class InvalidIPAddress extends Exception {

  /**
   * Readonly property holding the name of the exception.
   */
  public readonly name = 'InvalidIPAddress' as const;

  /**
   * Readonly property holding the status code of the exception (default is `422 Unprocessable Entity`).
   */
  public readonly statusCode: number;

  /**
   * Constructor for the InvalidIPAddress class.
   * 
   * @param {string} message An error message for the exception
   * @param {number} status (Optional) The status code of the exception (default is `422 Unprocessable Entity`
   * @param {Dict<any>} context (Optional) A context object for the exception
   */
  constructor(message: string, status?: number, context?: Dict<any>) {
    super(message, context);
    this.statusCode = status && status >= 400 && status <= 511 ? status : 422;
  }
}