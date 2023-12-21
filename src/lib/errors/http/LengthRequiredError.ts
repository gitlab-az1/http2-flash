import type { Dict } from 'typesdk/types';

import { ExtendedSerializableError, SerializedError } from './core';


export class LengthRequiredError extends ExtendedSerializableError {
  public override readonly statusCode = 411 as const;
  public override readonly name = 'LengthRequiredError' as const;

  constructor(message: string, action?: string, location?: string, context?: Dict<any>, errors?: SerializedError[]) {
    super(message, {
      action,
      errors,
      context,
      location,
      statusCode: 409 as const,
    });
  }
}

export default LengthRequiredError;