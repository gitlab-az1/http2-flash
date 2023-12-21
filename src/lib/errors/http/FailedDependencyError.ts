import type { Dict } from 'typesdk/types';

import { ExtendedSerializableError, SerializedError } from './core';


export class FailedDependencyError extends ExtendedSerializableError {
  public override readonly statusCode = 424 as const;
  public override readonly name = 'FailedDependencyError' as const;

  constructor(message: string, action?: string, location?: string, context?: Dict<any>, errors?: SerializedError[]) {
    super(message, {
      action,
      errors,
      context,
      location,
      statusCode: 424 as const,
    });
  }
}

export default FailedDependencyError;