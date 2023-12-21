import type { Dict } from 'typesdk/types';

import { ExtendedSerializableError, SerializedError } from './core';


export class ConflictError extends ExtendedSerializableError {
  public override readonly statusCode = 409 as const;
  public override readonly name = 'ConflictError' as const;

  constructor(message: string, action?: string, location?: string, context?: Dict<any>, errors?: SerializedError[]) {
    super(message, {
      action,
      errors,
      context,
      location,
      statusCode: 409 as const,
    });
  }
}

export default ConflictError;