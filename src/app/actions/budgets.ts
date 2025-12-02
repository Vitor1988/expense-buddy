'use server';

import { getAuthenticatedUser } from '@/lib/auth-helpers';
import { revalidatePath } from 'next/cache';

export async function getBudgets() {
  const { user, supabase, error } = await getAuthenticatedUser();
  if (error || !user || !supabase) {
    return { data: null, error: error || 'Not authenticated' };
  }

  const { data, error: dbError } = await supabase
    .from('budgets')
    .select('*, category:categories(*)')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false });

  return { data, error: dbError?.message };
}

export async function createBudget(formData: FormData) {
  const { user, supabase, error } = await getAuthenticatedUser();
  if (error || !user || !supabase) {
    return { error: error || 'Not authenticated' };
  }

  const amount = parseFloat(formData.get('amount') as string);
  const category_id = formData.get('category_id') as string;
  const period = formData.get('period') as 'weekly' | 'monthly' | 'yearly';

  if (!amount || isNaN(amount) || amount <= 0) {
    return { error: 'Please enter a valid amount' };
  }

  if (!period) {
    return { error: 'Please select a period' };
  }

  // Check if budget already exists for this category and period
  const { data: existingBudget } = await supabase
    .from('budgets')
    .select('id')
    .eq('user_id', user.id)
    .eq('category_id', category_id || null)
    .eq('period', period)
    .single();

  if (existingBudget) {
    return { error: 'A budget already exists for this category and period' };
  }

  const { error: dbError } = await supabase.from('budgets').insert({
    user_id: user.id,
    amount,
    category_id: category_id || null,
    period,
  });

  if (dbError) {
    return { error: dbError.message };
  }

  revalidatePath('/budgets');
  revalidatePath('/dashboard');
  return { success: true };
}

export async function updateBudget(id: string, formData: FormData) {
  const { user, supabase, error } = await getAuthenticatedUser();
  if (error || !user || !supabase) {
    return { error: error || 'Not authenticated' };
  }

  const amount = parseFloat(formData.get('amount') as string);
  const category_id = formData.get('category_id') as string;
  const period = formData.get('period') as 'weekly' | 'monthly' | 'yearly';

  if (!amount || isNaN(amount) || amount <= 0) {
    return { error: 'Please enter a valid amount' };
  }

  const { error: dbError } = await supabase
    .from('budgets')
    .update({
      amount,
      category_id: category_id || null,
      period,
    })
    .eq('id', id)
    .eq('user_id', user.id);

  if (dbError) {
    return { error: dbError.message };
  }

  revalidatePath('/budgets');
  revalidatePath('/dashboard');
  return { success: true };
}

export async function deleteBudget(id: string) {
  const { user, supabase, error } = await getAuthenticatedUser();
  if (error || !user || !supabase) {
    return { error: error || 'Not authenticated' };
  }

  const { error: dbError } = await supabase
    .from('budgets')
    .delete()
    .eq('id', id)
    .eq('user_id', user.id);

  if (dbError) {
    return { error: dbError.message };
  }

  revalidatePath('/budgets');
  revalidatePath('/dashboard');
  return { success: true };
}

export async function getBudgetProgress() {
  const { user, supabase, error } = await getAuthenticatedUser();
  if (error || !user || !supabase) {
    return { data: null, error: error || 'Not authenticated' };
  }

  // Get all budgets with categories
  const { data: budgets } = await supabase
    .from('budgets')
    .select('*, category:categories(*)')
    .eq('user_id', user.id);

  if (!budgets || budgets.length === 0) return { data: [], error: null };

  // Calculate date ranges for each period type
  const now = new Date();
  const dateRanges = {
    weekly: (() => {
      const start = new Date(now);
      start.setDate(now.getDate() - now.getDay());
      start.setHours(0, 0, 0, 0);
      const end = new Date(start);
      end.setDate(start.getDate() + 6);
      return { start: start.toISOString().split('T')[0], end: end.toISOString().split('T')[0] };
    })(),
    monthly: {
      start: new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0],
      end: new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().split('T')[0],
    },
    yearly: {
      start: new Date(now.getFullYear(), 0, 1).toISOString().split('T')[0],
      end: new Date(now.getFullYear(), 11, 31).toISOString().split('T')[0],
    },
  };

  // Find the widest date range needed (yearly is always widest)
  const hasYearly = budgets.some(b => b.period === 'yearly');
  const earliestStart = hasYearly ? dateRanges.yearly.start : dateRanges.monthly.start;

  // Fetch ALL expenses in a single query
  const { data: allExpenses } = await supabase
    .from('expenses')
    .select('amount, category_id, date')
    .eq('user_id', user.id)
    .gte('date', earliestStart)
    .lte('date', dateRanges.yearly.end);

  // Process in memory to calculate spending per budget
  const budgetProgress = budgets.map((budget) => {
    const range = dateRanges[budget.period as keyof typeof dateRanges];

    const spent = (allExpenses || [])
      .filter(e => {
        const inDateRange = e.date >= range.start && e.date <= range.end;
        const matchesCategory = budget.category_id ? e.category_id === budget.category_id : true;
        return inDateRange && matchesCategory;
      })
      .reduce((sum, e) => sum + Number(e.amount), 0);

    return {
      ...budget,
      spent,
      percentage: (spent / budget.amount) * 100,
      remaining: Math.max(0, budget.amount - spent),
    };
  });

  return { data: budgetProgress, error: null };
}
