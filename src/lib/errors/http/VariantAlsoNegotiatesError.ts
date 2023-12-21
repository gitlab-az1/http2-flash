import type { Dict } from 'typesdk/types';

import { ExtendedSerializableError, SerializedError } from './core';


export class VariantAlsoNegotiatesError extends ExtendedSerializableError {
  public override readonly statusCode = 506 as const;
  public override readonly name = 'VariantAlsoNegotiatesError' as const;

  constructor(message: string, action?: string, location?: string, context?: Dict<any>, errors?: SerializedError[]) {
    super(message, {
      action,
      errors,
      context,
      location,
      statusCode: 506 as const,
    });
  }
}

export default VariantAlsoNegotiatesError;