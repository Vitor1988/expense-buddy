'use client';

import { useState, useTransition } from 'react';
import Link from 'next/link';
import { History, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { MonthlyExpenseCard } from './monthly-expense-card';
import { loadMoreMonths } from '@/app/actions/expenses';
import type { MonthlyExpenseData, CurrencyCode } from '@/types';

interface MonthlyExpenseSectionProps {
  initialData: MonthlyExpenseData[];
  currency: CurrencyCode;
}

export function MonthlyExpenseSection({ initialData, currency }: MonthlyExpenseSectionProps) {
  const [months, setMonths] = useState<MonthlyExpenseData[]>(initialData);
  const [isPending, startTransition] = useTransition();
  const [hasMore, setHasMore] = useState(true);

  const handleLoadMore = () => {
    startTransition(async () => {
      const { data, error } = await loadMoreMonths(months.length, 3);

      if (error) {
        console.error('Failed to load more months:', error);
        return;
      }

      if (data && data.length > 0) {
        setMonths((prev) => [...prev, ...data]);
      }

      // If we got fewer than requested, there are no more months
      if (!data || data.length < 3) {
        setHasMore(false);
      }
    });
  };

  return (
    <div className="space-y-4">
      {/* Section Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
          Expenses by Month
        </h2>
        <Link href="/expenses">
          <Button variant="ghost" size="sm" className="text-emerald-600 dark:text-emerald-400">
            All Expenses
          </Button>
        </Link>
      </div>

      {/* Month Cards */}
      {months.length === 0 ? (
        <div className="text-center py-12 text-gray-500 dark:text-gray-400">
          <p>No expenses yet</p>
          <p className="text-sm mt-1">Start tracking your spending by adding an expense</p>
        </div>
      ) : (
        <div className="space-y-3">
          {months.map((monthData, index) => (
            <MonthlyExpenseCard
              key={monthData.month}
              data={monthData}
              currency={currency}
              defaultExpanded={index === 0} // First month (current) is expanded by default
            />
          ))}
        </div>
      )}

      {/* Load More Button */}
      {months.length > 0 && hasMore && (
        <div className="pt-2">
          <Button
            variant="outline"
            className="w-full"
            onClick={handleLoadMore}
            disabled={isPending}
          >
            {isPending ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Loading...
              </>
            ) : (
              <>
                <History className="w-4 h-4 mr-2" />
                Load older months
              </>
            )}
          </Button>
        </div>
      )}
    </div>
  );
}
