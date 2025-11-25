import { createClient } from '@/lib/supabase/server';
import { ExpenseForm } from '@/components/expenses/expense-form';
import { createExpense } from '@/app/actions/expenses';
import { getCategories, createDefaultCategories } from '@/app/actions/categories';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';

export default async function NewExpensePage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Get user's currency
  const { data: profile } = await supabase
    .from('profiles')
    .select('currency')
    .eq('id', user?.id)
    .single();

  // Get categories, create defaults if none exist
  let { data: categories } = await getCategories();

  if (!categories || categories.length === 0) {
    await createDefaultCategories();
    const result = await getCategories();
    categories = result.data;
  }

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
        action={createExpense}
        currency={profile?.currency || 'USD'}
      />
    </div>
  );
}
