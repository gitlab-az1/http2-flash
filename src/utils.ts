import { typeofTest } from 'typesdk/utils/is';


/**
 * Checks if the value is a string.
 * 
 * @param {*} value The value to be checked
 * @returns {boolean} True if the value is a string, false otherwise
 */
export function isString(value: unknown): value is string {
  return (
    typeofTest('string')(value) ||
    (value instanceof String)
  );
}


/**
 * Checks if the value is a number.
 * 
 * @param {*} value The value to be checked 
 * @returns {boolean} True if the value is a number, false otherwise
 */
export function isDigit(value: unknown): value is number {
  return (
    typeofTest('number')(value) ||
    (value instanceof Number)
  ) && !Number.isNaN(value);
} 


/**
 * Checks if the provided value is a number represented as one of teh following:
 * - A number
 * - A string containing a number (e.g. `'123'`)
 * - A string containing a number with a leading `+` or `-` sign (e.g. `'+123'`, `'-123'`)
 * - A hexadecimal number (e.g. `0x123`)
 * - A binary number (e.g. `0b101`)
 * - An octal number (e.g. `0o123`)
 * 
 * @param {*} value The value to be checked
 * @returns {boolean} True if the value is one of the above, false otherwise
 */
export function isNumber(value: unknown): boolean {
  if(!typeofTest('number')(value) && !typeofTest('string')(value)) return false;
  if(isDigit(value)) return true;

  const str = String(value);

  if(
    ['+', '-'].includes(str[0]) &&
    /\d/.test(str.slice(1))
  ) return true;

  const hex = /^0x[0-9a-f]+$/i;
  const bin = /^0b[01]+$/i;
  const oct = /^0o[0-7]+$/i;

  return (
    hex.test(str) ||
    bin.test(str) ||
    oct.test(str)
  );
}


/**
 * Resolves a value to a number based on various conditions parsed from some of the following:
 * - A number (e.g. `123`)
 * - A string containing a number (e.g. `'123'`)
 * - A string containing a number with a leading `+` or `-` sign (e.g. `'+123'`, `'-123'`)
 * - A hexadecimal number (e.g. `0x123`)
 * - A binary number (e.g. `0b101`)
 * - An octal number (e.g. `0o123`)
 *
 * @param value - The value to be resolved to a number.
 * @returns The resolved number.
 * @throws {TypeError} If the value cannot be resolved to a number.
 */
export function resolveNumber(value: unknown): number {
  if(!isNumber(value)) {
    throw new TypeError(`Cannot resolve number from ${value}`);
  }

  if(isDigit(value)) return value;

  if(!isString(value)) {
    throw new TypeError(`Cannot resolve number from ${value}`);
  }

  if(value[0] === '+' || value[0] === '-') return value[0] === '+' ? +value.slice(1) : -value.slice(1);

  if(value.startsWith('0x')) return parseInt(value, 16);
  if(value.startsWith('0b')) return parseInt(value, 2);
  if(value.startsWith('0o')) return parseInt(value, 8);

  return parseInt(value, 10);
}


/**
 * Returns a precise timestamp in milliseconds.
 * 
 * @returns {number} The current timestamp in milliseconds 
 */
export function now(): number {
  return (typeof performance !== 'undefined' &&
  typeof performance.now === 'function') ?
    performance.now() :
    Date.now();
}