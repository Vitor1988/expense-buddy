'use client';

import { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
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
import { MoreVertical, Pencil, Trash2, Loader2, Calendar, RefreshCw } from 'lucide-react';
import { type Category, type RecurringExpense } from '@/types';
import { deleteRecurringExpense, updateRecurringExpense, toggleRecurringExpense } from '@/app/actions/recurring';
import { RecurringForm } from './recurring-form';
import { formatDate } from '@/lib/utils';

interface RecurringCardProps {
  recurring: RecurringExpense & { category?: Category | null };
  categories: Category[];
  currency?: string;
  onToggle?: () => void;
}

export function RecurringCard({ recurring, categories, currency = 'USD', onToggle }: RecurringCardProps) {
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isToggling, setIsToggling] = useState(false);

  const formatter = new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency,
  });

  const handleDelete = async () => {
    setIsDeleting(true);
    const result = await deleteRecurringExpense(recurring.id);
    if (result?.error) {
      alert(result.error);
    }
    setIsDeleting(false);
    setShowDeleteDialog(false);
  };

  const handleUpdate = async (formData: FormData) => {
    return updateRecurringExpense(recurring.id, formData);
  };

  const handleToggle = async () => {
    setIsToggling(true);
    const result = await toggleRecurringExpense(recurring.id, !recurring.is_active);
    if (result?.error) {
      alert(result.error);
    }
    onToggle?.();
    setIsToggling(false);
  };

  const frequencyLabel = {
    daily: 'Daily',
    weekly: 'Weekly',
    monthly: 'Monthly',
    yearly: 'Yearly',
  }[recurring.frequency];

  const category = recurring.category;

  return (
    <>
      <Card className={`hover:shadow-md transition-shadow ${!recurring.is_active ? 'opacity-60' : ''}`}>
        <CardContent className="p-4">
          <div className="flex items-start justify-between">
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
                <div className="flex items-center gap-2">
                  <p className="font-medium text-gray-900 dark:text-white">
                    {recurring.description || 'Recurring Expense'}
                  </p>
                  <Badge variant={recurring.is_active ? 'default' : 'secondary'}>
                    {recurring.is_active ? 'Active' : 'Paused'}
                  </Badge>
                </div>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  {category?.name || 'Uncategorized'}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Switch
                checked={recurring.is_active}
                onCheckedChange={handleToggle}
                disabled={isToggling}
              />
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon" className="h-8 w-8">
                    <MoreVertical className="w-4 h-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={() => setShowEditDialog(true)}>
                    <Pencil className="w-4 h-4 mr-2" />
                    Edit
                  </DropdownMenuItem>
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

          <div className="mt-4 flex items-center justify-between text-sm">
            <div className="flex items-center gap-4 text-gray-500 dark:text-gray-400">
              <span className="flex items-center gap-1">
                <RefreshCw className="w-4 h-4" />
                {frequencyLabel}
              </span>
              <span className="flex items-center gap-1">
                <Calendar className="w-4 h-4" />
                Next: {formatDate(recurring.next_date)}
              </span>
            </div>
            <p className="font-semibold text-gray-900 dark:text-white">
              {formatter.format(recurring.amount)}
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Edit Dialog */}
      <RecurringForm
        categories={categories}
        recurring={recurring}
        action={handleUpdate}
        open={showEditDialog}
        onOpenChange={setShowEditDialog}
        currency={currency}
      />

      {/* Delete Dialog */}
      <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Recurring Expense</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete this recurring expense? This won&apos;t delete any expenses already created from it.
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
