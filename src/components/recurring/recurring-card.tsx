'use client';

import { useState, useMemo } from 'react';
import { useToast } from '@/hooks/use-toast';
import { Card, CardContent } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Calendar, RefreshCw, Users } from 'lucide-react';
import { CardActionMenu, DeleteConfirmationDialog } from '@/components/shared';
import { useDeleteAction } from '@/hooks/use-delete-action';
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
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [isToggling, setIsToggling] = useState(false);
  const { toast } = useToast();
  const { showDialog, setShowDialog, handleDelete } = useDeleteAction(
    deleteRecurringExpense,
    recurring.id
  );

  const formatter = useMemo(() => new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency,
  }), [currency]);

  const handleUpdate = async (formData: FormData) => {
    return updateRecurringExpense(recurring.id, formData);
  };

  const handleToggle = async () => {
    setIsToggling(true);
    const result = await toggleRecurringExpense(recurring.id, !recurring.is_active);
    if (result?.error) {
      toast({
        title: 'Error',
        description: result.error,
        variant: 'destructive',
      });
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
                  {recurring.is_shared && (
                    <Badge variant="outline" className="gap-1">
                      <Users className="w-3 h-3" />
                      Split {recurring.participants?.length ? `(${recurring.participants.length + 1})` : ''}
                    </Badge>
                  )}
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
              <CardActionMenu
                onEdit={() => setShowEditDialog(true)}
                onDelete={() => setShowDialog(true)}
              />
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
      <DeleteConfirmationDialog
        open={showDialog}
        onOpenChange={setShowDialog}
        onConfirm={handleDelete}
        title="Delete Recurring Expense"
        description="Are you sure you want to delete this recurring expense? This won't delete any expenses already created from it."
      />
    </>
  );
}
