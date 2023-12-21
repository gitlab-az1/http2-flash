import type { Dict } from 'typesdk/types';

import { ExtendedSerializableError, SerializedError } from './core';


export class UnavailableForLegalReasonsError extends ExtendedSerializableError {
  public override readonly statusCode = 451 as const;
  public override readonly name = 'UnavailableForLegalReasonsError' as const;

  constructor(message: string, action?: string, location?: string, context?: Dict<any>, errors?: SerializedError[]) {
    super(message, {
      action,
      errors,
      context,
      location,
      statusCode: 451 as const,
    });
  }
}

export default UnavailableForLegalReasonsError;