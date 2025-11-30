'use server';

import { getAuthenticatedUser } from '@/lib/auth-helpers';

export async function getSpendingByCategory(startDate: string, endDate: string) {
  const { user, supabase, error } = await getAuthenticatedUser();
  if (error || !user || !supabase) {
    return { data: null, error: error || 'Not authenticated' };
  }

  // Get all expenses in the date range
  const { data: expenses } = await supabase
    .from('expenses')
    .select('amount, category:categories(name, color)')
    .eq('user_id', user.id)
    .gte('date', startDate)
    .lte('date', endDate);

  if (!expenses) return { data: [], error: null };

  // Group by category
  const categoryTotals: Record<string, { name: string; value: number; color: string }> = {};

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

  const data = Object.values(categoryTotals).sort((a, b) => b.value - a.value);
  return { data, error: null };
}

export async function getSpendingTrend(startDate: string, endDate: string, groupBy: 'day' | 'week' | 'month' = 'day') {
  const { user, supabase, error } = await getAuthenticatedUser();
  if (error || !user || !supabase) {
    return { data: null, error: error || 'Not authenticated' };
  }

  const { data: expenses } = await supabase
    .from('expenses')
    .select('amount, date')
    .eq('user_id', user.id)
    .gte('date', startDate)
    .lte('date', endDate)
    .order('date', { ascending: true });

  if (!expenses) return { data: [], error: null };

  // Group by date
  const dateTotals: Record<string, number> = {};

  expenses.forEach((expense) => {
    let key: string;
    const date = new Date(expense.date);

    switch (groupBy) {
      case 'week': {
        const weekStart = new Date(date);
        weekStart.setDate(date.getDate() - date.getDay());
        key = weekStart.toISOString().split('T')[0];
        break;
      }
      case 'month':
        key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
        break;
      default:
        key = expense.date;
    }

    if (!dateTotals[key]) {
      dateTotals[key] = 0;
    }
    dateTotals[key] += Number(expense.amount);
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

  // Fetch all expenses in the date range with a single query
  const { data: expenses } = await supabase
    .from('expenses')
    .select('amount, date')
    .eq('user_id', user.id)
    .gte('date', startDate.toISOString().split('T')[0])
    .lte('date', endDate.toISOString().split('T')[0]);

  // Group expenses by month in JavaScript
  const monthlyTotals: Record<string, number> = {};

  // Initialize all months with 0
  for (let i = months - 1; i >= 0; i--) {
    const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
    monthlyTotals[key] = 0;
  }

  // Sum expenses by month
  (expenses || []).forEach((expense) => {
    const expenseDate = new Date(expense.date);
    const key = `${expenseDate.getFullYear()}-${String(expenseDate.getMonth() + 1).padStart(2, '0')}`;
    if (monthlyTotals[key] !== undefined) {
      monthlyTotals[key] += Number(expense.amount);
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
