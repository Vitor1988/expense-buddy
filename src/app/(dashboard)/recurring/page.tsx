import { RecurringPageClient } from '@/components/recurring/recurring-page-client';
import { getRecurringExpenses } from '@/app/actions/recurring';
import { getCategories, createDefaultCategories } from '@/app/actions/categories';
import { createClient } from '@/lib/supabase/server';
import { type Category, type RecurringExpense } from '@/types';

export default async function RecurringPage() {
  // Fetch all data on the server in parallel
  const [supabase, categoriesResult, recurringResult] = await Promise.all([
    createClient(),
    getCategories(),
    getRecurringExpenses(),
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

  // Get recurring expenses
  const recurring = (recurringResult.data || []) as (RecurringExpense & { category?: Category | null })[];

  return (
    <RecurringPageClient
      recurring={recurring}
      categories={categories}
      currency={currency}
    />
  );
}
