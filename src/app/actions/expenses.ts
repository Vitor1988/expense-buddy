'use server';

import { getAuthenticatedUser } from '@/lib/auth-helpers';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { formatMonthYear, getMonthDateRange, getPastMonthKeys } from '@/lib/utils';
import type { MonthlyExpenseData, CategoryBreakdown, Expense } from '@/types';

export async function createExpense(formData: FormData) {
  const { user, supabase, error } = await getAuthenticatedUser();
  if (error || !user || !supabase) {
    return { error: error || 'Not authenticated' };
  }

  const amount = parseFloat(formData.get('amount') as string);
  const description = formData.get('description') as string;
  const category_id = formData.get('category_id') as string;
  const date = formData.get('date') as string;
  const notes = formData.get('notes') as string;
  const receipt_url = formData.get('receipt_url') as string;
  const tagsString = formData.get('tags') as string;
  const tags = tagsString ? tagsString.split(',').map(t => t.trim()).filter(Boolean) : [];

  if (!amount || isNaN(amount) || amount <= 0) {
    return { error: 'Please enter a valid amount' };
  }

  const { error: dbError } = await supabase.from('expenses').insert({
    user_id: user.id,
    amount,
    description: description || null,
    category_id: category_id || null,
    date: date || new Date().toISOString().split('T')[0],
    notes: notes || null,
    receipt_url: receipt_url || null,
    tags,
  });

  if (dbError) {
    return { error: dbError.message };
  }

  revalidatePath('/dashboard');
  revalidatePath('/expenses');
  redirect('/expenses');
}

export async function updateExpense(id: string, formData: FormData) {
  const { user, supabase, error } = await getAuthenticatedUser();
  if (error || !user || !supabase) {
    return { error: error || 'Not authenticated' };
  }

  const amount = parseFloat(formData.get('amount') as string);
  const description = formData.get('description') as string;
  const category_id = formData.get('category_id') as string;
  const date = formData.get('date') as string;
  const notes = formData.get('notes') as string;
  const receipt_url = formData.get('receipt_url') as string;
  const tagsString = formData.get('tags') as string;
  const tags = tagsString ? tagsString.split(',').map(t => t.trim()).filter(Boolean) : [];

  if (!amount || isNaN(amount) || amount <= 0) {
    return { error: 'Please enter a valid amount' };
  }

  const { error: dbError } = await supabase
    .from('expenses')
    .update({
      amount,
      description: description || null,
      category_id: category_id || null,
      date: date || new Date().toISOString().split('T')[0],
      notes: notes || null,
      receipt_url: receipt_url || null,
      tags,
      updated_at: new Date().toISOString(),
    })
    .eq('id', id)
    .eq('user_id', user.id);

  if (dbError) {
    return { error: dbError.message };
  }

  revalidatePath('/dashboard');
  revalidatePath('/expenses');
  redirect('/expenses');
}

export async function deleteExpense(id: string) {
  const { user, supabase, error } = await getAuthenticatedUser();
  if (error || !user || !supabase) {
    return { error: error || 'Not authenticated' };
  }

  const { error: dbError } = await supabase
    .from('expenses')
    .delete()
    .eq('id', id)
    .eq('user_id', user.id);

  if (dbError) {
    return { error: dbError.message };
  }

  revalidatePath('/dashboard');
  revalidatePath('/expenses');
  return { success: true };
}

export async function getExpenses(filters?: {
  startDate?: string;
  endDate?: string;
  categoryId?: string;
  search?: string;
}) {
  const { user, supabase, error } = await getAuthenticatedUser();
  if (error || !user || !supabase) {
    return { data: null, error: error || 'Not authenticated' };
  }

  let query = supabase
    .from('expenses')
    .select('*, category:categories(*)')
    .eq('user_id', user.id)
    .order('date', { ascending: false });

  if (filters?.startDate) {
    query = query.gte('date', filters.startDate);
  }

  if (filters?.endDate) {
    query = query.lte('date', filters.endDate);
  }

  if (filters?.categoryId) {
    query = query.eq('category_id', filters.categoryId);
  }

  if (filters?.search) {
    query = query.ilike('description', `%${filters.search}%`);
  }

  const { data, error: dbError } = await query;

  return { data, error: dbError?.message };
}

