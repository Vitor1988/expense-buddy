'use client';

import { useMemo, useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { CardActionMenu, DeleteConfirmationDialog } from '@/components/shared';
import { useDeleteAction } from '@/hooks/use-delete-action';
import { useToast } from '@/hooks/use-toast';
import { type UnifiedExpense } from '@/types';
import { deleteExpense, deleteInlineSharedExpense, settleExpenseSplit } from '@/app/actions/expenses';
import Link from 'next/link';
import { formatDate } from '@/lib/utils';
import { Users, AlertCircle, Check } from 'lucide-react';

interface UnifiedExpenseCardProps {
  expense: UnifiedExpense;
  currency?: string;
}

export function UnifiedExpenseCard({ expense, currency = 'USD' }: UnifiedExpenseCardProps) {
  const isShared = expense.type === 'shared';
  const isDebtor = expense.userRole === 'debtor';
  const isPayer = expense.userRole === 'payer';
  const [isSettling, setIsSettling] = useState(false);
  const { toast } = useToast();

  // Use appropriate delete action based on type
  // Only payers can delete shared expenses
  const canDelete = !isShared || isPayer;
  const deleteAction = isShared ? deleteInlineSharedExpense : deleteExpense;

  const { showDialog, setShowDialog, handleDelete } = useDeleteAction(
    deleteAction,
    expense.id
  );

  const formatter = useMemo(() => new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency,
  }), [currency]);

  const category = expense.category;

  // For payer: show participant names
  const participantNames = isPayer
    ? expense.participants?.filter(p => !p.settled).map(p => p.name).join(', ')
    : null;

  // Handle settlement
  const handleSettle = async () => {
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
        description: 'Payment marked as complete.',
      });
    }
  };

  return (
    <>
      <Card className={`hover:shadow-md transition-shadow ${isDebtor && !expense.isSettled ? 'border-l-4 border-l-amber-500' : ''}`}>
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div
                className="w-10 h-10 rounded-full flex items-center justify-center text-lg relative"
                style={{
                  backgroundColor: category?.color ? category.color + '20' : '#6b728020',
                }}
              >
                {category?.icon || '📦'}
                {isShared && (
                  <div className={`absolute -bottom-1 -right-1 w-5 h-5 rounded-full flex items-center justify-center ${
                    isDebtor ? 'bg-amber-500' : 'bg-emerald-500'
                  }`}>
                    <Users className="w-3 h-3 text-white" />
                  </div>
                )}
              </div>
              <div>
                <p className="font-medium text-gray-900 dark:text-white">
                  {expense.description || 'Expense'}
                </p>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  {category?.name || (isShared ? expense.shared_expense?.category : 'Uncategorized')} • {formatDate(expense.date)}
                </p>
                {/* Payer view: show who owes them */}
                {isPayer && participantNames && (
                  <p className="text-xs text-emerald-600 dark:text-emerald-400 mt-0.5">
                    Split with {participantNames}
                  </p>
                )}
                {/* Debtor view: show who they owe */}
                {isDebtor && !expense.isSettled && (
                  <p className="text-xs text-amber-600 dark:text-amber-400 mt-0.5 flex items-center gap-1">
                    <AlertCircle className="w-3 h-3" />
                    You owe {expense.owedTo}
                  </p>
                )}
                {isDebtor && expense.isSettled && (
                  <p className="text-xs text-emerald-600 dark:text-emerald-400 mt-0.5 flex items-center gap-1">
                    <Check className="w-3 h-3" />
                    Settled with {expense.owedTo}
                  </p>
                )}
                {!isShared && expense.expense?.tags && expense.expense.tags.length > 0 && (
                  <div className="flex gap-1 mt-1">
                    {expense.expense.tags.map((tag, i) => (
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
              <div className="text-right">
                <p className={`font-semibold whitespace-nowrap ${
                  isDebtor && !expense.isSettled
                    ? 'text-amber-600 dark:text-amber-400'
                    : 'text-gray-900 dark:text-white'
                }`}>
                  {isDebtor && !expense.isSettled ? '-' : ''}{formatter.format(expense.amount)}
                </p>
                {isShared && expense.original_amount && expense.original_amount !== expense.amount && (
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    of {formatter.format(expense.original_amount)}
                  </p>
                )}
              </div>
              {/* Show Mark as Paid button for debtors who haven't settled */}
              {isDebtor && !expense.isSettled && (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={handleSettle}
                  disabled={isSettling}
                  className="text-xs"
                >
                  {isSettling ? 'Settling...' : 'Mark Paid'}
                </Button>
              )}
              {canDelete && (
                <CardActionMenu onDelete={() => setShowDialog(true)}>
                  {!isShared && (
                    <Link
                      href={`/expenses/${expense.id}/edit`}
                      className="relative flex cursor-pointer select-none items-center gap-2 rounded-sm px-2 py-1.5 text-sm outline-none transition-colors hover:bg-accent focus:bg-accent"
                    >
                      Edit
                    </Link>
                  )}
                </CardActionMenu>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {canDelete && (
        <DeleteConfirmationDialog
          open={showDialog}
          onOpenChange={setShowDialog}
          onConfirm={handleDelete}
          title={isShared ? "Delete Shared Expense" : "Delete Expense"}
          description={isShared
            ? "Are you sure you want to delete this shared expense? This will also remove all splits. This action cannot be undone."
            : "Are you sure you want to delete this expense? This action cannot be undone."
          }
        />
      )}
    </>
  );
}
