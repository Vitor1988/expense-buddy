'use client';

import { useMemo } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { CardActionMenu, DeleteConfirmationDialog } from '@/components/shared';
import { useDeleteAction } from '@/hooks/use-delete-action';
import { type Expense, type Category } from '@/types';
import { deleteExpense } from '@/app/actions/expenses';
import Link from 'next/link';
import { formatDate } from '@/lib/utils';

interface ExpenseCardProps {
  expense: Expense & { category?: Category | null };
  currency?: string;
}

export function ExpenseCard({ expense, currency = 'USD' }: ExpenseCardProps) {
  const { showDialog, setShowDialog, handleDelete } = useDeleteAction(
    deleteExpense,
    expense.id
  );

  const formatter = useMemo(() => new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency,
  }), [currency]);

  const category = expense.category;

  return (
    <>
      <Card className="hover:shadow-md transition-shadow">
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div
                className="w-10 h-10 rounded-full flex items-center justify-center text-lg"
                style={{
                  backgroundColor: category?.color ? category.color + '20' : '#6b728020',
                }}
              >
                {category?.icon || '📦'}
              </div>
              <div>
                <p className="font-medium text-gray-900 dark:text-white">
                  {expense.description || 'Expense'}
                </p>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  {category?.name || 'Uncategorized'} • {formatDate(expense.date)}
                </p>
                {expense.tags && expense.tags.length > 0 && (
                  <div className="flex gap-1 mt-1">
                    {expense.tags.map((tag, i) => (
                      <span
                        key={i}
                        className="text-xs bg-gray-100 dark:bg-gray-800 px-2 py-0.5 rounded-full"
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            </div>
            <div className="flex items-center gap-2">
              <p className="font-semibold text-gray-900 dark:text-white whitespace-nowrap">
                {formatter.format(expense.amount)}
              </p>
              <CardActionMenu onDelete={() => setShowDialog(true)}>
                <Link
                  href={`/expenses/${expense.id}/edit`}
                  className="relative flex cursor-pointer select-none items-center gap-2 rounded-sm px-2 py-1.5 text-sm outline-none transition-colors hover:bg-accent focus:bg-accent"
                >
                  Edit
                </Link>
              </CardActionMenu>
            </div>
          </div>
        </CardContent>
      </Card>

      <DeleteConfirmationDialog
        open={showDialog}
        onOpenChange={setShowDialog}
        onConfirm={handleDelete}
        title="Delete Expense"
        description="Are you sure you want to delete this expense? This action cannot be undone."
      />
    </>
  );
}
