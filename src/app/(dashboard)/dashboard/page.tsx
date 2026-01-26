import { createClient } from '@/lib/supabase/server';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import {
  ArrowUpRight,
  Wallet,
  TrendingUp,
  PiggyBank,
  Plus,
} from 'lucide-react';
import { MonthlyExpenseSection } from '@/components/dashboard/monthly-expense-section';
import { GroupsBalanceWidget } from '@/components/dashboard/groups-balance-widget';
import { getExpensesByMonth } from '@/app/actions/expenses';
import { getGroups } from '@/app/actions/groups';
import type { CurrencyCode } from '@/types';

export default async function DashboardPage() {
  const supabase = await createClient();

  // Get user first (required for subsequent queries)
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Calculate start of month once
  const startOfMonth = new Date();
  startOfMonth.setDate(1);
  startOfMonth.setHours(0, 0, 0, 0);
  const startOfMonthStr = startOfMonth.toISOString().split('T')[0];

  // Run all data fetches in parallel
  const [
    { data: profile },
    { data: expenses },
    { data: budgets },
    { data: monthlyData },
    { data: groups },
    { data: sharedSplits },
  ] = await Promise.all([
    supabase.from('profiles').select('currency').eq('id', user?.id).single(),
    supabase.from('expenses').select('amount').eq('user_id', user?.id).gte('date', startOfMonthStr),
    supabase.from('budgets').select('amount').eq('user_id', user?.id).eq('period', 'monthly'),
    getExpensesByMonth(3),
    getGroups(),
    // Get user's share from inline shared expenses (group_id is null) this month
    supabase
      .from('expense_splits')
      .select('amount, shared_expense:shared_expenses!inner(date, group_id)')
      .eq('user_id', user?.id)
      .is('shared_expense.group_id', null)
      .gte('shared_expense.date', startOfMonthStr),
  ]);

  const regularTotal = expenses?.reduce((sum, e) => sum + Number(e.amount), 0) || 0;
  const sharedTotal = sharedSplits?.reduce((sum, s) => sum + Number(s.amount), 0) || 0;
  const totalSpent = regularTotal + sharedTotal;
  const totalBudget = budgets?.reduce((sum, b) => sum + Number(b.amount), 0) || 0;

  const currency = (profile?.currency || 'USD') as CurrencyCode;
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
            Here&apos;s your financial overview
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
      <div className={`grid gap-4 ${totalBudget > 0 ? 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-4' : 'grid-cols-1 sm:grid-cols-2'}`}>
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

        {totalBudget > 0 && (
          <>
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
          </>
        )}
      </div>

      {/* Monthly Expenses & Groups Balance */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <MonthlyExpenseSection
          initialData={monthlyData || []}
          currency={currency}
        />
        <GroupsBalanceWidget
          groups={groups || []}
          currency={currency}
        />
      </div>
    </div>
  );
}
