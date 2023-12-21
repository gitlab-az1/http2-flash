import type { Dict } from 'typesdk/types';

import { ExtendedSerializableError, SerializedError } from './core';


export class InternalServerError extends ExtendedSerializableError {
  public override readonly statusCode = 500 as const;
  public override readonly name = 'InternalServerError' as const;

  constructor(message: string, action?: string, location?: string, context?: Dict<any>, errors?: SerializedError[]) {
    super(message, {
      action,
      errors,
      context,
      location,
      statusCode: 500 as const,
    });
  }
}

export default InternalServerError;