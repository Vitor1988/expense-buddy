'use client';

import { useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Plus, RefreshCw, Loader2, Play } from 'lucide-react';
import { RecurringCard } from '@/components/recurring/recurring-card';
import { RecurringForm } from '@/components/recurring/recurring-form';
import { createRecurringExpense, processRecurringExpenses } from '@/app/actions/recurring';
import { type Category, type RecurringExpense } from '@/types';
import { useToast } from '@/hooks/use-toast';

interface RecurringPageClientProps {
  recurring: (RecurringExpense & { category?: Category | null })[];
  categories: Category[];
  currency: string;
}

export function RecurringPageClient({
  recurring: initialRecurring,
  categories,
  currency,
}: RecurringPageClientProps) {
  const router = useRouter();
  const [processing, setProcessing] = useState(false);
  const [showNewDialog, setShowNewDialog] = useState(false);
  const { toast } = useToast();

  const formatter = useMemo(() => new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency,
  }), [currency]);

  const handleCreate = async (formData: FormData) => {
    const result = await createRecurringExpense(formData);
    if (result.success) {
      router.refresh();
      setShowNewDialog(false);
    }
    return result;
  };

  const handleProcess = async () => {
    setProcessing(true);
    const result = await processRecurringExpenses();
    if (result.success) {
      toast({
        title: 'Recurring Expenses Processed',
        description: `${result.processed} expense(s) were created.`,
      });
      router.refresh();
    } else if (result.error) {
      toast({
        title: 'Error',
        description: result.error,
        variant: 'destructive',
      });
    }
    setProcessing(false);
  };

  const handleToggle = () => {
    router.refresh();
  };

  // Calculate monthly total for active recurring
  const monthlyTotal = initialRecurring
    .filter(r => r.is_active)
    .reduce((sum, r) => {
      switch (r.frequency) {
        case 'daily':
          return sum + r.amount * 30;
        case 'weekly':
          return sum + r.amount * 4;
        case 'monthly':
          return sum + r.amount;
        case 'yearly':
          return sum + r.amount / 12;
        default:
          return sum;
      }
    }, 0);

  const activeCount = initialRecurring.filter(r => r.is_active).length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Recurring Expenses</h1>
          <p className="text-gray-600 dark:text-gray-400">
            Automate your regular expenses
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={handleProcess}
            disabled={processing || activeCount === 0}
          >
            {processing ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Processing...
              </>
            ) : (
              <>
                <Play className="w-4 h-4 mr-2" />
                Process Due
              </>
            )}
          </Button>
          <Button
            className="bg-emerald-500 hover:bg-emerald-600"
            onClick={() => setShowNewDialog(true)}
          >
            <Plus className="w-4 h-4 mr-2" />
            Add Recurring
          </Button>
        </div>
      </div>

      {/* Summary Card */}
      {initialRecurring.length > 0 && (
        <Card>
          <CardContent className="pt-6">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <p className="text-sm font-medium text-gray-500 dark:text-gray-400">
                  Active Recurring
                </p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">
                  {activeCount}
                </p>
              </div>
              <div>
                <p className="text-sm font-medium text-gray-500 dark:text-gray-400">
                  Est. Monthly Cost
                </p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">
                  {formatter.format(monthlyTotal)}
                </p>
              </div>
              <div>
                <p className="text-sm font-medium text-gray-500 dark:text-gray-400">
                  Est. Yearly Cost
                </p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">
                  {formatter.format(monthlyTotal * 12)}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Recurring Cards */}
      {initialRecurring.length > 0 ? (
        <div className="space-y-3">
          {initialRecurring.map((item) => (
            <RecurringCard
              key={item.id}
              recurring={item}
              categories={categories}
              currency={currency}
              onToggle={handleToggle}
            />
          ))}
        </div>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle className="text-center">No recurring expenses</CardTitle>
          </CardHeader>
          <CardContent className="text-center">
            <RefreshCw className="w-12 h-12 mx-auto mb-4 text-gray-400" />
            <p className="text-gray-500 dark:text-gray-400 mb-4">
              Set up recurring expenses for subscriptions, bills, and regular payments
            </p>
            <Button
              className="bg-emerald-500 hover:bg-emerald-600"
              onClick={() => setShowNewDialog(true)}
            >
              <Plus className="w-4 h-4 mr-2" />
              Add Recurring Expense
            </Button>
          </CardContent>
        </Card>
      )}

      {/* New Recurring Dialog */}
      <RecurringForm
        categories={categories}
        action={handleCreate}
        open={showNewDialog}
        onOpenChange={setShowNewDialog}
        currency={currency}
      />
    </div>
  );
}
