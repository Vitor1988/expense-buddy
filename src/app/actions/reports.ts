'use server';

import { getAuthenticatedUser } from '@/lib/auth-helpers';

export async function getSpendingByCategory(startDate: string, endDate: string) {
  const { user, supabase, error } = await getAuthenticatedUser();
  if (error || !user || !supabase) {
    return { data: null, error: error || 'Not authenticated' };
  }

  // Fetch regular expenses and settled splits in parallel
  const [expensesResult, splitsResult] = await Promise.all([
    // Regular expenses
    supabase
      .from('expenses')
      .select('amount, category:categories(name, color)')
      .eq('user_id', user.id)
      .gte('date', startDate)
      .lte('date', endDate),
    // Settled expense splits with category
    supabase
      .from('expense_splits')
      .select('amount, category:categories(name, color), shared_expense:shared_expenses!inner(date)')
      .eq('user_id', user.id)
      .eq('is_settled', true)
      .not('category_id', 'is', null)
  ]);

  const expenses = expensesResult.data || [];

  // Filter splits by date (can't do date filter in the join easily)
  const settledSplits = (splitsResult.data || []).filter((split) => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const sharedExpense = split.shared_expense as any;
    const splitDate = sharedExpense?.date;
    return splitDate && splitDate >= startDate && splitDate <= endDate;
  });

  // Group by category
  const categoryTotals: Record<string, { name: string; value: number; color: string }> = {};

  // Process regular expenses
  expenses.forEach((expense) => {
    const category = expense.category as unknown as { name: string; color: string } | null;
    const categoryName = category?.name || 'Uncategorized';
    const categoryColor = category?.color || '#6b7280';

    if (!categoryTotals[categoryName]) {
      categoryTotals[categoryName] = {
        name: categoryName,
        value: 0,
        color: categoryColor,
      };
    }
    categoryTotals[categoryName].value += Number(expense.amount);
  });

  // Process settled splits
  settledSplits.forEach((split) => {
    const category = split.category as unknown as { name: string; color: string } | null;
    const categoryName = category?.name || 'Uncategorized';
    const categoryColor = category?.color || '#6b7280';

    if (!categoryTotals[categoryName]) {
      categoryTotals[categoryName] = {
        name: categoryName,
        value: 0,
        color: categoryColor,
      };
    }
    categoryTotals[categoryName].value += Number(split.amount);
  });

  const data = Object.values(categoryTotals).sort((a, b) => b.value - a.value);
  return { data, error: null };
}

export async function getSpendingTrend(startDate: string, endDate: string, groupBy: 'day' | 'week' | 'month' = 'day') {
  const { user, supabase, error } = await getAuthenticatedUser();
  if (error || !user || !supabase) {
    return { data: null, error: error || 'Not authenticated' };
  }

  // Fetch regular expenses and settled splits in parallel
  const [expensesResult, splitsResult] = await Promise.all([
    supabase
      .from('expenses')
      .select('amount, date')
      .eq('user_id', user.id)
      .gte('date', startDate)
      .lte('date', endDate)
      .order('date', { ascending: true }),
    // Settled expense splits with category
    supabase
      .from('expense_splits')
      .select('amount, shared_expense:shared_expenses!inner(date)')
      .eq('user_id', user.id)
      .eq('is_settled', true)
      .not('category_id', 'is', null)
  ]);

  const expenses = expensesResult.data || [];

  // Filter splits by date and extract date
  const settledSplits = (splitsResult.data || [])
    .map((split) => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const sharedExpense = split.shared_expense as any;
      return { amount: split.amount, date: sharedExpense?.date };
    })
    .filter((split) => split.date && split.date >= startDate && split.date <= endDate);

  // Helper function to get date key
  const getDateKey = (dateStr: string): string => {
    const date = new Date(dateStr);
    switch (groupBy) {
      case 'week': {
        const weekStart = new Date(date);
        weekStart.setDate(date.getDate() - date.getDay());
        return weekStart.toISOString().split('T')[0];
      }
      case 'month':
        return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      default:
        return dateStr;
    }
  };

  // Group by date
  const dateTotals: Record<string, number> = {};

  // Process regular expenses
  expenses.forEach((expense) => {
    const key = getDateKey(expense.date);
    if (!dateTotals[key]) {
      dateTotals[key] = 0;
    }
    dateTotals[key] += Number(expense.amount);
  });

  // Process settled splits
  settledSplits.forEach((split) => {
    const key = getDateKey(split.date);
    if (!dateTotals[key]) {
      dateTotals[key] = 0;
    }
    dateTotals[key] += Number(split.amount);
  });

  const data = Object.entries(dateTotals).map(([date, amount]) => ({
    date,
    amount,
  }));

  return { data, error: null };
}

