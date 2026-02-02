'use client';

import { useState } from 'react';
import { formatDateShort, formatCurrency } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { SettleExpenseDialog } from '@/components/expenses/settle-expense-dialog';
import { Check } from 'lucide-react';
import type { Expense, CurrencyCode } from '@/types';

interface ExpenseListItemProps {
  expense: Expense;
  currency: CurrencyCode;
}

export function ExpenseListItem({ expense, currency }: ExpenseListItemProps) {
  const category = expense.category as { id?: string; name: string; color: string | null; icon: string | null } | null;
  const isOwed = category?.id === 'owed' && !expense.isSettled;
  const isSettledDebtor = expense.isSettled && expense.owedTo && !expense.isSharedPayer;
  const [showSettleDialog, setShowSettleDialog] = useState(false);

  return (
    <>
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
            {/* Payer view: show pending and paid participants */}
            {expense.isSharedPayer && expense.pendingParticipants && expense.pendingParticipants.length > 0 && (
              <p className="text-xs text-amber-600 dark:text-amber-400">
                Pending: {expense.pendingParticipants.join(', ')}
              </p>
            )}
            {expense.isSharedPayer && expense.settledParticipants && expense.settledParticipants.length > 0 && (
              <p className="text-xs text-emerald-600 dark:text-emerald-400">
                Paid: {expense.settledParticipants.join(', ')}
              </p>
            )}
            {/* Debtor view: show settled status */}
            {isSettledDebtor && (
              <p className="text-xs text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                <Check className="w-3 h-3" />
                Settled with {expense.owedTo}
              </p>
            )}
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
              onClick={(e) => {
                e.stopPropagation();
                setShowSettleDialog(true);
              }}
              className="text-xs h-7 px-2"
            >
              Paid
            </Button>
          )}
        </div>
      </div>

      {/* Settle dialog */}
      {isOwed && expense.splitId && (
        <SettleExpenseDialog
          open={showSettleDialog}
          onOpenChange={setShowSettleDialog}
          splitId={expense.splitId}
          expenseDescription={expense.description || ''}
          amount={expense.amount}
          owedTo={expense.owedTo || 'Unknown'}
          currency={currency}
        />
      )}
    </>
  );
}
