import type { Dict } from 'typesdk/types';

import { ExtendedSerializableError, SerializedError } from './core';


export class PaymentRequiredError extends ExtendedSerializableError {
  public override readonly statusCode = 402 as const;
  public override readonly name = 'PaymentRequiredError' as const;

  constructor(message: string, action?: string, location?: string, context?: Dict<any>, errors?: SerializedError[]) {
    super(message, {
      action,
      errors,
      context,
      location,
      statusCode: 402 as const,
    });
  }
}

export default PaymentRequiredError;