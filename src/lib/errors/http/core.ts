import type { Dict } from 'typesdk/types';
import { Exception } from 'typesdk/errors';
import { jsonSafeParser, jsonSafeStringify } from 'typesdk';
import { isPlainObject, typeofTest } from 'typesdk/utils/is';


export interface SerializedError {
  readonly message: string;
}

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
    const obj = {
      ...this,
      action: this.action,
      context: this.context,
      errors: this.errors,
      message: this.message,
      location: this.location,
      statusCode: this.statusCode,
    };

    const fallbackObject = {
      action: this.action,
      context: Object.fromEntries(Object.entries(this.context ?? {}).map(([key, value]) => {
        if(!typeofTest('object')(value)) return [key, value];
        if(isPlainObject(value)) return [key, value];
        return [key, `[${typeof value}]`];
      })),
      errors: this.errors,
      message: this.message,
      location: this.location,
      statusCode: this.statusCode,
    };

    const json = jsonSafeStringify(obj);
    if(!json) return fallbackObject;

    const parsed = jsonSafeParser<ReturnType<typeof this.serialize>>(json);
    if(parsed.isLeft()) return fallbackObject;

    return parsed.value;
  }
}