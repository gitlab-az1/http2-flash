import type { Dict } from 'typesdk/types';

import { ExtendedSerializableError, SerializedError } from './core';


export class BadGatewayError extends ExtendedSerializableError {
  public override readonly statusCode = 502 as const;
  public override readonly name = 'BadGatewayError' as const;

  constructor(message: string, action?: string, location?: string, context?: Dict<any>, errors?: SerializedError[]) {
    super(message, {
      action,
      errors,
      context,
      location,
      statusCode: 502 as const,
    });
  }
}

export default BadGatewayError;