'use client';

import { useMemo } from 'react';

/**
 * Hook to memoize currency formatter creation.
 * Prevents creating a new Intl.NumberFormat instance on every render.
 *
 * @param currency - The currency code (e.g., 'USD', 'EUR', 'GBP')
 * @returns Memoized Intl.NumberFormat instance
 *
 * @example
 * const formatter = useFormatter('USD');
 * return <span>{formatter.format(100)}</span>; // "$100.00"
 */
export function useFormatter(currency: string) {
  return useMemo(
    () =>
      new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency,
      }),
    [currency]
  );
}
