/**
 * Type guards for improved type safety
 * Provides runtime type checking utilities
 */

/**
 * Type guard for string values
 */
export const isString = (value: unknown): value is string => 
  typeof value === 'string';

/**
 * Type guard for number values
 */
export const isNumber = (value: unknown): value is number => 
  typeof value === 'number' && !isNaN(value);

/**
 * Type guard for boolean values
 */
export const isBoolean = (value: unknown): value is boolean => 
  typeof value === 'boolean';

/**
 * Type guard for object values (excluding null)
 */
export const isObject = (value: unknown): value is Record<string, unknown> => 
  typeof value === 'object' && value !== null && !Array.isArray(value);

/**
 * Type guard for array values
 */
export const isArray = (value: unknown): value is unknown[] => 
  Array.isArray(value);

/**
 * Type guard for function values
 */
export const isFunction = (value: unknown): value is (...args: unknown[]) => unknown => 
  typeof value === 'function';

/**
 * Type guard for null values
 */
export const isNull = (value: unknown): value is null => 
  value === null;

/**
 * Type guard for undefined values
 */
export const isUndefined = (value: unknown): value is undefined => 
  value === undefined;

/**
 * Type guard for non-null values
 */
export const isNotNull = <T>(value: T | null): value is T => 
  value !== null;

/**
 * Type guard for non-undefined values
 */
export const isNotUndefined = <T>(value: T | undefined): value is T => 
  value !== undefined;

/**
 * Type guard for non-empty string values
 */
export const isNonEmptyString = (value: unknown): value is string => 
  isString(value) && value.trim().length > 0;

/**
 * Type guard for valid email format
 */
export const isValidEmail = (value: unknown): value is string => {
  if (!isString(value)) return false;
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(value);
};

/**
 * Type guard for valid URL format
 */
export const isValidUrl = (value: unknown): value is string => {
  if (!isString(value)) return false;
  try {
    new URL(value);
    return true;
  } catch {
    return false;
  }
};

/**
 * Type guard for positive numbers
 */
export const isPositiveNumber = (value: unknown): value is number => 
  isNumber(value) && value > 0;

/**
 * Type guard for non-negative numbers
 */
export const isNonNegativeNumber = (value: unknown): value is number => 
  isNumber(value) && value >= 0;

/**
 * Type guard for integer numbers
 */
export const isInteger = (value: unknown): value is number => 
  isNumber(value) && Number.isInteger(value);

/**
 * Type guard for date values
 */
export const isDate = (value: unknown): value is Date => 
  value instanceof Date && !isNaN(value.getTime());

/**
 * Type guard for valid date string (YYYY-MM-DD)
 */
export const isValidDateString = (value: unknown): value is string => {
  if (!isString(value)) return false;
  const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
  if (!dateRegex.test(value)) return false;
  const date = new Date(value);
  return !isNaN(date.getTime());
};

/**
 * Type guard for FormData values
 */
export const isFormData = (value: unknown): value is FormData => 
  value instanceof FormData;

/**
 * Type guard for File values
 */
export const isFile = (value: unknown): value is File => 
  value instanceof File;

/**
 * Type guard for Blob values
 */
export const isBlob = (value: unknown): value is Blob => 
  value instanceof Blob;

/**
 * Type guard for Event values
 */
export const isEvent = (value: unknown): value is Event => 
  value instanceof Event;

/**
 * Type guard for React elements
 */
export const isReactElement = (value: unknown): value is React.ReactElement => {
  return isObject(value) && 
         'type' in value && 
         'props' in value && 
         'key' in value;
};

/**
 * Type guard for React nodes
 */
export const isReactNode = (value: unknown): value is React.ReactNode => {
  return value !== null && 
         value !== undefined && 
         (isString(value) || 
          isNumber(value) || 
          isBoolean(value) || 
          isReactElement(value) || 
          isArray(value));
}; 