'use client';

import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Loader2, Download, TrendingUp, TrendingDown, Calendar } from 'lucide-react';
import { SpendingPieChart } from '@/components/charts/spending-pie-chart';
import { SpendingTrendChart } from '@/components/charts/spending-trend-chart';
import { MonthlyComparisonChart } from '@/components/charts/monthly-comparison-chart';
import {
  getSpendingByCategory,
  getSpendingTrend,
  getMonthlyComparison,
  getTopExpenses,
  exportExpenses,
} from '@/app/actions/reports';
import { createClient } from '@/lib/supabase/client';
import { formatCurrency, formatDate } from '@/lib/utils';
import { type CurrencyCode } from '@/types';

interface SpendingData {
  name: string;
  value: number;
  color: string;
  [key: string]: string | number;
}

interface TrendData {
  date: string;
  amount: number;
}

interface MonthlyData {
  month: string;
  amount: number;
}

interface TopExpense {
  id: string;
  amount: number;
  description: string | null;
  date: string;
  category: { name: string; icon: string; color: string } | null;
}

export default function ReportsPage() {
  const [loading, setLoading] = useState(true);
  const [currency, setCurrency] = useState<CurrencyCode>('USD');
  const [dateRange, setDateRange] = useState({
    start: new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0],
    end: new Date().toISOString().split('T')[0],
  });

  const [categoryData, setCategoryData] = useState<SpendingData[]>([]);
  const [trendData, setTrendData] = useState<TrendData[]>([]);
  const [monthlyData, setMonthlyData] = useState<MonthlyData[]>([]);
  const [topExpenses, setTopExpenses] = useState<TopExpense[]>([]);
  const [exporting, setExporting] = useState(false);

  const loadData = useCallback(async () => {
    setLoading(true);

    // Get user's currency
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      const { data: profile } = await supabase
        .from('profiles')
        .select('currency')
        .eq('id', user.id)
        .single();
      if (profile?.currency) {
        setCurrency(profile.currency as CurrencyCode);
      }
    }

    // Load all report data
    const [categoryResult, trendResult, monthlyResult, topResult] = await Promise.all([
      getSpendingByCategory(dateRange.start, dateRange.end),
      getSpendingTrend(dateRange.start, dateRange.end, 'day'),
      getMonthlyComparison(6),
      getTopExpenses(dateRange.start, dateRange.end, 5),
    ]);

    if (categoryResult.data) setCategoryData(categoryResult.data);
    if (trendResult.data) setTrendData(trendResult.data);
    if (monthlyResult.data) setMonthlyData(monthlyResult.data);
    if (topResult.data) setTopExpenses(topResult.data as unknown as TopExpense[]);

    setLoading(false);
  }, [dateRange]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleExport = async (format: 'csv' | 'json') => {
    setExporting(true);
    const result = await exportExpenses(dateRange.start, dateRange.end, format);
    if (result.data) {
      const blob = new Blob([result.data], {
        type: format === 'csv' ? 'text/csv' : 'application/json',
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `expenses-${dateRange.start}-to-${dateRange.end}.${format}`;
      a.click();
      URL.revokeObjectURL(url);
    }
    setExporting(false);
  };

  const setPresetRange = (preset: string) => {
    const now = new Date();
    let start: Date;
    let end = now;

    switch (preset) {
      case 'thisWeek':
        start = new Date(now);
        start.setDate(now.getDate() - now.getDay());
        break;
      case 'thisMonth':
        start = new Date(now.getFullYear(), now.getMonth(), 1);
        break;
      case 'lastMonth':
        start = new Date(now.getFullYear(), now.getMonth() - 1, 1);
        end = new Date(now.getFullYear(), now.getMonth(), 0);
        break;
      case 'last3Months':
        start = new Date(now.getFullYear(), now.getMonth() - 2, 1);
        break;
      case 'thisYear':
        start = new Date(now.getFullYear(), 0, 1);
        break;
      default:
        return;
    }

    setDateRange({
      start: start.toISOString().split('T')[0],
      end: end.toISOString().split('T')[0],
    });
  };

  // Calculate summary stats
  const totalSpent = categoryData.reduce((sum, c) => sum + c.value, 0);
  const avgDaily = trendData.length > 0
    ? trendData.reduce((sum, d) => sum + d.amount, 0) / trendData.length
    : 0;

  // Compare with previous period
  const currentMonth = monthlyData[monthlyData.length - 1]?.amount || 0;
  const previousMonth = monthlyData[monthlyData.length - 2]?.amount || 0;
  const monthOverMonth = previousMonth > 0
    ? ((currentMonth - previousMonth) / previousMonth) * 100
    : 0;

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-emerald-500" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Reports</h1>
          <p className="text-gray-600 dark:text-gray-400">
            Analyze your spending patterns
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={() => handleExport('csv')}
            disabled={exporting}
          >
            {exporting ? (
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            ) : (
              <Download className="w-4 h-4 mr-2" />
            )}
            Export CSV
          </Button>
        </div>
      </div>

      {/* Date Range Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex gap-2 flex-wrap">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPresetRange('thisWeek')}
              >
                This Week
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPresetRange('thisMonth')}
              >
                This Month
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPresetRange('lastMonth')}
              >
                Last Month
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPresetRange('last3Months')}
              >
                Last 3 Months
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPresetRange('thisYear')}
              >
                This Year
              </Button>
            </div>
            <div className="flex gap-2 items-center ml-auto">
              <div className="flex items-center gap-2">
                <Label className="sr-only">Start Date</Label>
                <Input
                  type="date"
                  value={dateRange.start}
                  onChange={(e) => setDateRange({ ...dateRange, start: e.target.value })}
                  className="w-auto"
                />
              </div>
              <span className="text-gray-500">to</span>
              <div className="flex items-center gap-2">
                <Label className="sr-only">End Date</Label>
                <Input
                  type="date"
                  value={dateRange.end}
                  onChange={(e) => setDateRange({ ...dateRange, end: e.target.value })}
                  className="w-auto"
                />
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-500 dark:text-gray-400">
                  Total Spent
                </p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">
                  {formatCurrency(totalSpent, currency)}
                </p>
              </div>
              <div className="p-3 rounded-full bg-red-100 dark:bg-red-900/30">
                <Calendar className="w-6 h-6 text-red-600 dark:text-red-400" />
              </div>
            </div>
            <p className="text-xs text-gray-500 mt-2">
              {formatDate(dateRange.start)} - {formatDate(dateRange.end)}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-500 dark:text-gray-400">
                  Daily Average
                </p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">
                  {formatCurrency(avgDaily, currency)}
                </p>
              </div>
              <div className="p-3 rounded-full bg-blue-100 dark:bg-blue-900/30">
                <TrendingUp className="w-6 h-6 text-blue-600 dark:text-blue-400" />
              </div>
            </div>
            <p className="text-xs text-gray-500 mt-2">
              Per day in selected period
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-500 dark:text-gray-400">
                  Month over Month
                </p>
                <p className={`text-2xl font-bold ${
                  monthOverMonth > 0 ? 'text-red-500' : 'text-emerald-500'
                }`}>
                  {monthOverMonth > 0 ? '+' : ''}{monthOverMonth.toFixed(1)}%
                </p>
              </div>
              <div className={`p-3 rounded-full ${
                monthOverMonth > 0
                  ? 'bg-red-100 dark:bg-red-900/30'
                  : 'bg-emerald-100 dark:bg-emerald-900/30'
              }`}>
                {monthOverMonth > 0 ? (
                  <TrendingUp className="w-6 h-6 text-red-600 dark:text-red-400" />
                ) : (
                  <TrendingDown className="w-6 h-6 text-emerald-600 dark:text-emerald-400" />
                )}
              </div>
            </div>
            <p className="text-xs text-gray-500 mt-2">
              Compared to last month
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <SpendingPieChart data={categoryData} currency={currency} />
        <SpendingTrendChart data={trendData} currency={currency} />
      </div>

      <MonthlyComparisonChart data={monthlyData} currency={currency} />

      {/* Top Expenses */}
      <Card>
        <CardHeader>
          <CardTitle>Top Expenses</CardTitle>
        </CardHeader>
        <CardContent>
          {topExpenses.length > 0 ? (
            <div className="space-y-4">
              {topExpenses.map((expense, index) => {
                const category = expense.category as unknown as { name: string; icon: string; color: string } | null;
                return (
                  <div key={expense.id} className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <span className="text-lg font-bold text-gray-400 w-6">
                        {index + 1}
                      </span>
                      <div
                        className="w-10 h-10 rounded-full flex items-center justify-center"
                        style={{
                          backgroundColor: category?.color ? category.color + '20' : '#6b728020',
                        }}
                      >
                        <span>{category?.icon || '📦'}</span>
                      </div>
                      <div>
                        <p className="font-medium text-gray-900 dark:text-white">
                          {expense.description || 'Expense'}
                        </p>
                        <p className="text-sm text-gray-500">
                          {category?.name || 'Uncategorized'} • {formatDate(expense.date)}
                        </p>
                      </div>
                    </div>
                    <p className="font-semibold text-gray-900 dark:text-white">
                      {formatCurrency(expense.amount, currency)}
                    </p>
                  </div>
                );
              })}
            </div>
          ) : (
            <p className="text-center text-gray-500 py-8">
              No expenses in the selected period
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
