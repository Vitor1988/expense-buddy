'use client';

/**
 * Reusable currency input field with symbol prefix.
 * Use this component whenever you need an amount input in forms.
 *
 * @module components/shared/currency-input
 * @see MODULES.md for full documentation
 *
 * @example
 * // Basic usage
 * <CurrencyInput name="amount" label="Amount" required />
 *
 * @example
 * // With different currency
 * <CurrencyInput name="amount" currency="EUR" label="Price" defaultValue={99.99} />
 *
 * @example
 * // Without label (for inline use)
 * <CurrencyInput name="amount" currency="USD" />
 */

import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { getCurrencySymbol } from '@/lib/currency';

export interface CurrencyInputProps {
  /** Input name attribute for form submission */
  name: string;
  /** ISO 4217 currency code (default: 'USD') */
  currency?: string;
  /** Default value for the input */
  defaultValue?: number;
  /** Label text (if omitted, no label is shown) */
  label?: string;
  /** Whether the field is required */
  required?: boolean;
  /** Placeholder text (default: '0.00') */
  placeholder?: string;
  /** Additional CSS classes for the container */
  className?: string;
  /** Whether the input is disabled */
  disabled?: boolean;
}

export function CurrencyInput({
  name,
  currency = 'USD',
  defaultValue,
  label,
  required = false,
  placeholder = '0.00',
  className = '',
  disabled = false,
}: CurrencyInputProps) {
  const symbol = getCurrencySymbol(currency);

  return (
    <div className={`space-y-2 ${className}`}>
      {label && (
        <Label htmlFor={name}>
          {label} ({symbol})
        </Label>
      )}
      <div className="relative">
        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">
          {symbol}
        </span>
        <Input
          id={name}
          name={name}
          type="number"
          step="0.01"
          min="0.01"
          placeholder={placeholder}
          defaultValue={defaultValue}
          className="pl-8"
          required={required}
          disabled={disabled}
        />
      </div>
    </div>
  );
}
