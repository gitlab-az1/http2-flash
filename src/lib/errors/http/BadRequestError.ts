import type { Dict } from 'typesdk/types';

import { ExtendedSerializableError, SerializedError } from './core';


export class BadRequestError extends ExtendedSerializableError {
  public override readonly statusCode = 400 as const;
  public override readonly name = 'BadRequestError' as const;

  constructor(message: string, action?: string, location?: string, context?: Dict<any>, errors?: SerializedError[]) {
    super(message, {
      action,
      errors,
      context,
      location,
      statusCode: 400 as const,
    });
  }
}

export default BadRequestError;