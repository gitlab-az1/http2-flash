import type { Dict } from 'typesdk/types';

import { ExtendedSerializableError, SerializedError } from './core';


export class LoopDetectedError extends ExtendedSerializableError {
  public override readonly statusCode = 508 as const;
  public override readonly name = 'LoopDetectedError' as const;

  constructor(message: string, action?: string, location?: string, context?: Dict<any>, errors?: SerializedError[]) {
    super(message, {
      action,
      errors,
      context,
      location,
      statusCode: 508 as const,
    });
  }
}

export default LoopDetectedError;