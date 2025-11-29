/**
 * Validation utilities for server actions.
 * Use these functions to validate form data consistently across the app.
 *
 * @module lib/validations
 * @see MODULES.md for full documentation
 */

/**
 * Validate and parse an amount value from form data.
 * Returns null if invalid, otherwise returns the parsed number.
 *
 * @param value - The value to validate (typically from FormData)
 * @returns The parsed amount or null if invalid
 *
 * @example
 * validateAmount('100.50') // 100.5
 * validateAmount('0') // null (zero not allowed)
 * validateAmount('abc') // null (not a number)
 * validateAmount('-10') // null (negative not allowed)
 */
export function validateAmount(value: unknown): number | null {
  const amount = parseFloat(value as string);
  if (!amount || isNaN(amount) || amount <= 0) {
    return null;
  }
  return amount;
}

/**
 * Validate that a required string field is present and non-empty.
 * Returns an error message if invalid, null if valid.
 *
 * @param value - The value to validate
 * @param fieldName - Name of the field for the error message
 * @returns Error message or null if valid
 *
 * @example
 * validateRequired('John', 'Name') // null (valid)
 * validateRequired('', 'Name') // 'Name is required'
 * validateRequired('  ', 'Name') // 'Name is required'
 */
export function validateRequired(value: unknown, fieldName: string): string | null {
  const str = (value as string)?.trim();
  if (!str) {
    return `${fieldName} is required`;
  }
  return null;
}

/**
 * Validate and parse a date string.
 * Returns null if invalid, otherwise returns the date string.
 *
 * @param value - The value to validate
 * @returns The valid date string or null if invalid
 *
 * @example
 * validateDateString('2024-01-15') // '2024-01-15'
 * validateDateString('invalid') // null
 * validateDateString('') // null
 */
export function validateDateString(value: unknown): string | null {
  const date = value as string;
  if (!date || isNaN(Date.parse(date))) {
    return null;
  }
  return date;
}

/**
 * Validate an email address format.
 * Returns true if the email format is valid.
 *
 * @param email - The email string to validate
 * @returns True if valid email format
 *
 * @example
 * validateEmail('user@example.com') // true
 * validateEmail('invalid') // false
 * validateEmail('') // false
 */
export function validateEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

/**
 * Validate that a value is one of the allowed options.
 * Returns true if the value is in the allowed list.
 *
 * @param value - The value to check
 * @param allowed - Array of allowed values
 * @returns True if value is allowed
 *
 * @example
 * validateEnum('monthly', ['daily', 'weekly', 'monthly', 'yearly']) // true
 * validateEnum('hourly', ['daily', 'weekly', 'monthly', 'yearly']) // false
 */
export function validateEnum<T>(value: unknown, allowed: readonly T[]): value is T {
  return allowed.includes(value as T);
}

/**
 * Parse tags from a comma-separated string.
 * Returns an array of trimmed, non-empty tags.
 *
 * @param value - Comma-separated tags string
 * @returns Array of parsed tags
 *
 * @example
 * parseTags('work, lunch, client') // ['work', 'lunch', 'client']
 * parseTags('  food ,  ') // ['food']
 * parseTags('') // []
 */
export function parseTags(value: unknown): string[] {
  const str = value as string;
  if (!str) return [];
  return str
    .split(',')
    .map(tag => tag.trim())
    .filter(tag => tag.length > 0);
}