export async function getExpensesPaginated(filters?: {
  startDate?: string;
  endDate?: string;
  categoryId?: string;
  search?: string;
  page?: number;
  limit?: number;
}) {
  const { user, supabase, error } = await getAuthenticatedUser();
  if (error || !user || !supabase) {
    return { data: null, total: 0, error: error || 'Not authenticated' };
  }

  const page = filters?.page || 1;
  const limit = filters?.limit || 20;
  const offset = (page - 1) * limit;

  // Build base query for counting
  let countQuery = supabase
    .from('expenses')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', user.id);

  // Build data query
  let dataQuery = supabase
    .from('expenses')
    .select('*, category:categories(*)')
    .eq('user_id', user.id)
    .order('date', { ascending: false })
    .range(offset, offset + limit - 1);

  // Apply filters to both queries
  if (filters?.startDate) {
    countQuery = countQuery.gte('date', filters.startDate);
    dataQuery = dataQuery.gte('date', filters.startDate);
  }

  if (filters?.endDate) {
    countQuery = countQuery.lte('date', filters.endDate);
    dataQuery = dataQuery.lte('date', filters.endDate);
  }

  if (filters?.categoryId) {
    countQuery = countQuery.eq('category_id', filters.categoryId);
    dataQuery = dataQuery.eq('category_id', filters.categoryId);
  }

  if (filters?.search) {
    countQuery = countQuery.ilike('description', `%${filters.search}%`);
    dataQuery = dataQuery.ilike('description', `%${filters.search}%`);
  }

  // Execute both queries in parallel
  const [countResult, dataResult] = await Promise.all([countQuery, dataQuery]);

  return {
    data: dataResult.data,
    total: countResult.count || 0,
    page,
    limit,
    totalPages: Math.ceil((countResult.count || 0) / limit),
    error: dataResult.error?.message || countResult.error?.message,
  };
}

export async function getExpenseById(id: string) {
  const { user, supabase, error } = await getAuthenticatedUser();
  if (error || !user || !supabase) {
    return { data: null, error: error || 'Not authenticated' };
  }

  const { data, error: dbError } = await supabase
    .from('expenses')
    .select('*, category:categories(*)')
    .eq('id', id)
    .eq('user_id', user.id)
    .single();

  return { data, error: dbError?.message };
}

export async function getExpensesByMonth(monthCount: number = 3): Promise<{
  data: MonthlyExpenseData[] | null;
  error: string | null;
}> {
  const { user, supabase, error } = await getAuthenticatedUser();
  if (error || !user || !supabase) {
    return { data: null, error: error || 'Not authenticated' };
  }

  // Get month keys for the past N months
  const monthKeys = getPastMonthKeys(monthCount);

  // Get date range for all months
  const oldestMonth = monthKeys[monthKeys.length - 1];
  const { start: startDate } = getMonthDateRange(oldestMonth);

  // Fetch all expenses for the date range
  const { data: expenses, error: expensesError } = await supabase
    .from('expenses')
    .select('*, category:categories(*)')
    .eq('user_id', user.id)
    .gte('date', startDate)
    .order('date', { ascending: false });

  if (expensesError) {
    return { data: null, error: expensesError.message };
  }

  // Fetch monthly budgets
  const { data: budgets } = await supabase
    .from('budgets')
    .select('amount')
    .eq('user_id', user.id)
    .eq('period', 'monthly');

  const totalBudget = budgets?.reduce((sum, b) => sum + Number(b.amount), 0) || 0;

  // Group expenses by month
  const monthlyData: MonthlyExpenseData[] = monthKeys.map((monthKey) => {
    const { start, end } = getMonthDateRange(monthKey);

    // Filter expenses for this month
    const monthExpenses = (expenses || []).filter((exp) => {
      return exp.date >= start && exp.date <= end;
    }) as Expense[];

    // Calculate totals
    const totalAmount = monthExpenses.reduce((sum, exp) => sum + Number(exp.amount), 0);
    const budgetPercentage = totalBudget > 0 ? Math.round((totalAmount / totalBudget) * 100) : 0;

    // Calculate category breakdown
    const categoryMap = new Map<string, { amount: number; color: string }>();
    monthExpenses.forEach((exp) => {
      const cat = exp.category as { name: string; color: string | null } | null;
      const catName = cat?.name || 'Uncategorized';
      const catColor = cat?.color || '#6b7280';

      const existing = categoryMap.get(catName) || { amount: 0, color: catColor };
      categoryMap.set(catName, {
        amount: existing.amount + Number(exp.amount),
        color: catColor,
      });
    });

    const categoryBreakdown: CategoryBreakdown[] = Array.from(categoryMap.entries())
      .map(([name, { amount, color }]) => ({
        name,
        amount,
        percentage: totalAmount > 0 ? Math.round((amount / totalAmount) * 100) : 0,
        color,
      }))
      .sort((a, b) => b.amount - a.amount)
      .slice(0, 5); // Top 5 categories

    return {
      month: monthKey,
      monthLabel: formatMonthYear(monthKey),
      totalAmount,
      budgetAmount: totalBudget,
      budgetPercentage,
      expenseCount: monthExpenses.length,
      expenses: monthExpenses,
      categoryBreakdown,
    };
  });

  return { data: monthlyData, error: null };
}

