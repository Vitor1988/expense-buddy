import { createClient } from '@/lib/supabase/server';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { Plus, Receipt } from 'lucide-react';
import { ExpenseCard } from '@/components/expenses/expense-card';
import { ExpenseFilters } from '@/components/expenses/expense-filters';
import { getCategories, createDefaultCategories } from '@/app/actions/categories';

interface ExpensesPageProps {
  searchParams: Promise<{
    search?: string;
    category?: string;
    startDate?: string;
    endDate?: string;
  }>;
}

export default async function ExpensesPage({ searchParams }: ExpensesPageProps) {
  const params = await searchParams;
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

  // Get categories
  let { data: categories } = await getCategories();

  if (!categories || categories.length === 0) {
    await createDefaultCategories();
    const result = await getCategories();
    categories = result.data;
  }

  // Build query for expenses
  let query = supabase
    .from('expenses')
    .select('*, category:categories(*)')
    .eq('user_id', user?.id)
    .order('date', { ascending: false });

  if (params?.search) {
    query = query.ilike('description', `%${params.search}%`);
  }

  if (params?.category) {
    query = query.eq('category_id', params.category);
  }

  if (params?.startDate) {
    query = query.gte('date', params.startDate);
  }

  if (params?.endDate) {
    query = query.lte('date', params.endDate);
  }

  const { data: expenses } = await query;

  // Calculate totals for filtered results
  const totalAmount = expenses?.reduce((sum, e) => sum + Number(e.amount), 0) || 0;
  const currency = profile?.currency || 'USD';
  const formatter = new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency,
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Expenses</h1>
          <p className="text-gray-600 dark:text-gray-400">
            Track and manage your spending
          </p>
        </div>
        <Link href="/expenses/new">
          <Button className="bg-emerald-500 hover:bg-emerald-600">
            <Plus className="w-4 h-4 mr-2" />
            Add Expense
          </Button>
        </Link>
      </div>

      {/* Summary Card */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-500 dark:text-gray-400">
                Total ({expenses?.length || 0} expenses)
              </p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">
                {formatter.format(totalAmount)}
              </p>
            </div>
            <div className="p-3 rounded-full bg-emerald-100 dark:bg-emerald-900/30">
              <Receipt className="w-6 h-6 text-emerald-600 dark:text-emerald-400" />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Filters */}
      <ExpenseFilters categories={categories || []} />

      {/* Expenses List */}
      {expenses && expenses.length > 0 ? (
        <div className="space-y-3">
          {expenses.map((expense) => {
            const category = expense.category as unknown as {
              id: string;
              name: string;
              color: string;
              icon: string;
            } | null;
            return (
              <ExpenseCard
                key={expense.id}
                expense={{ ...expense, category }}
                currency={currency}
              />
            );
          })}
        </div>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle className="text-center">No expenses found</CardTitle>
          </CardHeader>
          <CardContent className="text-center">
            <p className="text-gray-500 dark:text-gray-400 mb-4">
              {params?.search || params?.category || params?.startDate
                ? 'Try adjusting your filters'
                : 'Start tracking your spending by adding your first expense'}
            </p>
            <Link href="/expenses/new">
              <Button className="bg-emerald-500 hover:bg-emerald-600">
                <Plus className="w-4 h-4 mr-2" />
                Add Expense
              </Button>
            </Link>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
