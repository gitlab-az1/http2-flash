import type { Dict } from 'typesdk/types';

import { ExtendedSerializableError, SerializedError } from './core';


export class ExpectationFailedError extends ExtendedSerializableError {
  public override readonly statusCode = 417 as const;
  public override readonly name = 'ExpectationFailedError' as const;

  constructor(message: string, action?: string, location?: string, context?: Dict<any>, errors?: SerializedError[]) {
    super(message, {
      action,
      errors,
      context,
      location,
      statusCode: 417 as const,
    });
  }
}

export default ExpectationFailedError;