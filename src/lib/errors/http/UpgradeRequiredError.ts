import type { Dict } from 'typesdk/types';

import { ExtendedSerializableError, SerializedError } from './core';


export class UpgradeRequiredError extends ExtendedSerializableError {
  public override readonly statusCode = 426 as const;
  public override readonly name = 'UpgradeRequiredError' as const;

  constructor(message: string, action?: string, location?: string, context?: Dict<any>, errors?: SerializedError[]) {
    super(message, {
      action,
      errors,
      context,
      location,
      statusCode: 426 as const,
    });
  }
}

export default UpgradeRequiredError;