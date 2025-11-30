'use client';

import { useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Plus, PiggyBank } from 'lucide-react';
import { BudgetCard } from '@/components/budgets/budget-card';
import { BudgetForm } from '@/components/budgets/budget-form';
import { createBudget } from '@/app/actions/budgets';
import { type Category } from '@/types';

interface BudgetWithProgress {
  id: string;
  user_id: string;
  category_id: string | null;
  amount: number;
  period: 'weekly' | 'monthly' | 'yearly';
  start_date: string | null;
  created_at: string;
  category?: Category | null;
  spent: number;
  percentage: number;
  remaining: number;
}

interface BudgetsPageClientProps {
  budgets: BudgetWithProgress[];
  categories: Category[];
  currency: string;
}

export function BudgetsPageClient({
  budgets: initialBudgets,
  categories,
  currency,
}: BudgetsPageClientProps) {
  const router = useRouter();
  const [showNewDialog, setShowNewDialog] = useState(false);

  const formatter = useMemo(() => new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency,
  }), [currency]);

  const handleCreate = async (formData: FormData) => {
    // Handle "all" category value
    const categoryId = formData.get('category_id');
    if (categoryId === 'all') {
      formData.delete('category_id');
    }

    const result = await createBudget(formData);
    if (result.success) {
      router.refresh();
      setShowNewDialog(false);
    }
    return result;
  };

  // Calculate totals
  const totalBudget = initialBudgets.reduce((sum, b) => sum + b.amount, 0);
  const totalSpent = initialBudgets.reduce((sum, b) => sum + b.spent, 0);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Budgets</h1>
          <p className="text-gray-600 dark:text-gray-400">
            Set spending limits and track your progress
          </p>
        </div>
        <Button
          className="bg-emerald-500 hover:bg-emerald-600"
          onClick={() => setShowNewDialog(true)}
        >
          <Plus className="w-4 h-4 mr-2" />
          Add Budget
        </Button>
      </div>

      {/* Summary Card */}
      {initialBudgets.length > 0 && (
        <Card>
          <CardContent className="pt-6">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <p className="text-sm font-medium text-gray-500 dark:text-gray-400">
                  Total Budget
                </p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">
                  {formatter.format(totalBudget)}
                </p>
              </div>
              <div>
                <p className="text-sm font-medium text-gray-500 dark:text-gray-400">
                  Total Spent
                </p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">
                  {formatter.format(totalSpent)}
                </p>
              </div>
              <div>
                <p className="text-sm font-medium text-gray-500 dark:text-gray-400">
                  Overall Progress
                </p>
                <p className={`text-2xl font-bold ${
                  totalSpent > totalBudget ? 'text-red-500' : 'text-emerald-500'
                }`}>
                  {totalBudget > 0 ? ((totalSpent / totalBudget) * 100).toFixed(0) : 0}%
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Budget Cards */}
      {initialBudgets.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {initialBudgets.map((budget) => (
            <BudgetCard
              key={budget.id}
              budget={budget}
              categories={categories}
              currency={currency}
            />
          ))}
        </div>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle className="text-center">No budgets set</CardTitle>
          </CardHeader>
          <CardContent className="text-center">
            <PiggyBank className="w-12 h-12 mx-auto mb-4 text-gray-400" />
            <p className="text-gray-500 dark:text-gray-400 mb-4">
              Create budgets to track your spending limits
            </p>
            <Button
              className="bg-emerald-500 hover:bg-emerald-600"
              onClick={() => setShowNewDialog(true)}
            >
              <Plus className="w-4 h-4 mr-2" />
              Add Your First Budget
            </Button>
          </CardContent>
        </Card>
      )}

      {/* New Budget Dialog */}
      <BudgetForm
        categories={categories}
        action={handleCreate}
        open={showNewDialog}
        onOpenChange={setShowNewDialog}
        currency={currency}
      />
    </div>
  );
}
