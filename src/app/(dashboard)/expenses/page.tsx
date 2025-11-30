import { createClient } from '@/lib/supabase/server';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { Plus, Receipt, ChevronLeft, ChevronRight } from 'lucide-react';
import { ExpenseCard } from '@/components/expenses/expense-card';
import { ExpenseFilters } from '@/components/expenses/expense-filters';
import { getCategories, createDefaultCategories } from '@/app/actions/categories';
import { getExpensesPaginated } from '@/app/actions/expenses';

const ITEMS_PER_PAGE = 20;

interface ExpensesPageProps {
  searchParams: Promise<{
    search?: string;
    category?: string;
    startDate?: string;
    endDate?: string;
    page?: string;
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

  // Get current page from params
  const currentPage = params?.page ? parseInt(params.page, 10) : 1;

  // Fetch paginated expenses
  const { data: expenses, total = 0, totalPages = 1 } = await getExpensesPaginated({
    search: params?.search,
    categoryId: params?.category,
    startDate: params?.startDate,
    endDate: params?.endDate,
    page: currentPage,
    limit: ITEMS_PER_PAGE,
  });

  // Calculate totals for current page
  const totalAmount = expenses?.reduce((sum, e) => sum + Number(e.amount), 0) || 0;

  // Build pagination URLs
  const buildPageUrl = (page: number) => {
    const urlParams = new URLSearchParams();
    if (params?.search) urlParams.set('search', params.search);
    if (params?.category) urlParams.set('category', params.category);
    if (params?.startDate) urlParams.set('startDate', params.startDate);
    if (params?.endDate) urlParams.set('endDate', params.endDate);
    if (page > 1) urlParams.set('page', page.toString());
    const queryString = urlParams.toString();
    return `/expenses${queryString ? `?${queryString}` : ''}`;
  };
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
                {total > ITEMS_PER_PAGE
                  ? `Showing ${(currentPage - 1) * ITEMS_PER_PAGE + 1}-${Math.min(currentPage * ITEMS_PER_PAGE, total)} of ${total} expenses`
                  : `Total (${total} expenses)`}
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

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2">
          <Link href={buildPageUrl(currentPage - 1)}>
            <Button
              variant="outline"
              size="icon"
              disabled={currentPage === 1}
              className={currentPage === 1 ? 'pointer-events-none opacity-50' : ''}
            >
              <ChevronLeft className="w-4 h-4" />
            </Button>
          </Link>
          <div className="flex items-center gap-1">
            {Array.from({ length: totalPages }, (_, i) => i + 1)
              .filter((page) => {
                // Show first, last, current, and pages around current
                if (page === 1 || page === totalPages) return true;
                if (Math.abs(page - currentPage) <= 1) return true;
                return false;
              })
              .map((page, index, array) => {
                // Add ellipsis if there's a gap
                const showEllipsisBefore = index > 0 && page - array[index - 1] > 1;
                return (
                  <span key={page} className="flex items-center gap-1">
                    {showEllipsisBefore && (
                      <span className="px-2 text-gray-400">...</span>
                    )}
                    <Link href={buildPageUrl(page)}>
                      <Button
                        variant={page === currentPage ? 'default' : 'outline'}
                        size="icon"
                        className={page === currentPage ? 'bg-emerald-500 hover:bg-emerald-600' : ''}
                      >
                        {page}
                      </Button>
                    </Link>
                  </span>
                );
              })}
          </div>
          <Link href={buildPageUrl(currentPage + 1)}>
            <Button
              variant="outline"
              size="icon"
              disabled={currentPage === totalPages}
              className={currentPage === totalPages ? 'pointer-events-none opacity-50' : ''}
            >
              <ChevronRight className="w-4 h-4" />
            </Button>
          </Link>
        </div>
      )}
    </div>
  );
}
