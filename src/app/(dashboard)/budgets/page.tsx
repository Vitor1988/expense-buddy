import { BudgetsPageClient } from '@/components/budgets/budgets-page-client';
import { getBudgetProgress } from '@/app/actions/budgets';
import { getCategories, createDefaultCategories } from '@/app/actions/categories';
import { createClient } from '@/lib/supabase/server';
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

export default async function BudgetsPage() {
  // Fetch all data on the server
  const [supabase, categoriesResult, budgetsResult] = await Promise.all([
    createClient(),
    getCategories(),
    getBudgetProgress(),
  ]);

  // Get user's currency
  let currency = 'USD';
  const { data: { user } } = await supabase.auth.getUser();
  if (user) {
    const { data: profile } = await supabase
      .from('profiles')
      .select('currency')
      .eq('id', user.id)
      .single();
    if (profile?.currency) {
      currency = profile.currency;
    }
  }

  // Handle categories
  let categories = categoriesResult.data || [];
  if (categories.length === 0) {
    await createDefaultCategories();
    const result = await getCategories();
    categories = result.data || [];
  }

  // Get budgets
  const budgets = (budgetsResult.data || []) as BudgetWithProgress[];

  return (
    <BudgetsPageClient
      budgets={budgets}
      categories={categories}
      currency={currency}
    />
  );
}
