import type { Dict } from 'typesdk/types';

import { ExtendedSerializableError, SerializedError } from './core';


export class RangeNotSatisfiableError extends ExtendedSerializableError {
  public override readonly statusCode = 416 as const;
  public override readonly name = 'RangeNotSatisfiableError' as const;

  constructor(message: string, action?: string, location?: string, context?: Dict<any>, errors?: SerializedError[]) {
    super(message, {
      action,
      errors,
      context,
      location,
      statusCode: 416 as const,
    });
  }
}

export default RangeNotSatisfiableError;