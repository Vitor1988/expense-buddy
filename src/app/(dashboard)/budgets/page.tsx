'use client';

import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Plus, PiggyBank, Loader2 } from 'lucide-react';
import { BudgetCard } from '@/components/budgets/budget-card';
import { BudgetForm } from '@/components/budgets/budget-form';
import { createBudget, getBudgetProgress } from '@/app/actions/budgets';
import { getCategories, createDefaultCategories } from '@/app/actions/categories';
import { createClient } from '@/lib/supabase/client';
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

export default function BudgetsPage() {
  const [budgets, setBudgets] = useState<BudgetWithProgress[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [showNewDialog, setShowNewDialog] = useState(false);
  const [currency, setCurrency] = useState('USD');

  const loadData = useCallback(async () => {
    setLoading(true);

    // Get user's currency
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      const { data: profile } = await supabase
        .from('profiles')
        .select('currency')
        .eq('id', user.id)
        .single();
      if (profile?.currency) {
        setCurrency(profile.currency);
      }
    }

    // Get categories
    const { data: cats } = await getCategories();
    if (!cats || cats.length === 0) {
      await createDefaultCategories();
      const result = await getCategories();
      setCategories(result.data || []);
    } else {
      setCategories(cats);
    }

    // Get budgets with progress
    const { data: budgetData } = await getBudgetProgress();
    if (budgetData) {
      setBudgets(budgetData as BudgetWithProgress[]);
    }

    setLoading(false);
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleCreate = async (formData: FormData) => {
    // Handle "all" category value
    const categoryId = formData.get('category_id');
    if (categoryId === 'all') {
      formData.delete('category_id');
    }

    const result = await createBudget(formData);
    if (result.success) {
      loadData();
    }
    return result;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-emerald-500" />
      </div>
    );
  }

  // Calculate totals
  const totalBudget = budgets.reduce((sum, b) => sum + b.amount, 0);
  const totalSpent = budgets.reduce((sum, b) => sum + b.spent, 0);
  const formatter = new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency,
  });

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
      {budgets.length > 0 && (
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
      {budgets.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {budgets.map((budget) => (
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
