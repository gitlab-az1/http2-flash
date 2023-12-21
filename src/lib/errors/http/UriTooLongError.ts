import type { Dict } from 'typesdk/types';

import { ExtendedSerializableError, SerializedError } from './core';


export class UriTooLongError extends ExtendedSerializableError {
  public override readonly statusCode = 414 as const;
  public override readonly name = 'UriTooLongError' as const;

  constructor(message: string, action?: string, location?: string, context?: Dict<any>, errors?: SerializedError[]) {
    super(message, {
      action,
      errors,
      context,
      location,
      statusCode: 414 as const,
    });
  }
}

export default UriTooLongError;