'use client';

import { useFormStatus } from 'react-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Loader2 } from 'lucide-react';
import { type Category, type RecurringExpense } from '@/types';

interface RecurringFormProps {
  categories: Category[];
  recurring?: RecurringExpense;
  action: (formData: FormData) => Promise<{ error?: string; success?: boolean }>;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  currency?: string;
}

function SubmitButton({ isEdit }: { isEdit: boolean }) {
  const { pending } = useFormStatus();

  return (
    <Button
      type="submit"
      className="w-full bg-emerald-500 hover:bg-emerald-600"
      disabled={pending}
    >
      {pending ? (
        <>
          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
          {isEdit ? 'Updating...' : 'Creating...'}
        </>
      ) : (
        <>{isEdit ? 'Update Recurring' : 'Create Recurring'}</>
      )}
    </Button>
  );
}

export function RecurringForm({ categories, recurring, action, open, onOpenChange, currency = 'USD' }: RecurringFormProps) {
  const currencySymbol = new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency,
  }).formatToParts(0).find(p => p.type === 'currency')?.value || '$';

  const handleSubmit = async (formData: FormData) => {
    if (recurring) {
      formData.set('is_active', recurring.is_active ? 'true' : 'false');
    }
    const result = await action(formData);
    if (result?.success) {
      onOpenChange(false);
    } else if (result?.error) {
      alert(result.error);
    }
  };

  // Calculate default next date (tomorrow for new, current for edit)
  const defaultNextDate = recurring?.next_date ||
    new Date(Date.now() + 86400000).toISOString().split('T')[0];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{recurring ? 'Edit Recurring Expense' : 'New Recurring Expense'}</DialogTitle>
        </DialogHeader>
        <form action={handleSubmit} className="space-y-4">
          {/* Amount */}
          <div className="space-y-2">
            <Label htmlFor="amount">Amount ({currencySymbol})</Label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">
                {currencySymbol}
              </span>
              <Input
                id="amount"
                name="amount"
                type="number"
                step="0.01"
                min="0.01"
                placeholder="0.00"
                defaultValue={recurring?.amount}
                className="pl-8"
                required
              />
            </div>
          </div>

          {/* Description */}
          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Input
              id="description"
              name="description"
              placeholder="e.g. Netflix subscription"
              defaultValue={recurring?.description || ''}
              required
            />
          </div>

          {/* Category */}
          <div className="space-y-2">
            <Label htmlFor="category_id">Category</Label>
            <Select name="category_id" defaultValue={recurring?.category_id || undefined}>
              <SelectTrigger>
                <SelectValue placeholder="Select a category" />
              </SelectTrigger>
              <SelectContent>
                {categories.map((category) => (
                  <SelectItem key={category.id} value={category.id}>
                    <span className="flex items-center gap-2">
                      <span>{category.icon}</span>
                      <span>{category.name}</span>
                    </span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Frequency */}
          <div className="space-y-2">
            <Label htmlFor="frequency">Frequency</Label>
            <Select name="frequency" defaultValue={recurring?.frequency || 'monthly'}>
              <SelectTrigger>
                <SelectValue placeholder="Select frequency" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="daily">Daily</SelectItem>
                <SelectItem value="weekly">Weekly</SelectItem>
                <SelectItem value="monthly">Monthly</SelectItem>
                <SelectItem value="yearly">Yearly</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Next Date */}
          <div className="space-y-2">
            <Label htmlFor="next_date">Next Date</Label>
            <Input
              id="next_date"
              name="next_date"
              type="date"
              defaultValue={defaultNextDate}
              required
            />
          </div>

          <SubmitButton isEdit={!!recurring} />
        </form>
      </DialogContent>
    </Dialog>
  );
}
