'use client';

import { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
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
import { MoreVertical, Pencil, Trash2, Loader2 } from 'lucide-react';
import { type Expense, type Category } from '@/types';
import { deleteExpense } from '@/app/actions/expenses';
import Link from 'next/link';
import { formatDate } from '@/lib/utils';

interface ExpenseCardProps {
  expense: Expense & { category?: Category | null };
  currency?: string;
}

export function ExpenseCard({ expense, currency = 'USD' }: ExpenseCardProps) {
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const formatter = new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency,
  });

  const handleDelete = async () => {
    setIsDeleting(true);
    const result = await deleteExpense(expense.id);
    if (result?.error) {
      alert(result.error);
    }
    setIsDeleting(false);
    setShowDeleteDialog(false);
  };

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
              <p className="font-semibold text-gray-900 dark:text-white">
                -{formatter.format(expense.amount)}
              </p>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon" className="h-8 w-8">
                    <MoreVertical className="w-4 h-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <Link href={`/expenses/${expense.id}/edit`}>
                    <DropdownMenuItem>
                      <Pencil className="w-4 h-4 mr-2" />
                      Edit
                    </DropdownMenuItem>
                  </Link>
                  <DropdownMenuItem
                    className="text-red-600"
                    onClick={() => setShowDeleteDialog(true)}
                  >
                    <Trash2 className="w-4 h-4 mr-2" />
                    Delete
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
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
