import { CategoriesPageClient } from '@/components/categories/categories-page-client';
import { getCategories, createDefaultCategories } from '@/app/actions/categories';
import { createClient } from '@/lib/supabase/server';

export default async function CategoriesPage() {
  // Fetch all data on the server in parallel
  const [supabase, categoriesResult] = await Promise.all([
    createClient(),
    getCategories(),
  ]);

  // Handle categories
  let categories = categoriesResult.data || [];
  if (categories.length === 0) {
    await createDefaultCategories();
    const result = await getCategories();
    categories = result.data || [];
  }

  // Get expense counts per category using aggregate query
  const { data: counts } = await supabase
    .from('expenses')
    .select('category_id');

  const expenseCounts: Record<string, number> = {};
  if (counts) {
    counts.forEach((expense) => {
      if (expense.category_id) {
        expenseCounts[expense.category_id] = (expenseCounts[expense.category_id] || 0) + 1;
      }
    });
  }

  return (
    <CategoriesPageClient
      categories={categories}
      expenseCounts={expenseCounts}
    />
  );
}
