'use client';

import { useState, useMemo } from 'react';
import { ChevronDown, Calendar } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { ExpenseListItem } from './expense-list-item';
import { formatCurrency, cn } from '@/lib/utils';
import type { MonthlyExpenseData, CurrencyCode } from '@/types';

interface MonthlyExpenseCardProps {
  data: MonthlyExpenseData;
  currency: CurrencyCode;
  defaultExpanded?: boolean;
}

const INITIAL_EXPENSE_COUNT = 5;

export function MonthlyExpenseCard({ data, currency, defaultExpanded = false }: MonthlyExpenseCardProps) {
  const [isExpanded, setIsExpanded] = useState(defaultExpanded);
  const [showAllExpenses, setShowAllExpenses] = useState(false);

  const displayedExpenses = useMemo(() =>
    showAllExpenses
      ? data.expenses
      : data.expenses.slice(0, INITIAL_EXPENSE_COUNT),
    [showAllExpenses, data.expenses]
  );

  const remainingExpenses = data.expenses.length - INITIAL_EXPENSE_COUNT;
  const hasMoreExpenses = remainingExpenses > 0;

  // Determine progress bar color based on budget percentage
  const progressColor = data.budgetPercentage >= 100
    ? 'bg-red-500'
    : data.budgetPercentage >= 80
    ? 'bg-yellow-500'
    : 'bg-emerald-500';

  return (
    <Card className="overflow-hidden">
      {/* Header - Always visible, clickable to expand/collapse */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full p-4 flex items-start justify-between gap-4 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors text-left"
      >
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-10 h-10 rounded-xl bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center flex-shrink-0">
            <Calendar className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
          </div>
          <div className="min-w-0">
            <h3 className="font-semibold text-gray-900 dark:text-white">
              {data.monthLabel}
            </h3>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              {data.budgetAmount > 0 ? (
                <>
                  {formatCurrency(data.totalAmount, currency)} of {formatCurrency(data.budgetAmount, currency)}
                  <span className="mx-1">•</span>
                  <span className={cn(
                    data.budgetPercentage >= 100 ? 'text-red-500' :
                    data.budgetPercentage >= 80 ? 'text-yellow-500' :
                    'text-emerald-500'
                  )}>
                    {data.budgetPercentage}%
                  </span>
                </>
              ) : (
                formatCurrency(data.totalAmount, currency)
              )}
              <span className="mx-1">•</span>
              {data.expenseCount} expense{data.expenseCount !== 1 ? 's' : ''}
            </p>
          </div>
        </div>

        <ChevronDown
          className={cn(
            'w-5 h-5 text-gray-400 transition-transform duration-200 flex-shrink-0 mt-2',
            isExpanded && 'rotate-180'
          )}
        />
      </button>

      {/* Progress bar - Always visible if budget exists */}
      {data.budgetAmount > 0 && (
        <div className="px-4 pb-2">
          <Progress
            value={Math.min(data.budgetPercentage, 100)}
            className="h-2"
            indicatorClassName={progressColor}
          />
        </div>
      )}

      {/* Expandable content - uses CSS Grid for smooth height animation */}
      <div
        className={cn(
          'grid transition-[grid-template-rows] duration-300 ease-out',
          isExpanded ? 'grid-rows-[1fr]' : 'grid-rows-[0fr]'
        )}
      >
        <div className="overflow-hidden">
          <div className="border-t border-gray-200 dark:border-gray-800">
            {data.expenses.length === 0 ? (
              <div className="p-6 text-center text-gray-500 dark:text-gray-400">
                No expenses this month
              </div>
            ) : (
              <>
                {/* Expense list */}
                <div className="p-2">
                  {displayedExpenses.map((expense) => (
                    <ExpenseListItem
                      key={expense.id}
                      expense={expense}
                      currency={currency}
                    />
                  ))}
                </div>

                {/* Show more button */}
                {hasMoreExpenses && !showAllExpenses && (
                  <div className="px-4 pb-4">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="w-full text-emerald-600 dark:text-emerald-400 hover:text-emerald-700 dark:hover:text-emerald-300"
                      onClick={(e) => {
                        e.stopPropagation();
                        setShowAllExpenses(true);
                      }}
                    >
                      Show {remainingExpenses} more expense{remainingExpenses !== 1 ? 's' : ''}
                    </Button>
                  </div>
                )}

                {/* Show less button */}
                {showAllExpenses && hasMoreExpenses && (
                  <div className="px-4 pb-4">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="w-full text-gray-500 dark:text-gray-400"
                      onClick={(e) => {
                        e.stopPropagation();
                        setShowAllExpenses(false);
                      }}
                    >
                      Show less
                    </Button>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </div>
    </Card>
  );
}
