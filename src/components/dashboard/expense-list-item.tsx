'use client';

import { formatDateShort, formatCurrency } from '@/lib/utils';
import type { Expense, CurrencyCode } from '@/types';

interface ExpenseListItemProps {
  expense: Expense;
  currency: CurrencyCode;
}

export function ExpenseListItem({ expense, currency }: ExpenseListItemProps) {
  const category = expense.category as { name: string; color: string | null; icon: string | null } | null;

  return (
    <div className="flex items-center justify-between py-3 px-2 hover:bg-gray-50 dark:hover:bg-gray-800/50 rounded-lg transition-colors">
      <div className="flex items-center gap-3 min-w-0 flex-1">
        {/* Category Icon */}
        <div
          className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 text-sm"
          style={{
            backgroundColor: category?.color ? `${category.color}20` : '#6b728020',
            color: category?.color || '#6b7280',
          }}
        >
          {category?.icon || '$'}
        </div>

        {/* Date and Description */}
        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
            {expense.description || 'Expense'}
          </p>
          <p className="text-xs text-gray-500 dark:text-gray-400">
            {formatDateShort(expense.date)} {category?.name && `• ${category.name}`}
          </p>
        </div>
      </div>

      {/* Amount */}
      <span className="text-sm font-semibold text-gray-900 dark:text-white ml-4 flex-shrink-0">
        -{formatCurrency(expense.amount, currency)}
      </span>
    </div>
  );
}
