import type { Dict } from 'typesdk/types';

import { ExtendedSerializableError, SerializedError } from './core';


export class RequestHeaderFieldsTooLargeError extends ExtendedSerializableError {
  public override readonly statusCode = 431 as const;
  public override readonly name = 'RequestHeaderFieldsTooLargeError' as const;

  constructor(message: string, action?: string, location?: string, context?: Dict<any>, errors?: SerializedError[]) {
    super(message, {
      action,
      errors,
      context,
      location,
      statusCode: 431 as const,
    });
  }
}

export default RequestHeaderFieldsTooLargeError;