import type { Dict } from 'typesdk/types';

import { ExtendedSerializableError, SerializedError } from './core';


export class NotImplementedError extends ExtendedSerializableError {
  public override readonly statusCode = 501 as const;
  public override readonly name = 'NotImplementedError' as const;

  constructor(message: string, action?: string, location?: string, context?: Dict<any>, errors?: SerializedError[]) {
    super(message, {
      action,
      errors,
      context,
      location,
      statusCode: 501 as const,
    });
  }
}

export default NotImplementedError;