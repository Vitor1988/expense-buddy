'use client';

import { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { MoreVertical, Trash2, Receipt, Loader2 } from 'lucide-react';
import { deleteSharedExpense } from '@/app/actions/groups';
import { formatDate } from '@/lib/utils';
import type { SharedExpense, ExpenseSplit } from '@/types';

interface SharedExpenseCardProps {
  expense: SharedExpense & {
    payer: { id: string; full_name: string | null; avatar_url: string | null };
    splits: ExpenseSplit[];
  };
  currency: string;
  currentUserId: string;
  onDeleted: () => void;
}

export function SharedExpenseCard({
  expense,
  currency,
  currentUserId,
  onDeleted,
}: SharedExpenseCardProps) {
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const formatter = new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency,
  });

  const handleDelete = async () => {
    setIsDeleting(true);
    const result = await deleteSharedExpense(expense.id);
    if (result.error) {
      alert(result.error);
    } else {
      onDeleted();
    }
    setIsDeleting(false);
    setShowDeleteDialog(false);
  };

  const payerInitials = expense.payer?.full_name
    ?.split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase() || '?';

  const isPayer = expense.paid_by === currentUserId;
  const userSplit = expense.splits?.find((s) => s.user_id === currentUserId);
  const userOwes = userSplit && !isPayer ? userSplit.amount : 0;
  const userIsOwed = isPayer ? expense.amount - (userSplit?.amount || 0) : 0;

  return (
    <>
      <Card className="hover:shadow-md transition-shadow">
        <CardContent className="p-4">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
                <Receipt className="w-5 h-5 text-blue-600 dark:text-blue-400" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-medium text-gray-900 dark:text-white">
                  {expense.description}
                </p>
                <div className="flex items-center gap-2 mt-1">
                  <Avatar className="w-5 h-5">
                    <AvatarFallback className="text-xs bg-gray-200 dark:bg-gray-700">
                      {payerInitials}
                    </AvatarFallback>
                  </Avatar>
                  <span className="text-sm text-gray-500 dark:text-gray-400">
                    {isPayer ? 'You' : expense.payer?.full_name || 'Unknown'} paid{' '}
                    {formatter.format(expense.amount)}
                  </span>
                </div>
                <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">
                  {formatDate(expense.date)}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <div className="text-right">
                {userOwes > 0 && (
                  <p className="text-sm font-medium text-red-600 dark:text-red-400">
                    You owe {formatter.format(userOwes)}
                  </p>
                )}
                {userIsOwed > 0 && (
                  <p className="text-sm font-medium text-emerald-600 dark:text-emerald-400">
                    You get back {formatter.format(userIsOwed)}
                  </p>
                )}
                {userOwes === 0 && userIsOwed === 0 && (
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    Not involved
                  </p>
                )}
              </div>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon" className="h-8 w-8">
                    <MoreVertical className="w-4 h-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem
                    onClick={() => setShowDeleteDialog(true)}
                    className="text-red-600 dark:text-red-400"
                  >
                    <Trash2 className="w-4 h-4 mr-2" />
                    Delete
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>

          {/* Split details */}
          {expense.splits && expense.splits.length > 0 && (
            <div className="mt-3 pt-3 border-t border-gray-100 dark:border-gray-800">
              <p className="text-xs text-gray-500 dark:text-gray-400 mb-2">
                Split between {expense.splits.length} people ({expense.split_method})
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Expense</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete this expense? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowDeleteDialog(false)}
              disabled={isDeleting}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleDelete}
              disabled={isDeleting}
            >
              {isDeleting ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Deleting...
                </>
              ) : (
                'Delete'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
