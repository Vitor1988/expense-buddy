/**
 * Currency formatting utilities.
 * Use these functions for consistent currency display across the app.
 *
 * @module lib/currency
 * @see MODULES.md for full documentation
 */

import { CURRENCIES, type CurrencyCode } from '@/types';

/**
 * Get the currency symbol for a given currency code.
 * Uses Intl.NumberFormat for accurate localized symbols.
 *
 * @param currency - ISO 4217 currency code (e.g., 'USD', 'EUR')
 * @returns The currency symbol (e.g., '$', '€')
 *
 * @example
 * getCurrencySymbol('USD') // '$'
 * getCurrencySymbol('EUR') // '€'
 * getCurrencySymbol('GBP') // '£'
 */
export function getCurrencySymbol(currency: string): string {
  try {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency,
    }).formatToParts(0).find(p => p.type === 'currency')?.value || '$';
  } catch {
    return '$';
  }
}

/**
 * Get an Intl.NumberFormat instance for a currency.
 * Useful when formatting multiple values with the same currency.
 *
 * @param currency - ISO 4217 currency code
 * @returns Intl.NumberFormat instance configured for the currency
 *
 * @example
 * const formatter = getCurrencyFormatter('EUR');
 * formatter.format(100) // '€100.00'
 * formatter.format(50.5) // '€50.50'
 */
export function getCurrencyFormatter(currency: string): Intl.NumberFormat {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency,
  });
}

/**
 * Format a number as currency.
 *
 * @param amount - The numeric amount to format
 * @param currency - ISO 4217 currency code (default: 'USD')
 * @returns Formatted currency string
 *
 * @example
 * formatCurrency(1234.56) // '$1,234.56'
 * formatCurrency(1234.56, 'EUR') // '€1,234.56'
 * formatCurrency(1234.56, 'JPY') // '¥1,235'
 */
export function formatCurrency(amount: number, currency: string = 'USD'): string {
  return getCurrencyFormatter(currency).format(amount);
}

/**
 * Check if a string is a valid currency code from our supported list.
 *
 * @param code - String to check
 * @returns True if the code is a supported currency
 *
 * @example
 * isSupportedCurrency('USD') // true
 * isSupportedCurrency('XYZ') // false
 */
export function isSupportedCurrency(code: string): code is CurrencyCode {
  return CURRENCIES.some(c => c.code === code);
}

/**
 * Get currency info (code, symbol, name) for a currency code.
 *
 * @param code - ISO 4217 currency code
 * @returns Currency info object or undefined if not found
 *
 * @example
 * getCurrencyInfo('USD') // { code: 'USD', symbol: '$', name: 'US Dollar' }
 */
export function getCurrencyInfo(code: string) {
  return CURRENCIES.find(c => c.code === code);
}
