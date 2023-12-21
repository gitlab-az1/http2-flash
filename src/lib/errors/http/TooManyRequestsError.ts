import type { Dict } from 'typesdk/types';

import { ExtendedSerializableError, SerializedError } from './core';


export class TooManyRequestsError extends ExtendedSerializableError {
  public override readonly statusCode = 429 as const;
  public override readonly name = 'TooManyRequestsError' as const;

  constructor(message: string, action?: string, location?: string, context?: Dict<any>, errors?: SerializedError[]) {
    super(message, {
      action,
      errors,
      context,
      location,
      statusCode: 429 as const,
    });
  }
}

export default TooManyRequestsError;