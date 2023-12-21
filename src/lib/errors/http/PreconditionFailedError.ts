import type { Dict } from 'typesdk/types';

import { ExtendedSerializableError, SerializedError } from './core';


export class PreconditionFailedError extends ExtendedSerializableError {
  public override readonly statusCode = 412 as const;
  public override readonly name = 'PreconditionFailedError' as const;

  constructor(message: string, action?: string, location?: string, context?: Dict<any>, errors?: SerializedError[]) {
    super(message, {
      action,
      errors,
      context,
      location,
      statusCode: 412 as const,
    });
  }
}

export default PreconditionFailedError;