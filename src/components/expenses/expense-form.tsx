'use client';

import { useState, useCallback } from 'react';
import { useToast } from '@/hooks/use-toast';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Receipt } from 'lucide-react';
import { FormSubmitButton, CurrencyInput, CategorySelect } from '@/components/shared';
import { type Category, type Expense } from '@/types';
import { ReceiptUpload } from './receipt-upload';
import { SplitToggle, type SplitData } from './split-toggle';
import { createInlineSharedExpense } from '@/app/actions/expenses';

interface ExpenseFormProps {
  categories: Category[];
  expense?: Expense;
  action: (formData: FormData) => Promise<{ error?: string }>;
  currency?: string;
}

export function ExpenseForm({ categories, expense, action, currency = 'USD' }: ExpenseFormProps) {
  const [receiptUrl, setReceiptUrl] = useState<string | null>(expense?.receipt_url || null);
  const [amount, setAmount] = useState<number>(expense?.amount || 0);
  const [splitData, setSplitData] = useState<SplitData | null>(null);
  const { toast } = useToast();

  // Editing an existing expense doesn't support split (for now)
  const isEditing = !!expense;
  const showSplitOption = !isEditing;

  const handleAmountChange = useCallback((value: number) => {
    setAmount(value);
  }, []);

  const handleSplitDataChange = useCallback((data: SplitData | null) => {
    setSplitData(data);
  }, []);

  const handleSubmit = async (formData: FormData) => {
    // Add receipt URL to form data
    if (receiptUrl) {
      formData.set('receipt_url', receiptUrl);
    } else {
      formData.delete('receipt_url');
    }

    // If split is enabled, use the shared expense action
    if (splitData?.enabled && splitData.participants.length > 0) {
      // Add split data to form
      formData.set('participants', JSON.stringify(splitData.participants));
      formData.set('split_method', splitData.splitMethod);
      formData.set('split_values', JSON.stringify(splitData.splitValues));

      const result = await createInlineSharedExpense(formData);
      if (result?.error) {
        toast({
          title: 'Error',
          description: result.error,
          variant: 'destructive',
        });
      }
      // Note: createInlineSharedExpense redirects on success
      return;
    }

    // Regular expense
    const result = await action(formData);
    if (result?.error) {
      toast({
        title: 'Error',
        description: result.error,
        variant: 'destructive',
      });
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
          <CurrencyInput
            name="amount"
            label="Amount"
            currency={currency}
            defaultValue={expense?.amount}
            required
            onChange={handleAmountChange}
          />

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

          {/* Category - only for regular expenses */}
          {(!splitData?.enabled) && (
            <CategorySelect
              categories={categories}
              defaultValue={expense?.category_id}
              label="Category"
            />
          )}

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
              max={new Date().toISOString().split('T')[0]}
              required
            />
          </div>

          {/* Split Toggle - only for new expenses */}
          {showSplitOption && (
            <SplitToggle
              amount={amount}
              currency={currency}
              onSplitDataChange={handleSplitDataChange}
            />
          )}

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

          {/* Tags - only for regular expenses */}
          {(!splitData?.enabled) && (
            <div className="space-y-2">
              <Label htmlFor="tags">Tags (optional, comma-separated)</Label>
              <Input
                id="tags"
                name="tags"
                placeholder="e.g. work, lunch, client"
                defaultValue={expense?.tags?.join(', ') || ''}
              />
            </div>
          )}

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
