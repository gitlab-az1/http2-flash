import type { Dict } from 'typesdk/types';

import { ExtendedSerializableError, SerializedError } from './core';


export class UnauthorizedError extends ExtendedSerializableError {
  public override readonly statusCode = 401 as const;
  public override readonly name = 'UnauthorizedError' as const;

  constructor(message: string, action?: string, location?: string, context?: Dict<any>, errors?: SerializedError[]) {
    super(message, {
      action,
      errors,
      context,
      location,
      statusCode: 401 as const,
    });
  }
}

export default UnauthorizedError;