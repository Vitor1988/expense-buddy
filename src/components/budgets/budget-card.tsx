'use client';

import { useState, useMemo } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { AlertTriangle } from 'lucide-react';
import { CardActionMenu, DeleteConfirmationDialog } from '@/components/shared';
import { useDeleteAction } from '@/hooks/use-delete-action';
import { type Category } from '@/types';
import { deleteBudget, updateBudget } from '@/app/actions/budgets';
import { BudgetForm } from './budget-form';

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

interface BudgetCardProps {
  budget: BudgetWithProgress;
  categories: Category[];
  currency?: string;
}

export function BudgetCard({ budget, categories, currency = 'USD' }: BudgetCardProps) {
  const [showEditDialog, setShowEditDialog] = useState(false);
  const { showDialog, setShowDialog, handleDelete } = useDeleteAction(
    deleteBudget,
    budget.id
  );

  const formatter = useMemo(() => new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency,
  }), [currency]);

  const handleUpdate = async (formData: FormData) => {
    return updateBudget(budget.id, formData);
  };

  const isOverBudget = budget.percentage > 100;
  const isNearLimit = budget.percentage > 80 && budget.percentage <= 100;

  const periodLabel = {
    weekly: 'This Week',
    monthly: 'This Month',
    yearly: 'This Year',
  }[budget.period];

  return (
    <>
      <Card className={`hover:shadow-md transition-shadow ${isOverBudget ? 'border-red-500' : ''}`}>
        <CardContent className="p-4">
          <div className="flex items-start justify-between mb-3">
            <div className="flex items-center gap-3">
              <div
                className="w-10 h-10 rounded-full flex items-center justify-center text-lg"
                style={{
                  backgroundColor: budget.category?.color ? budget.category.color + '20' : '#6b728020',
                }}
              >
                {budget.category?.icon || '📊'}
              </div>
              <div>
                <p className="font-medium text-gray-900 dark:text-white">
                  {budget.category?.name || 'All Categories'}
                </p>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  {periodLabel}
                </p>
              </div>
            </div>
            <CardActionMenu
              onEdit={() => setShowEditDialog(true)}
              onDelete={() => setShowDialog(true)}
            />
          </div>

          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-gray-500 dark:text-gray-400">
                {formatter.format(budget.spent)} spent
              </span>
              <span className="font-medium">
                {formatter.format(budget.amount)} limit
              </span>
            </div>

            <Progress
              value={Math.min(100, budget.percentage)}
              className={`h-2 ${
                isOverBudget
                  ? '[&>div]:bg-red-500'
                  : isNearLimit
                  ? '[&>div]:bg-yellow-500'
                  : '[&>div]:bg-emerald-500'
              }`}
            />

            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-500 dark:text-gray-400">
                {budget.percentage.toFixed(0)}% used
              </span>
              {isOverBudget ? (
                <span className="text-sm text-red-500 flex items-center gap-1">
                  <AlertTriangle className="w-4 h-4" />
                  Over budget by {formatter.format(budget.spent - budget.amount)}
                </span>
              ) : (
                <span className="text-sm text-emerald-600 dark:text-emerald-400">
                  {formatter.format(budget.remaining)} remaining
                </span>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Edit Dialog */}
      <BudgetForm
        categories={categories}
        budget={budget}
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
        title="Delete Budget"
        description="Are you sure you want to delete this budget? This action cannot be undone."
      />
    </>
  );
}
