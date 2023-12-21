import type { Dict } from 'typesdk/types';
import { Exception } from 'typesdk/errors';


export interface SerializedError {}

export type ExtendedSerializableErrorOptions = {
  action?: string;
  location?: string;
  statusCode?: number;
  context?: Dict<any>;
  errors?: SerializedError[];
}

export class ExtendedSerializableError extends Exception {
  public readonly errors?: SerializedError[];
  public readonly statusCode: number;
  public readonly location?: string;
  public readonly action: string;
  
  constructor(message: string, options?: ExtendedSerializableErrorOptions) {
    super(message, options?.context);

    this.errors = options?.errors;
    this.location = options?.location;
    this.statusCode = options?.statusCode ?? 500;
    this.action = options?.action ?? 'Contact the support team';
  }

  public serialize(): Readonly<ExtendedSerializableErrorOptions> & { readonly message: string } {
    return Object.freeze({
      action: this.action,
      context: this.context,
      errors: this.errors,
      message: this.message,
      location: this.location,
      statusCode: this.statusCode,
    });
  }
}