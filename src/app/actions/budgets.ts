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

  if (!budgets) return { data: [], error: null };

  // Calculate date ranges based on period
  const now = new Date();
  const getDateRange = (period: string) => {
    switch (period) {
      case 'weekly': {
        const start = new Date(now);
        start.setDate(now.getDate() - now.getDay());
        start.setHours(0, 0, 0, 0);
        const end = new Date(start);
        end.setDate(start.getDate() + 6);
        return { start, end };
      }
      case 'monthly': {
        const start = new Date(now.getFullYear(), now.getMonth(), 1);
        const end = new Date(now.getFullYear(), now.getMonth() + 1, 0);
        return { start, end };
      }
      case 'yearly': {
        const start = new Date(now.getFullYear(), 0, 1);
        const end = new Date(now.getFullYear(), 11, 31);
        return { start, end };
      }
      default:
        return { start: now, end: now };
    }
  };

  // Get spending for each budget
  const budgetProgress = await Promise.all(
    budgets.map(async (budget) => {
      const { start, end } = getDateRange(budget.period);

      let query = supabase
        .from('expenses')
        .select('amount')
        .eq('user_id', user.id)
        .gte('date', start.toISOString().split('T')[0])
        .lte('date', end.toISOString().split('T')[0]);

      if (budget.category_id) {
        query = query.eq('category_id', budget.category_id);
      }

      const { data: expenses } = await query;
      const spent = expenses?.reduce((sum, e) => sum + Number(e.amount), 0) || 0;

      return {
        ...budget,
        spent,
        percentage: (spent / budget.amount) * 100,
        remaining: Math.max(0, budget.amount - spent),
      };
    })
  );

  return { data: budgetProgress, error: null };
}
