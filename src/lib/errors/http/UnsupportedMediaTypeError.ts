import type { Dict } from 'typesdk/types';

import { ExtendedSerializableError, SerializedError } from './core';


export class UnsupportedMediaTypeError extends ExtendedSerializableError {
  public override readonly statusCode = 415 as const;
  public override readonly name = 'UnsupportedMediaTypeError' as const;

  constructor(message: string, action?: string, location?: string, context?: Dict<any>, errors?: SerializedError[]) {
    super(message, {
      action,
      errors,
      context,
      location,
      statusCode: 415 as const,
    });
  }
}

export default UnsupportedMediaTypeError;