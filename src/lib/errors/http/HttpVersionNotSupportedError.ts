import type { Dict } from 'typesdk/types';

import { ExtendedSerializableError, SerializedError } from './core';


export class HttpVersionNotSupportedError extends ExtendedSerializableError {
  public override readonly statusCode = 505 as const;
  public override readonly name = 'HttpVersionNotSupportedError' as const;

  constructor(message: string, action?: string, location?: string, context?: Dict<any>, errors?: SerializedError[]) {
    super(message, {
      action,
      errors,
      context,
      location,
      statusCode: 505 as const,
    });
  }
}

export default HttpVersionNotSupportedError;