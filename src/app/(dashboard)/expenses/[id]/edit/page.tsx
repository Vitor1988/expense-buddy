import { createClient } from '@/lib/supabase/server';
import { ExpenseForm } from '@/components/expenses/expense-form';
import { updateExpense, getExpenseById } from '@/app/actions/expenses';
import { getCategories, createDefaultCategories } from '@/app/actions/categories';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';
import { notFound } from 'next/navigation';
import { type Category } from '@/types';

interface EditExpensePageProps {
  params: Promise<{ id: string }>;
}

export default async function EditExpensePage({ params }: EditExpensePageProps) {
  const { id } = await params;
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Get the expense
  const { data: expense, error } = await getExpenseById(id);

  if (error || !expense) {
    notFound();
  }

  // Get user's currency
  const { data: profile } = await supabase
    .from('profiles')
    .select('currency')
    .eq('id', user?.id)
    .single();

  // Get categories
  let { data: categories } = await getCategories();

  if (!categories || categories.length === 0) {
    await createDefaultCategories();
    const result = await getCategories();
    categories = result.data;
  }

  const updateExpenseWithId = async (formData: FormData) => {
    'use server';
    return updateExpense(id, formData);
  };

  const category = expense.category as unknown as Category | null;

  return (
    <div className="max-w-lg mx-auto">
      <div className="mb-6">
        <Link href="/expenses">
          <Button variant="ghost" size="sm" className="mb-4">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Expenses
          </Button>
        </Link>
      </div>

      <ExpenseForm
        categories={categories || []}
        expense={{ ...expense, category }}
        action={updateExpenseWithId}
        currency={profile?.currency || 'USD'}
      />
    </div>
  );
}
