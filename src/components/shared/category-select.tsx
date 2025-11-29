'use client';

/**
 * Reusable category selector dropdown.
 * Displays categories with their icons for easy selection.
 *
 * @module components/shared/category-select
 * @see MODULES.md for full documentation
 *
 * @example
 * // Basic usage
 * <CategorySelect categories={categories} />
 *
 * @example
 * // With "All Categories" option (for budget forms)
 * <CategorySelect categories={categories} showAllOption />
 *
 * @example
 * // With custom name and default value
 * <CategorySelect
 *   categories={categories}
 *   name="category_id"
 *   defaultValue={expense?.category_id}
 * />
 */

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import type { Category } from '@/types';

export interface CategorySelectProps {
  /** Array of categories to display */
  categories: Category[];
  /** Input name attribute for form submission (default: 'category_id') */
  name?: string;
  /** Default selected category ID */
  defaultValue?: string | null;
  /** Whether to show "All Categories" option at the top */
  showAllOption?: boolean;
  /** Placeholder text when nothing is selected */
  placeholder?: string;
  /** Label text (if omitted, no label is shown) */
  label?: string;
  /** Whether the field is required */
  required?: boolean;
}

export function CategorySelect({
  categories,
  name = 'category_id',
  defaultValue,
  showAllOption = false,
  placeholder = 'Select a category',
  label,
  required = false,
}: CategorySelectProps) {
  return (
    <div className="space-y-2">
      {label && <Label htmlFor={name}>{label}</Label>}
      <Select name={name} defaultValue={defaultValue || undefined} required={required}>
        <SelectTrigger id={name}>
          <SelectValue placeholder={placeholder} />
        </SelectTrigger>
        <SelectContent>
          {showAllOption && (
            <SelectItem value="all">
              <span className="flex items-center gap-2">
                <span>📊</span>
                <span>All Categories (Total Budget)</span>
              </span>
            </SelectItem>
          )}
          {categories.map((category) => (
            <SelectItem key={category.id} value={category.id}>
              <span className="flex items-center gap-2">
                <span>{category.icon}</span>
                <span>{category.name}</span>
              </span>
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