export async function getMonthlyComparison(months: number = 6) {
  const { user, supabase, error } = await getAuthenticatedUser();
  if (error || !user || !supabase) {
    return { data: null, error: error || 'Not authenticated' };
  }

  const now = new Date();

  // Calculate date range for single query
  const startDate = new Date(now.getFullYear(), now.getMonth() - months + 1, 1);
  const endDate = new Date(now.getFullYear(), now.getMonth() + 1, 0);
  const startDateStr = startDate.toISOString().split('T')[0];
  const endDateStr = endDate.toISOString().split('T')[0];

  // Fetch regular expenses and settled splits in parallel
  const [expensesResult, splitsResult] = await Promise.all([
    supabase
      .from('expenses')
      .select('amount, date')
      .eq('user_id', user.id)
      .gte('date', startDateStr)
      .lte('date', endDateStr),
    // Settled expense splits with category
    supabase
      .from('expense_splits')
      .select('amount, shared_expense:shared_expenses!inner(date)')
      .eq('user_id', user.id)
      .eq('is_settled', true)
      .not('category_id', 'is', null)
  ]);

  const expenses = expensesResult.data || [];

  // Filter splits by date and extract date
  const settledSplits = (splitsResult.data || [])
    .map((split) => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const sharedExpense = split.shared_expense as any;
      return { amount: split.amount, date: sharedExpense?.date };
    })
    .filter((split) => split.date && split.date >= startDateStr && split.date <= endDateStr);

  // Group expenses by month in JavaScript
  const monthlyTotals: Record<string, number> = {};

  // Initialize all months with 0
  for (let i = months - 1; i >= 0; i--) {
    const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
    monthlyTotals[key] = 0;
  }

  // Sum regular expenses by month
  expenses.forEach((expense) => {
    const expenseDate = new Date(expense.date);
    const key = `${expenseDate.getFullYear()}-${String(expenseDate.getMonth() + 1).padStart(2, '0')}`;
    if (monthlyTotals[key] !== undefined) {
      monthlyTotals[key] += Number(expense.amount);
    }
  });

  // Sum settled splits by month
  settledSplits.forEach((split) => {
    const splitDate = new Date(split.date);
    const key = `${splitDate.getFullYear()}-${String(splitDate.getMonth() + 1).padStart(2, '0')}`;
    if (monthlyTotals[key] !== undefined) {
      monthlyTotals[key] += Number(split.amount);
    }
  });

  // Convert to array format
  const data = Object.entries(monthlyTotals).map(([key, amount]) => {
    const [year, month] = key.split('-');
    const date = new Date(parseInt(year), parseInt(month) - 1, 1);
    return {
      month: date.toLocaleDateString('en-US', { month: 'short', year: 'numeric' }),
      amount,
    };
  });

  return { data, error: null };
}

export async function getTopExpenses(startDate: string, endDate: string, limit: number = 10) {
  const { user, supabase, error } = await getAuthenticatedUser();
  if (error || !user || !supabase) {
    return { data: null, error: error || 'Not authenticated' };
  }

  const { data: expenses } = await supabase
    .from('expenses')
    .select('id, amount, description, date, category:categories(name, icon, color)')
    .eq('user_id', user.id)
    .gte('date', startDate)
    .lte('date', endDate)
    .order('amount', { ascending: false })
    .limit(limit);

  return { data: expenses, error: null };
}

export async function exportExpenses(startDate: string, endDate: string, format: 'csv' | 'json' = 'csv') {
  const { user, supabase, error } = await getAuthenticatedUser();
  if (error || !user || !supabase) {
    return { data: null, error: error || 'Not authenticated' };
  }

  const { data: expenses } = await supabase
    .from('expenses')
    .select('amount, description, date, notes, tags, category:categories(name)')
    .eq('user_id', user.id)
    .gte('date', startDate)
    .lte('date', endDate)
    .order('date', { ascending: false });

  if (!expenses) return { data: null, error: 'No expenses found' };

  if (format === 'json') {
    return { data: JSON.stringify(expenses, null, 2), error: null };
  }

  // CSV format
  const headers = ['Date', 'Description', 'Category', 'Amount', 'Notes', 'Tags'];
  const rows = expenses.map((e) => {
    const category = e.category as unknown as { name: string } | null;
    return [
      e.date,
      e.description || '',
      category?.name || 'Uncategorized',
      e.amount.toString(),
      e.notes || '',
      e.tags?.join(', ') || '',
    ].map(field => `"${field.replace(/"/g, '""')}"`).join(',');
  });

  const csv = [headers.join(','), ...rows].join('\n');
  return { data: csv, error: null };
}