export async function loadMoreMonths(offset: number, count: number = 3): Promise<{
  data: MonthlyExpenseData[] | null;
  error: string | null;
}> {
  const { user, supabase, error } = await getAuthenticatedUser();
  if (error || !user || !supabase) {
    return { data: null, error: error || 'Not authenticated' };
  }

  // Get month keys starting from offset
  const allMonthKeys = getPastMonthKeys(offset + count);
  const monthKeys = allMonthKeys.slice(offset);

  if (monthKeys.length === 0) {
    return { data: [], error: null };
  }

  // Get date range for these months
  const oldestMonth = monthKeys[monthKeys.length - 1];
  const newestMonth = monthKeys[0];
  const { start: startDate } = getMonthDateRange(oldestMonth);
  const { end: endDate } = getMonthDateRange(newestMonth);

  // Fetch expenses for the date range
  const { data: expenses, error: expensesError } = await supabase
    .from('expenses')
    .select('*, category:categories(*)')
    .eq('user_id', user.id)
    .gte('date', startDate)
    .lte('date', endDate)
    .order('date', { ascending: false });

  if (expensesError) {
    return { data: null, error: expensesError.message };
  }

  // Fetch monthly budgets
  const { data: budgets } = await supabase
    .from('budgets')
    .select('amount')
    .eq('user_id', user.id)
    .eq('period', 'monthly');

  const totalBudget = budgets?.reduce((sum, b) => sum + Number(b.amount), 0) || 0;

  // Group expenses by month (same logic as above)
  const monthlyData: MonthlyExpenseData[] = monthKeys.map((monthKey) => {
    const { start, end } = getMonthDateRange(monthKey);

    const monthExpenses = (expenses || []).filter((exp) => {
      return exp.date >= start && exp.date <= end;
    }) as Expense[];

    const totalAmount = monthExpenses.reduce((sum, exp) => sum + Number(exp.amount), 0);
    const budgetPercentage = totalBudget > 0 ? Math.round((totalAmount / totalBudget) * 100) : 0;

    const categoryMap = new Map<string, { amount: number; color: string }>();
    monthExpenses.forEach((exp) => {
      const cat = exp.category as { name: string; color: string | null } | null;
      const catName = cat?.name || 'Uncategorized';
      const catColor = cat?.color || '#6b7280';

      const existing = categoryMap.get(catName) || { amount: 0, color: catColor };
      categoryMap.set(catName, {
        amount: existing.amount + Number(exp.amount),
        color: catColor,
      });
    });

    const categoryBreakdown: CategoryBreakdown[] = Array.from(categoryMap.entries())
      .map(([name, { amount, color }]) => ({
        name,
        amount,
        percentage: totalAmount > 0 ? Math.round((amount / totalAmount) * 100) : 0,
        color,
      }))
      .sort((a, b) => b.amount - a.amount)
      .slice(0, 5);

    return {
      month: monthKey,
      monthLabel: formatMonthYear(monthKey),
      totalAmount,
      budgetAmount: totalBudget,
      budgetPercentage,
      expenseCount: monthExpenses.length,
      expenses: monthExpenses,
      categoryBreakdown,
    };
  });

  return { data: monthlyData, error: null };
}
