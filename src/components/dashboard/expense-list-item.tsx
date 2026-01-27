'use client';

import { useState } from 'react';
import { X } from 'lucide-react';
import { formatDateShort, formatCurrency } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { settleExpenseSplit, dismissExpenseSplit } from '@/app/actions/expenses';
import type { Expense, CurrencyCode } from '@/types';

interface ExpenseListItemProps {
  expense: Expense;
  currency: CurrencyCode;
}

export function ExpenseListItem({ expense, currency }: ExpenseListItemProps) {
  const category = expense.category as { id?: string; name: string; color: string | null; icon: string | null } | null;
  const isOwed = category?.id === 'owed' && !expense.isSettled;
  const isSettled = category?.id === 'settled' && expense.isSettled;
  const [isSettling, setIsSettling] = useState(false);
  const [isDismissing, setIsDismissing] = useState(false);
  const { toast } = useToast();

  const handleSettle = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!expense.splitId) return;

    setIsSettling(true);
    const result = await settleExpenseSplit(expense.splitId);
    setIsSettling(false);

    if (result.error) {
      toast({
        title: 'Error',
        description: result.error,
        variant: 'destructive',
      });
    } else {
      toast({
        title: 'Settled!',
        description: `Payment to ${expense.owedTo || 'creditor'} marked as complete.`,
      });
    }
  };

  const handleDismiss = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!expense.splitId) return;

    setIsDismissing(true);
    const result = await dismissExpenseSplit(expense.splitId);
    setIsDismissing(false);

    if (result.error) {
      toast({
        title: 'Error',
        description: result.error,
        variant: 'destructive',
      });
    } else {
      toast({
        title: 'Dismissed',
        description: 'Expense removed from your list.',
      });
    }
  };

  return (
    <div className={`flex items-center justify-between py-3 px-2 hover:bg-gray-50 dark:hover:bg-gray-800/50 rounded-lg transition-colors ${isOwed ? 'border-l-2 border-l-amber-500' : ''}`}>
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

      <div className="flex items-center gap-2 ml-4 flex-shrink-0">
        {/* Amount */}
        <span className={`text-sm font-semibold whitespace-nowrap ${isOwed ? 'text-amber-600 dark:text-amber-400' : 'text-gray-900 dark:text-white'}`}>
          {isOwed ? '-' : ''}{formatCurrency(expense.amount, currency)}
        </span>

        {/* Mark Paid button for owed expenses */}
        {isOwed && expense.splitId && (
          <Button
            size="sm"
            variant="outline"
            onClick={handleSettle}
            disabled={isSettling}
            className="text-xs h-7 px-2"
          >
            {isSettling ? '...' : 'Paid'}
          </Button>
        )}

        {/* Dismiss button for settled expenses */}
        {isSettled && expense.splitId && (
          <Button
            size="sm"
            variant="ghost"
            onClick={handleDismiss}
            disabled={isDismissing}
            className="h-7 w-7 p-0 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
            title="Remove from list"
          >
            {isDismissing ? '...' : <X className="h-4 w-4" />}
          </Button>
        )}
      </div>
    </div>
  );
}
