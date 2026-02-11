'use client';

import { useState, useCallback } from 'react';
import { useToast } from '@/hooks/use-toast';
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
import { FormSubmitButton, CurrencyInput, CategorySelect } from '@/components/shared';
import { type Category, type RecurringExpense } from '@/types';
import { SplitToggle, type SplitData } from '@/components/expenses/split-toggle';

interface RecurringFormProps {
  categories: Category[];
  recurring?: RecurringExpense;
  action: (formData: FormData) => Promise<{ error?: string; success?: boolean }>;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  currency?: string;
}

export function RecurringForm({ categories, recurring, action, open, onOpenChange, currency = 'USD' }: RecurringFormProps) {
  const { toast } = useToast();
  const [amount, setAmount] = useState<number>(recurring?.amount || 0);
  const [splitData, setSplitData] = useState<SplitData | null>(null);

  const handleAmountChange = useCallback((value: number) => {
    setAmount(value);
  }, []);

  const handleSplitDataChange = useCallback((data: SplitData | null) => {
    setSplitData(data);
  }, []);

  const handleSubmit = async (formData: FormData) => {
    if (recurring) {
      formData.set('is_active', recurring.is_active ? 'true' : 'false');
    }

    // Add split data to FormData
    if (splitData?.enabled && splitData.participants.length > 0) {
      formData.set('is_shared', 'true');
      formData.set('participants', JSON.stringify(splitData.participants));
      formData.set('split_method', splitData.splitMethod);
      formData.set('split_values', JSON.stringify(splitData.splitValues));
    }

    try {
      const result = await action(formData);
      if (result?.success) {
        onOpenChange(false);
      } else if (result?.error) {
        toast({
          title: 'Error',
          description: result.error,
          variant: 'destructive',
        });
      }
    } catch {
      toast({
        title: 'Error',
        description: 'An unexpected error occurred',
        variant: 'destructive',
      });
    }
  };

  // Calculate default next date (tomorrow for new, current for edit)
  const defaultNextDate = recurring?.next_date ||
    new Date(Date.now() + 86400000).toISOString().split('T')[0];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{recurring ? 'Edit Recurring Expense' : 'New Recurring Expense'}</DialogTitle>
        </DialogHeader>
        <form action={handleSubmit} className="space-y-4">
          {/* Amount */}
          <CurrencyInput
            name="amount"
            label="Amount"
            currency={currency}
            defaultValue={recurring?.amount}
            required
            onChange={handleAmountChange}
          />

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
          <CategorySelect
            categories={categories}
            defaultValue={recurring?.category_id}
            label="Category"
          />

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

          {/* Split Toggle */}
          <SplitToggle
            amount={amount}
            currency={currency}
            onSplitDataChange={handleSplitDataChange}
            initialEnabled={recurring?.is_shared}
            initialParticipants={recurring?.participants ?? undefined}
            initialSplitMethod={recurring?.split_method}
            initialSplitValues={recurring?.split_values ?? undefined}
          />

          <FormSubmitButton
            className="w-full bg-emerald-500 hover:bg-emerald-600"
            loadingText={recurring ? 'Updating...' : 'Creating...'}
          >
            {recurring ? 'Update Recurring' : 'Create Recurring'}
          </FormSubmitButton>
        </form>
      </DialogContent>
    </Dialog>
  );
}
