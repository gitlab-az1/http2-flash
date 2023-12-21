import type { Dict } from 'typesdk/types';

import { ExtendedSerializableError, SerializedError } from './core';


export class PayloadTooLargeError extends ExtendedSerializableError {
  public override readonly statusCode = 413 as const;
  public override readonly name = 'PayloadTooLargeError' as const;

  constructor(message: string, action?: string, location?: string, context?: Dict<any>, errors?: SerializedError[]) {
    super(message, {
      action,
      errors,
      context,
      location,
      statusCode: 413 as const,
    });
  }
}

export default PayloadTooLargeError;