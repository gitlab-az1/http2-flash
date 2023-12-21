import type { Dict } from 'typesdk/types';

import { ExtendedSerializableError, SerializedError } from './core';


export class UnprocessableEntityError extends ExtendedSerializableError {
  public override readonly statusCode = 422 as const;
  public override readonly name = 'UnprocessableEntityError' as const;

  constructor(message: string, action?: string, location?: string, context?: Dict<any>, errors?: SerializedError[]) {
    super(message, {
      action,
      errors,
      context,
      location,
      statusCode: 422,
    });
  }
}

export default UnprocessableEntityError;