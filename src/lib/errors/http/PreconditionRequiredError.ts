import type { Dict } from 'typesdk/types';

import { ExtendedSerializableError, SerializedError } from './core';


export class PreconditionRequiredError extends ExtendedSerializableError {
  public override readonly statusCode = 428 as const;
  public override readonly name = 'PreconditionRequiredError' as const;

  constructor(message: string, action?: string, location?: string, context?: Dict<any>, errors?: SerializedError[]) {
    super(message, {
      action,
      errors,
      context,
      location,
      statusCode: 428 as const,
    });
  }
}

export default PreconditionRequiredError;