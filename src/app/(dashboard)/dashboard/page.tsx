import { createClient } from '@/lib/supabase/server';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import {
  ArrowUpRight,
  Wallet,
  TrendingUp,
  PiggyBank,
  Plus,
} from 'lucide-react';

export default async function DashboardPage() {
  const supabase = await createClient();

  // Get user profile for currency
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: profile } = await supabase
    .from('profiles')
    .select('currency')
    .eq('id', user?.id)
    .single();

  // Get this month's expenses
  const startOfMonth = new Date();
  startOfMonth.setDate(1);
  startOfMonth.setHours(0, 0, 0, 0);

  const { data: expenses } = await supabase
    .from('expenses')
    .select('amount, category:categories(name, color)')
    .eq('user_id', user?.id)
    .gte('date', startOfMonth.toISOString().split('T')[0]);

  const totalSpent = expenses?.reduce((sum, e) => sum + Number(e.amount), 0) || 0;

  // Get budgets
  const { data: budgets } = await supabase
    .from('budgets')
    .select('amount')
    .eq('user_id', user?.id)
    .eq('period', 'monthly');

  const totalBudget = budgets?.reduce((sum, b) => sum + Number(b.amount), 0) || 0;

  // Get recent expenses
  const { data: recentExpenses } = await supabase
    .from('expenses')
    .select('id, amount, description, date, category:categories(name, color, icon)')
    .eq('user_id', user?.id)
    .order('date', { ascending: false })
    .limit(5);

  const currency = profile?.currency || 'USD';
  const formatter = new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency,
  });

  const budgetPercentage = totalBudget > 0 ? (totalSpent / totalBudget) * 100 : 0;

  return (
    <div className="space-y-6">
      {/* Welcome & Quick Action */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            Welcome back, {user?.user_metadata?.full_name?.split(' ')[0] || 'there'}!
          </h1>
          <p className="text-gray-600 dark:text-gray-400">
            Here&apos;s your financial overview for this month
          </p>
        </div>
        <Link href="/expenses/new">
          <Button className="bg-emerald-500 hover:bg-emerald-600">
            <Plus className="w-4 h-4 mr-2" />
            Add Expense
          </Button>
        </Link>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-500 dark:text-gray-400">
                  Total Spent
                </p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">
                  {formatter.format(totalSpent)}
                </p>
              </div>
              <div className="p-3 rounded-full bg-red-100 dark:bg-red-900/30">
                <ArrowUpRight className="w-6 h-6 text-red-600 dark:text-red-400" />
              </div>
            </div>
            <p className="text-xs text-gray-500 mt-2">This month</p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-500 dark:text-gray-400">
                  Budget
                </p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">
                  {formatter.format(totalBudget)}
                </p>
              </div>
              <div className="p-3 rounded-full bg-emerald-100 dark:bg-emerald-900/30">
                <PiggyBank className="w-6 h-6 text-emerald-600 dark:text-emerald-400" />
              </div>
            </div>
            <p className="text-xs text-gray-500 mt-2">Monthly limit</p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-500 dark:text-gray-400">
                  Remaining
                </p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">
                  {formatter.format(Math.max(0, totalBudget - totalSpent))}
                </p>
              </div>
              <div className="p-3 rounded-full bg-blue-100 dark:bg-blue-900/30">
                <Wallet className="w-6 h-6 text-blue-600 dark:text-blue-400" />
              </div>
            </div>
            <p className="text-xs text-gray-500 mt-2">Left to spend</p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-500 dark:text-gray-400">
                  Budget Used
                </p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">
                  {budgetPercentage.toFixed(0)}%
                </p>
              </div>
              <div className="p-3 rounded-full bg-purple-100 dark:bg-purple-900/30">
                <TrendingUp className="w-6 h-6 text-purple-600 dark:text-purple-400" />
              </div>
            </div>
            <div className="mt-2 h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full transition-all ${
                  budgetPercentage > 100
                    ? 'bg-red-500'
                    : budgetPercentage > 80
                    ? 'bg-yellow-500'
                    : 'bg-emerald-500'
                }`}
                style={{ width: `${Math.min(100, budgetPercentage)}%` }}
              />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Recent Expenses */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Recent Expenses</CardTitle>
          <Link href="/expenses">
            <Button variant="ghost" size="sm">
              View all
            </Button>
          </Link>
        </CardHeader>
        <CardContent>
          {recentExpenses && recentExpenses.length > 0 ? (
            <div className="space-y-4">
              {recentExpenses.map((expense) => {
                const category = expense.category as unknown as { name: string; color: string; icon: string } | null;
                return (
                  <div
                    key={expense.id}
                    className="flex items-center justify-between py-2"
                  >
                    <div className="flex items-center gap-3">
                      <div
                        className="w-10 h-10 rounded-full flex items-center justify-center"
                        style={{
                          backgroundColor: category?.color ? category.color + '20' : '#6b728020',
                        }}
                      >
                        <span
                          className="text-lg"
                          style={{
                            color: category?.color || '#6b7280',
                          }}
                        >
                          $
                        </span>
                      </div>
                      <div>
                        <p className="font-medium text-gray-900 dark:text-white">
                          {expense.description || 'Expense'}
                        </p>
                        <p className="text-sm text-gray-500">
                          {category?.name || 'Uncategorized'} • {new Date(expense.date).toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                    <p className="font-semibold text-gray-900 dark:text-white">
                      -{formatter.format(expense.amount)}
                    </p>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="text-center py-8">
              <p className="text-gray-500 dark:text-gray-400 mb-4">
                No expenses yet. Start tracking your spending!
              </p>
              <Link href="/expenses/new">
                <Button className="bg-emerald-500 hover:bg-emerald-600">
                  <Plus className="w-4 h-4 mr-2" />
                  Add Your First Expense
                </Button>
              </Link>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
