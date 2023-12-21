import type { Dict } from 'typesdk/types';

import { ExtendedSerializableError, SerializedError } from './core';


export class RequestTimeoutError extends ExtendedSerializableError {
  public override readonly statusCode = 408 as const;
  public override readonly name = 'RequestTimeoutError' as const;

  constructor(message: string, action?: string, location?: string, context?: Dict<any>, errors?: SerializedError[]) {
    super(message, {
      action,
      errors,
      context,
      location,
      statusCode: 408 as const,
    });
  }
}

export default RequestTimeoutError;