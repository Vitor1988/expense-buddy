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
        <>{isEdit ? 'Update Budget' : 'Create Budget'}</>
      )}
    </Button>
  );
}

export function BudgetForm({ categories, budget, action, open, onOpenChange, currency = 'USD' }: BudgetFormProps) {
  const currencySymbol = new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency,
  }).formatToParts(0).find(p => p.type === 'currency')?.value || '$';

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
          <div className="space-y-2">
            <Label htmlFor="amount">Budget Amount ({currencySymbol})</Label>
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
                defaultValue={budget?.amount}
                className="pl-8"
                required
              />
            </div>
          </div>

          {/* Category */}
          <div className="space-y-2">
            <Label htmlFor="category_id">Category</Label>
            <Select name="category_id" defaultValue={budget?.category_id || 'all'}>
              <SelectTrigger>
                <SelectValue placeholder="Select a category" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">
                  <span className="flex items-center gap-2">
                    <span>📊</span>
                    <span>All Categories (Total Budget)</span>
                  </span>
                </SelectItem>
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

          <SubmitButton isEdit={!!budget} />
        </form>
      </DialogContent>
    </Dialog>
  );
}
