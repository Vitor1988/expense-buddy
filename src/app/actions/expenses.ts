'use server';

import { getAuthenticatedUser } from '@/lib/auth-helpers';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { formatMonthYear, getMonthDateRange, getPastMonthKeys } from '@/lib/utils';
import type { MonthlyExpenseData, CategoryBreakdown, Expense, UnifiedExpense, SplitMethod, SharedExpense } from '@/types';
import { calculateSplits, type SplitInput } from '@/lib/split-calculator';

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

// Sort options for expenses
const SORT_OPTIONS: Record<string, { column: string; ascending: boolean }> = {
  date_desc: { column: 'date', ascending: false },
  date_asc: { column: 'date', ascending: true },
  amount_desc: { column: 'amount', ascending: false },
  amount_asc: { column: 'amount', ascending: true },
};

export async function getExpensesPaginated(filters?: {
  startDate?: string;
  endDate?: string;
  categoryId?: string;
  search?: string;
  minAmount?: number;
  maxAmount?: number;
  sort?: string;
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

  // Get sort configuration (default: date descending)
  const sortConfig = SORT_OPTIONS[filters?.sort || 'date_desc'] || SORT_OPTIONS.date_desc;

  // Build base query for counting
  let countQuery = supabase
    .from('expenses')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', user.id);

  // Build data query with sorting
  let dataQuery = supabase
    .from('expenses')
    .select('*, category:categories(*)')
    .eq('user_id', user.id)
    .order(sortConfig.column, { ascending: sortConfig.ascending })
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

  // Amount range filters
  if (filters?.minAmount !== undefined && filters.minAmount > 0) {
    countQuery = countQuery.gte('amount', filters.minAmount);
    dataQuery = dataQuery.gte('amount', filters.minAmount);
  }

  if (filters?.maxAmount !== undefined && filters.maxAmount > 0) {
    countQuery = countQuery.lte('amount', filters.maxAmount);
    dataQuery = dataQuery.lte('amount', filters.maxAmount);
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

  // Fetch all regular expenses for the date range
  const [expensesResult, sharedResult, owedResult] = await Promise.all([
    supabase
      .from('expenses')
      .select('*, category:categories(*)')
      .eq('user_id', user.id)
      .gte('date', startDate)
      .order('date', { ascending: false }),
    // Fetch inline shared expenses where user is payer (group_id is null)
    supabase
      .from('shared_expenses')
      .select(`
        *,
        splits:expense_splits(
          user_id,
          amount,
          is_settled,
          contact:contacts(name)
        )
      `)
      .is('group_id', null)
      .eq('paid_by', user.id)
      .gte('date', startDate)
      .order('date', { ascending: false }),
    // Fetch inline splits where user owes money (has split but didn't pay)
    supabase
      .from('expense_splits')
      .select(`
        id,
        user_id,
        amount,
        is_settled,
        category_id,
        category:categories(id, name, color, icon),
        shared_expense:shared_expenses!inner(
          id, amount, description, category, date, paid_by,
          payer:profiles!paid_by(id, full_name)
        )
      `)
      .is('shared_expense.group_id', null)
      .eq('user_id', user.id)
      .neq('shared_expense.paid_by', user.id)
      .is('dismissed_at', null)
      .gte('shared_expense.date', startDate),
  ]);

  if (expensesResult.error) {
    return { data: null, error: expensesResult.error.message };
  }

  const expenses = expensesResult.data;

  // Transform shared expenses to Expense-like format
  const sharedAsExpenses = (sharedResult.data || []).map((se) => {
    // Find user's own split to get their share
    const userSplit = se.splits?.find((s: { user_id: string | null }) => s.user_id === user.id);
    const otherSplits = se.splits?.filter((s: { user_id: string | null }) => s.user_id !== user.id) || [];

    // Separate participants by settlement status
    const pendingParticipants = otherSplits
      .filter((s: { is_settled: boolean }) => !s.is_settled)
      .map((s: { contact: { name: string } | null }) => s.contact?.name || 'Unknown');
    const settledParticipants = otherSplits
      .filter((s: { is_settled: boolean }) => s.is_settled)
      .map((s: { contact: { name: string } | null }) => s.contact?.name || 'Unknown');

    const participantNames = otherSplits
      .map((s: { contact: { name: string } | null }) => s.contact?.name || 'Unknown')
      .join(', ');

    return {
      id: se.id,
      user_id: user.id,
      category_id: null,
      amount: userSplit?.amount || se.amount,
      description: se.description ? `${se.description} (split with ${participantNames})` : `Split with ${participantNames}`,
      notes: se.notes,
      date: se.date,
      receipt_url: se.receipt_url,
      tags: [],
      recurring_id: null,
      created_at: se.created_at,
      updated_at: se.created_at,
      // Category based on shared_expense.category field or default
      category: se.category
        ? { id: 'shared', name: se.category, color: '#10b981', icon: '👥', is_default: false, user_id: user.id, created_at: '' }
        : { id: 'shared', name: 'Shared', color: '#10b981', icon: '👥', is_default: false, user_id: user.id, created_at: '' },
      // Add settlement status for payer view
      pendingParticipants,
      settledParticipants,
      isSharedPayer: true,
    };
  }) as Expense[];

  // Transform owed splits (where user owes money) to Expense-like format
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const owedAsExpenses = (owedResult.data || []).map((split: any) => {
    const se = split.shared_expense;
    const payerData = Array.isArray(se.payer) ? se.payer[0] : se.payer;
    const payerName = payerData?.full_name || 'Unknown';
    const isSettled = split.is_settled;

    // Use split's category if settled and has one, otherwise use original category
    const splitCategory = split.category as { id: string; name: string; color: string | null; icon: string | null } | null;
    const hasUserCategory = isSettled && splitCategory;

    // Build category object
    let categoryObj;
    if (hasUserCategory) {
      // Use user's chosen category when settling
      categoryObj = {
        id: splitCategory.id,
        name: splitCategory.name,
        color: splitCategory.color || '#10b981',
        icon: splitCategory.icon || '✓',
        is_default: false,
        user_id: user.id,
        created_at: '',
      };
    } else if (isSettled) {
      // Settled but no user category (legacy data)
      categoryObj = { id: 'settled', name: se.category || 'Shared', color: '#10b981', icon: '✓', is_default: false, user_id: user.id, created_at: '' };
    } else if (se.category) {
      // Not settled, has original category
      categoryObj = { id: 'owed', name: se.category, color: '#f59e0b', icon: '💸', is_default: false, user_id: user.id, created_at: '' };
    } else {
      // Not settled, no category
      categoryObj = { id: 'owed', name: 'Owed', color: '#f59e0b', icon: '💸', is_default: false, user_id: user.id, created_at: '' };
    }

    // If settled, show as normal expense; if not settled, show "You owe" styling
    return {
      id: se.id,
      user_id: user.id,
      category_id: split.category_id || null,
      amount: split.amount,
      description: isSettled
        ? (se.description || `Paid to ${payerName}`)
        : (se.description ? `${se.description} (You owe ${payerName})` : `You owe ${payerName}`),
      notes: null,
      date: se.date,
      receipt_url: null,
      tags: [],
      recurring_id: null,
      created_at: se.date,
      updated_at: se.date,
      category: categoryObj,
      // Include split data for settling
      splitId: split.id,
      isSettled: isSettled,
      owedTo: payerName,
    };
  }) as Expense[];

  // Combine and sort by date
  const allExpenses = [...(expenses || []), ...sharedAsExpenses, ...owedAsExpenses].sort(
    (a, b) => b.date.localeCompare(a.date)
  );

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

    // Filter expenses for this month (including shared expenses)
    const monthExpenses = allExpenses.filter((exp) => {
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

// ============================================
// UNIFIED EXPENSES (regular + inline shared)
// ============================================

export async function getUnifiedExpenses(filters?: {
  startDate?: string;
  endDate?: string;
  categoryId?: string;
  search?: string;
  minAmount?: number;
  maxAmount?: number;
  sort?: string;
  page?: number;
  limit?: number;
}): Promise<{
  data: UnifiedExpense[] | null;
  total: number;
  page: number;
  limit: number;
  totalPages: number;
  error?: string;
}> {
  const { user, supabase, error } = await getAuthenticatedUser();
  if (error || !user || !supabase) {
    return { data: null, total: 0, page: 1, limit: 20, totalPages: 0, error: error || 'Not authenticated' };
  }

  const page = filters?.page || 1;
  const limit = filters?.limit || 20;
  const sortConfig = SORT_OPTIONS[filters?.sort || 'date_desc'] || SORT_OPTIONS.date_desc;

  // Build regular expenses query
  let expensesQuery = supabase
    .from('expenses')
    .select('*, category:categories(*)')
    .eq('user_id', user.id);

  // Build inline shared expenses query (where group_id is null and user is payer)
  let sharedPayerQuery = supabase
    .from('shared_expenses')
    .select(`
      *,
      payer:profiles!paid_by(id, full_name),
      splits:expense_splits(
        id,
        user_id,
        contact_id,
        amount,
        is_settled,
        profile:profiles(id, full_name),
        contact:contacts(id, name)
      )
    `)
    .is('group_id', null)
    .eq('paid_by', user.id);

  // Build query for expenses where user owes money (has a split)
  let sharedOwedQuery = supabase
    .from('expense_splits')
    .select(`
      id,
      user_id,
      amount,
      is_settled,
      category_id,
      category:categories(id, name, color, icon),
      shared_expense:shared_expenses!inner(
        id,
        amount,
        description,
        category,
        date,
        split_method,
        paid_by,
        payer:profiles!paid_by(id, full_name)
      )
    `)
    .is('shared_expense.group_id', null)
    .eq('user_id', user.id)
    .neq('shared_expense.paid_by', user.id)
    .is('dismissed_at', null);  // Exclude dismissed expenses

  // Apply date filters
  if (filters?.startDate) {
    expensesQuery = expensesQuery.gte('date', filters.startDate);
    sharedPayerQuery = sharedPayerQuery.gte('date', filters.startDate);
    sharedOwedQuery = sharedOwedQuery.gte('shared_expense.date', filters.startDate);
  }
  if (filters?.endDate) {
    expensesQuery = expensesQuery.lte('date', filters.endDate);
    sharedPayerQuery = sharedPayerQuery.lte('date', filters.endDate);
    sharedOwedQuery = sharedOwedQuery.lte('shared_expense.date', filters.endDate);
  }

  // Apply category filter
  if (filters?.categoryId) {
    expensesQuery = expensesQuery.eq('category_id', filters.categoryId);
    // For owed expenses: only show settled splits with matching category
    sharedOwedQuery = sharedOwedQuery
      .eq('is_settled', true)
      .eq('category_id', filters.categoryId);
    // Note: sharedPayerQuery uses string category (not category_id), so we exclude them
    // They will be filtered out in the transform step
  }

  // Apply search filter
  if (filters?.search) {
    expensesQuery = expensesQuery.ilike('description', `%${filters.search}%`);
    sharedPayerQuery = sharedPayerQuery.ilike('description', `%${filters.search}%`);
    sharedOwedQuery = sharedOwedQuery.ilike('shared_expense.description', `%${filters.search}%`);
  }

  // Execute all queries in parallel
  const [expensesResult, sharedPayerResult, sharedOwedResult] = await Promise.all([
    expensesQuery,
    sharedPayerQuery,
    sharedOwedQuery,
  ]);

  if (expensesResult.error) {
    return { data: null, total: 0, page, limit, totalPages: 0, error: expensesResult.error.message };
  }

  // Transform regular expenses to unified format
  const regularExpenses: UnifiedExpense[] = (expensesResult.data || []).map((exp) => ({
    type: 'expense' as const,
    id: exp.id,
    amount: exp.amount,
    description: exp.description,
    date: exp.date,
    category_id: exp.category_id,
    category: exp.category,
    expense: exp,
  }));

  // Transform shared expenses where user is payer
  const sharedPayerExpenses: UnifiedExpense[] = (sharedPayerResult.data || []).map((se) => {
    // Find user's own split to get their share
    const userSplit = se.splits?.find((s: { user_id: string | null }) => s.user_id === user.id);
    // Other splits are those not belonging to the current user
    const otherSplits = se.splits?.filter((s: { user_id: string | null }) => s.user_id !== user.id) || [];

    return {
      type: 'shared' as const,
      id: se.id,
      amount: userSplit?.amount || se.amount,  // User's share (Via A)
      original_amount: se.amount,
      description: se.description,
      date: se.date,
      category_id: null,
      split_method: se.split_method,
      participants: otherSplits.map((s: {
        profile: { full_name: string | null } | null;
        contact: { name: string } | null;
        amount: number;
        is_settled: boolean;
      }) => ({
        name: s.contact?.name || s.profile?.full_name || 'Unknown',
        amount: s.amount,
        settled: s.is_settled,
      })),
      shared_expense: se,
      // Indicate user is the payer
      userRole: 'payer' as const,
    };
  });

  // Transform shared expenses where user owes money
  const sharedOwedExpenses: UnifiedExpense[] = (sharedOwedResult.data || []).map((split) => {
    // Handle the nested shared_expense object
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const seRaw = split.shared_expense as any;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const splitCategory = (split as any).category as { id: string; name: string; color: string | null; icon: string | null } | null;
    // Payer may be returned as array or single object
    const payerData = Array.isArray(seRaw.payer) ? seRaw.payer[0] : seRaw.payer;
    const payerName = payerData?.full_name || 'Unknown';

    return {
      type: 'shared' as const,
      id: seRaw.id,
      amount: split.amount,  // What user owes
      original_amount: seRaw.amount,
      description: seRaw.description,
      date: seRaw.date,
      category_id: split.category_id || null,
      category: splitCategory || undefined,  // Use split's category if available
      split_method: seRaw.split_method as SplitMethod,
      participants: [{
        name: payerName,
        amount: split.amount,
        settled: split.is_settled,
        profile_id: seRaw.paid_by,
      }],
      shared_expense: seRaw as unknown as SharedExpense,
      // Indicate user owes money
      userRole: 'debtor' as const,
      splitId: split.id,  // Need this for settlement
      isSettled: split.is_settled,
      owedTo: payerName,
    };
  });

  // Combine and sort
  // Exclude sharedPayerExpenses when category filter is applied (they use string category, not category_id)
  const includeSharedPayer = !filters?.categoryId;
  let allExpenses = [
    ...regularExpenses,
    ...(includeSharedPayer ? sharedPayerExpenses : []),
    ...sharedOwedExpenses
  ];

  // Apply amount filters (after combining)
  if (filters?.minAmount !== undefined && filters.minAmount > 0) {
    allExpenses = allExpenses.filter(e => e.amount >= filters.minAmount!);
  }
  if (filters?.maxAmount !== undefined && filters.maxAmount > 0) {
    allExpenses = allExpenses.filter(e => e.amount <= filters.maxAmount!);
  }

  // Sort combined results
  allExpenses.sort((a, b) => {
    if (sortConfig.column === 'date') {
      return sortConfig.ascending
        ? a.date.localeCompare(b.date)
        : b.date.localeCompare(a.date);
    } else if (sortConfig.column === 'amount') {
      return sortConfig.ascending
        ? a.amount - b.amount
        : b.amount - a.amount;
    }
    return 0;
  });

  const total = allExpenses.length;
  const totalPages = Math.ceil(total / limit);

  // Apply pagination
  const offset = (page - 1) * limit;
  const paginatedExpenses = allExpenses.slice(offset, offset + limit);

  return {
    data: paginatedExpenses,
    total,
    page,
    limit,
    totalPages,
  };
}

// ============================================
// CREATE INLINE SHARED EXPENSE
// ============================================

export async function createInlineSharedExpense(formData: FormData) {
  const { user, supabase, error } = await getAuthenticatedUser();
  if (error || !user || !supabase) {
    return { error: error || 'Not authenticated' };
  }

  const amount = parseFloat(formData.get('amount') as string);
  const description = formData.get('description') as string;
  const date = formData.get('date') as string;
  const notes = formData.get('notes') as string;
  const receipt_url = formData.get('receipt_url') as string;
  const split_method = (formData.get('split_method') as SplitMethod) || 'equal';
  const category_id = formData.get('category_id') as string;

  // Parse participants (contact IDs)
  const participantsJson = formData.get('participants') as string;
  const participantIds: string[] = participantsJson ? JSON.parse(participantsJson) : [];

  // Parse split values (for exact/percentage/shares methods)
  const splitValuesJson = formData.get('split_values') as string;
  const splitValues: Record<string, number> = splitValuesJson ? JSON.parse(splitValuesJson) : {};

  if (!amount || isNaN(amount) || amount <= 0) {
    return { error: 'Please enter a valid amount' };
  }

  if (participantIds.length === 0) {
    return { error: 'Please select at least one person to split with' };
  }

  // Get category name if category_id is provided
  let categoryName: string | null = null;
  if (category_id) {
    const { data: category } = await supabase
      .from('categories')
      .select('name')
      .eq('id', category_id)
      .single();
    categoryName = category?.name || null;
  }

  // Get approved contacts to resolve profile_ids
  const { data: contacts } = await supabase
    .from('contacts')
    .select('id, name, profile_id, is_approved')
    .in('id', participantIds)
    .eq('is_approved', true);

  if (!contacts || contacts.length === 0) {
    return { error: 'Selected contacts not found or not approved' };
  }

  // Ensure all selected contacts are approved
  if (contacts.length !== participantIds.length) {
    return { error: 'Some selected contacts are not approved. Please add them via Contacts page first.' };
  }

  // Build split participants (including current user)
  // Use 'self' for current user and contact IDs for contacts
  const allParticipantIds = [
    'self',
    ...contacts.map(c => c.id),  // Use contact IDs as participant IDs
  ];

  // Map contact ID to contact data for later lookup
  const contactMap = new Map(contacts.map(c => [c.id, c]));

  // Calculate splits
  let splitInputs: SplitInput[] | undefined;

  if (split_method !== 'equal') {
    splitInputs = [
      { userId: 'self', value: splitValues['self'] || 0 },
      ...contacts.map(c => ({
        userId: c.id,
        value: splitValues[c.id] || 0,
      })),
    ];
  }

  const splitResult = calculateSplits(
    split_method,
    amount,
    allParticipantIds,
    splitInputs
  );

  if (splitResult.error) {
    return { error: splitResult.error };
  }

  // Create shared expense (with group_id = null for inline)
  const { data: sharedExpense, error: expenseError } = await supabase
    .from('shared_expenses')
    .insert({
      group_id: null,  // Inline split - no group
      paid_by: user.id,
      amount,
      description: description || null,
      category: categoryName,  // Store category name
      date: date || new Date().toISOString().split('T')[0],
      split_method,
      notes: notes || null,
      receipt_url: receipt_url || null,
    })
    .select()
    .single();

  if (expenseError) {
    return { error: expenseError.message };
  }

  // Create expense splits
  // Map participant IDs back to user_id or contact_id
  const splitsToInsert = splitResult.splits.map(split => {
    if (split.userId === 'self') {
      // Current user - use user_id
      return {
        shared_expense_id: sharedExpense.id,
        user_id: user.id,
        contact_id: null,
        amount: split.amount,
        shares: split.shares,
        percentage: split.percentage,
        is_settled: true,  // Payer's split is already "settled"
      };
    } else {
      // Contact - check if they have a profile_id
      const contact = contactMap.get(split.userId);
      if (contact?.profile_id) {
        // Contact with profile - use user_id
        return {
          shared_expense_id: sharedExpense.id,
          user_id: contact.profile_id,
          contact_id: contact.id,  // Also store contact_id for reference
          amount: split.amount,
          shares: split.shares,
          percentage: split.percentage,
          is_settled: false,
        };
      } else {
        // Manual contact without profile - use contact_id only
        return {
          shared_expense_id: sharedExpense.id,
          user_id: null,
          contact_id: contact?.id || split.userId,
          amount: split.amount,
          shares: split.shares,
          percentage: split.percentage,
          is_settled: false,
        };
      }
    }
  });

  const { error: splitsError } = await supabase
    .from('expense_splits')
    .insert(splitsToInsert);

  if (splitsError) {
    // Rollback shared expense
    await supabase.from('shared_expenses').delete().eq('id', sharedExpense.id);
    return { error: splitsError.message };
  }

  revalidatePath('/dashboard');
  revalidatePath('/expenses');
  redirect('/expenses');
}

// ============================================
// DELETE INLINE SHARED EXPENSE
// ============================================

export async function deleteInlineSharedExpense(id: string) {
  const { user, supabase, error } = await getAuthenticatedUser();
  if (error || !user || !supabase) {
    return { error: error || 'Not authenticated' };
  }

  // Verify ownership and that it's an inline expense (no group)
  const { data: expense } = await supabase
    .from('shared_expenses')
    .select('id, paid_by, group_id')
    .eq('id', id)
    .single();

  if (!expense) {
    return { error: 'Expense not found' };
  }

  if (expense.paid_by !== user.id) {
    return { error: 'You can only delete your own expenses' };
  }

  if (expense.group_id !== null) {
    return { error: 'This expense belongs to a group. Delete it from the group page.' };
  }

  // Delete splits first (cascade should handle this, but being explicit)
  await supabase
    .from('expense_splits')
    .delete()
    .eq('shared_expense_id', id);

  // Delete the shared expense
  const { error: dbError } = await supabase
    .from('shared_expenses')
    .delete()
    .eq('id', id);

  if (dbError) {
    return { error: dbError.message };
  }

  revalidatePath('/dashboard');
  revalidatePath('/expenses');
  return { success: true };
}

// ============================================
// SETTLE EXPENSE SPLIT
// ============================================

export async function settleExpenseSplit(splitId: string, categoryId: string) {
  const { user, supabase, error } = await getAuthenticatedUser();
  if (error || !user || !supabase) {
    return { error: error || 'Not authenticated' };
  }

  // Validate category is provided (required)
  if (!categoryId) {
    return { error: 'Category is required' };
  }

  // Validate category belongs to user
  const { data: category, error: categoryError } = await supabase
    .from('categories')
    .select('id')
    .eq('id', categoryId)
    .eq('user_id', user.id)
    .single();

  if (categoryError || !category) {
    return { error: 'Invalid category' };
  }

  // Get the split to verify ownership
  const { data: split, error: splitError } = await supabase
    .from('expense_splits')
    .select('id, user_id, is_settled, shared_expense:shared_expenses!inner(paid_by)')
    .eq('id', splitId)
    .single();

  if (splitError || !split) {
    return { error: 'Split not found' };
  }

  // User can only settle their own split (where they owe money)
  if (split.user_id !== user.id) {
    return { error: 'You can only settle your own debts' };
  }

  // Can't settle if already settled
  if (split.is_settled) {
    return { error: 'This split is already settled' };
  }

  // Update the split with category
  const { error: updateError } = await supabase
    .from('expense_splits')
    .update({
      is_settled: true,
      settled_at: new Date().toISOString(),
      category_id: categoryId,
    })
    .eq('id', splitId);

  if (updateError) {
    return { error: updateError.message };
  }

  revalidatePath('/dashboard');
  revalidatePath('/expenses');
  revalidatePath('/reports');
  return { success: true };
}

// ============================================
// DISMISS EXPENSE SPLIT (hide from debtor's view)
// ============================================

export async function dismissExpenseSplit(splitId: string) {
  const { user, supabase, error } = await getAuthenticatedUser();
  if (error || !user || !supabase) {
    return { error: error || 'Not authenticated' };
  }

  // Get the split to verify ownership
  const { data: split, error: splitError } = await supabase
    .from('expense_splits')
    .select('id, user_id, is_settled')
    .eq('id', splitId)
    .single();

  if (splitError || !split) {
    return { error: 'Split not found' };
  }

  // User can only dismiss their own split
  if (split.user_id !== user.id) {
    return { error: 'You can only dismiss your own expenses' };
  }

  // Can only dismiss if settled
  if (!split.is_settled) {
    return { error: 'You can only dismiss settled expenses' };
  }

  // Update the split with dismissed timestamp
  const { error: updateError } = await supabase
    .from('expense_splits')
    .update({
      dismissed_at: new Date().toISOString(),
    })
    .eq('id', splitId);

  if (updateError) {
    return { error: updateError.message };
  }

  revalidatePath('/dashboard');
  revalidatePath('/expenses');
  return { success: true };
}
