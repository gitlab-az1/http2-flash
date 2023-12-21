import type { Dict } from 'typesdk/types';

import { ExtendedSerializableError, SerializedError } from './core';


export class ForbiddenError extends ExtendedSerializableError {
  public override readonly statusCode = 403 as const;
  public override readonly name = 'ForbiddenError' as const;

  constructor(message: string, action?: string, location?: string, context?: Dict<any>, errors?: SerializedError[]) {
    super(message, {
      action,
      errors,
      context,
      location,
      statusCode: 403 as const,
    });
  }
}

export default ForbiddenError;