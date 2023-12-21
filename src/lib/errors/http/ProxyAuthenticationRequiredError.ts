import type { Dict } from 'typesdk/types';

import { ExtendedSerializableError, SerializedError } from './core';


export class ProxyAuthenticationRequiredError extends ExtendedSerializableError {
  public override readonly statusCode = 407 as const;
  public override readonly name = 'ProxyAuthenticationRequiredError' as const;

  constructor(message: string, action?: string, location?: string, context?: Dict<any>, errors?: SerializedError[]) {
    super(message, {
      action,
      errors,
      context,
      location,
      statusCode: 407 as const,
    });
  }
}

export default ProxyAuthenticationRequiredError;