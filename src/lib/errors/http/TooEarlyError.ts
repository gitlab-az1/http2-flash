import type { Dict } from 'typesdk/types';

import { ExtendedSerializableError, SerializedError } from './core';


export class TooEarlyError extends ExtendedSerializableError {
  public override readonly statusCode = 425 as const;
  public override readonly name = 'TooEarlyError' as const;

  constructor(message: string, action?: string, location?: string, context?: Dict<any>, errors?: SerializedError[]) {
    super(message, {
      action,
      errors,
      context,
      location,
      statusCode: 425 as const,
    });
  }
}

export default TooEarlyError;