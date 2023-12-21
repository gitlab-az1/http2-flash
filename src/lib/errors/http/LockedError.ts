import type { Dict } from 'typesdk/types';

import { ExtendedSerializableError, SerializedError } from './core';


export class LockedError extends ExtendedSerializableError {
  public override readonly statusCode = 423 as const;
  public override readonly name = 'LockedError' as const;

  constructor(message: string, action?: string, location?: string, context?: Dict<any>, errors?: SerializedError[]) {
    super(message, {
      action,
      errors,
      context,
      location,
      statusCode: 423 as const,
    });
  }
}

export default LockedError;