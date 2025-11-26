'use client';

import { useState } from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Receipt } from 'lucide-react';
import { FormSubmitButton } from '@/components/shared';
import { type Category, type Expense } from '@/types';
import { ReceiptUpload } from './receipt-upload';

interface ExpenseFormProps {
  categories: Category[];
  expense?: Expense;
  action: (formData: FormData) => Promise<{ error?: string }>;
  currency?: string;
}

export function ExpenseForm({ categories, expense, action, currency = 'USD' }: ExpenseFormProps) {
  const [receiptUrl, setReceiptUrl] = useState<string | null>(expense?.receipt_url || null);

  const currencySymbol = new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency,
  }).formatToParts(0).find(p => p.type === 'currency')?.value || '$';

  const handleSubmit = async (formData: FormData) => {
    // Add receipt URL to form data
    if (receiptUrl) {
      formData.set('receipt_url', receiptUrl);
    } else {
      formData.delete('receipt_url');
    }

    const result = await action(formData);
    if (result?.error) {
      alert(result.error);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>{expense ? 'Edit Expense' : 'Add New Expense'}</CardTitle>
      </CardHeader>
      <CardContent>
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
                defaultValue={expense?.amount}
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
              placeholder="What did you spend on?"
              defaultValue={expense?.description || ''}
            />
          </div>

          {/* Category */}
          <div className="space-y-2">
            <Label htmlFor="category_id">Category</Label>
            <Select name="category_id" defaultValue={expense?.category_id || undefined}>
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

          {/* Date */}
          <div className="space-y-2">
            <Label htmlFor="date">Date</Label>
            <Input
              id="date"
              name="date"
              type="date"
              defaultValue={
                expense?.date ||
                new Date().toISOString().split('T')[0]
              }
              required
            />
          </div>

          {/* Notes */}
          <div className="space-y-2">
            <Label htmlFor="notes">Notes (optional)</Label>
            <Textarea
              id="notes"
              name="notes"
              placeholder="Any additional notes..."
              defaultValue={expense?.notes || ''}
              rows={3}
            />
          </div>

          {/* Tags */}
          <div className="space-y-2">
            <Label htmlFor="tags">Tags (optional, comma-separated)</Label>
            <Input
              id="tags"
              name="tags"
              placeholder="e.g. work, lunch, client"
              defaultValue={expense?.tags?.join(', ') || ''}
            />
          </div>

          {/* Receipt Upload */}
          <div className="space-y-2">
            <Label>Receipt (optional)</Label>
            <ReceiptUpload
              currentUrl={expense?.receipt_url}
              onUpload={setReceiptUrl}
              expenseId={expense?.id}
            />
          </div>

          <FormSubmitButton
            className="w-full bg-emerald-500 hover:bg-emerald-600"
            loadingText={expense ? 'Updating...' : 'Adding...'}
            icon={<Receipt className="w-4 h-4 mr-2" />}
          >
            {expense ? 'Update Expense' : 'Add Expense'}
          </FormSubmitButton>
        </form>
      </CardContent>
    </Card>
  );
}
