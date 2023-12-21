import type { Dict } from 'typesdk/types';

import { ExtendedSerializableError, SerializedError } from './core';


export class NotExtendedError extends ExtendedSerializableError {
  public override readonly statusCode = 510 as const;
  public override readonly name = 'NotExtendedError' as const;

  constructor(message: string, action?: string, location?: string, context?: Dict<any>, errors?: SerializedError[]) {
    super(message, {
      action,
      errors,
      context,
      location,
      statusCode: 510 as const,
    });
  }
}

export default NotExtendedError;