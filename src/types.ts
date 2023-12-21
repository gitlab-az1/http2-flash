import type { CommonHttpHeaders } from 'typesdk/types';


export {
  ArrayValues,
  CommonHttpHeaders,
  DataType,
  Dict,
  GenericFunction,
  HttpMethod,
  MaybeArray,
  MaybePromise,
  PromiseResult,
  ReadonlyDict,
  Required,
  Writable,
} from 'typesdk/types';


export interface HttpHeaders extends CommonHttpHeaders {
  [key: string]: string | undefined;
}