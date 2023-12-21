import type { Dict } from 'typesdk/types';

import { ExtendedSerializableError, SerializedError } from './core';


export class InsufficientStorageError extends ExtendedSerializableError {
  public override readonly statusCode = 507 as const;
  public override readonly name = 'InsufficientStorageError' as const;

  constructor(message: string, action?: string, location?: string, context?: Dict<any>, errors?: SerializedError[]) {
    super(message, {
      action,
      errors,
      context,
      location,
      statusCode: 507 as const,
    });
  }
}

export default InsufficientStorageError;