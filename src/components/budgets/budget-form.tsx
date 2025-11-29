'use client';

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
import { type Category } from '@/types';

interface BudgetFormData {
  id: string;
  category_id: string | null;
  amount: number;
  period: 'weekly' | 'monthly' | 'yearly';
}

interface BudgetFormProps {
  categories: Category[];
  budget?: BudgetFormData;
  action: (formData: FormData) => Promise<{ error?: string; success?: boolean }>;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  currency?: string;
}

export function BudgetForm({ categories, budget, action, open, onOpenChange, currency = 'USD' }: BudgetFormProps) {
  const handleSubmit = async (formData: FormData) => {
    const result = await action(formData);
    if (result?.success) {
      onOpenChange(false);
    } else if (result?.error) {
      alert(result.error);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{budget ? 'Edit Budget' : 'New Budget'}</DialogTitle>
        </DialogHeader>
        <form action={handleSubmit} className="space-y-4">
          {/* Amount */}
          <CurrencyInput
            name="amount"
            label="Budget Amount"
            currency={currency}
            defaultValue={budget?.amount}
            required
          />

          {/* Category */}
          <CategorySelect
            categories={categories}
            defaultValue={budget?.category_id || 'all'}
            showAllOption
            label="Category"
          />

          {/* Period */}
          <div className="space-y-2">
            <Label htmlFor="period">Period</Label>
            <Select name="period" defaultValue={budget?.period || 'monthly'}>
              <SelectTrigger>
                <SelectValue placeholder="Select period" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="weekly">Weekly</SelectItem>
                <SelectItem value="monthly">Monthly</SelectItem>
                <SelectItem value="yearly">Yearly</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <FormSubmitButton
            className="w-full bg-emerald-500 hover:bg-emerald-600"
            loadingText={budget ? 'Updating...' : 'Creating...'}
          >
            {budget ? 'Update Budget' : 'Create Budget'}
          </FormSubmitButton>
        </form>
      </DialogContent>
    </Dialog>
  );
}
