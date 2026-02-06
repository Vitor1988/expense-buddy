'use server';

import { getAuthenticatedUser } from '@/lib/auth-helpers';
import { revalidatePath } from 'next/cache';

export async function getRecurringExpenses() {
  const { user, supabase, error } = await getAuthenticatedUser();
  if (error || !user || !supabase) {
    return { data: null, error: error || 'Not authenticated' };
  }

  const { data, error: dbError } = await supabase
    .from('recurring_expenses')
    .select('*, category:categories(*)')
    .eq('user_id', user.id)
    .order('next_date', { ascending: true });

  return { data, error: dbError?.message };
}

export async function createRecurringExpense(formData: FormData) {
  const { user, supabase, error } = await getAuthenticatedUser();
  if (error || !user || !supabase) {
    return { error: error || 'Not authenticated' };
  }

  const amount = parseFloat(formData.get('amount') as string);
  const description = formData.get('description') as string;
  const category_id = formData.get('category_id') as string;
  const frequency = formData.get('frequency') as 'daily' | 'weekly' | 'monthly' | 'yearly';
  const next_date = formData.get('next_date') as string;

  if (!amount || isNaN(amount) || amount <= 0) {
    return { error: 'Please enter a valid amount' };
  }

  if (!frequency) {
    return { error: 'Please select a frequency' };
  }

  if (!next_date) {
    return { error: 'Please select the next date' };
  }

  const { data: inserted, error: dbError } = await supabase
    .from('recurring_expenses')
    .insert({
      user_id: user.id,
      amount,
      description: description || null,
      category_id: category_id || null,
      frequency,
      next_date,
      is_active: true,
    })
    .select()
    .single();

  if (dbError) {
    return { error: dbError.message };
  }

  // If the start date is today or in the past, create the first expense immediately
  const today = new Date().toISOString().split('T')[0];
  if (next_date <= today) {
    // Create the first expense entry
    await supabase.from('expenses').insert({
      user_id: user.id,
      amount,
      description: description || null,
      category_id: category_id || null,
      date: next_date,
      recurring_id: inserted.id,
      tags: [],
    });

    // Calculate and update the next occurrence date
    const nextOccurrence = new Date(next_date);
    switch (frequency) {
      case 'daily':
        nextOccurrence.setDate(nextOccurrence.getDate() + 1);
        break;
      case 'weekly':
        nextOccurrence.setDate(nextOccurrence.getDate() + 7);
        break;
      case 'monthly':
        nextOccurrence.setMonth(nextOccurrence.getMonth() + 1);
        break;
      case 'yearly':
        nextOccurrence.setFullYear(nextOccurrence.getFullYear() + 1);
        break;
    }

    await supabase
      .from('recurring_expenses')
      .update({ next_date: nextOccurrence.toISOString().split('T')[0] })
      .eq('id', inserted.id);
  }

  revalidatePath('/recurring');
  revalidatePath('/dashboard');
  revalidatePath('/expenses');
  return { success: true };
}

export async function updateRecurringExpense(id: string, formData: FormData) {
  const { user, supabase, error } = await getAuthenticatedUser();
  if (error || !user || !supabase) {
    return { error: error || 'Not authenticated' };
  }

  const amount = parseFloat(formData.get('amount') as string);
  const description = formData.get('description') as string;
  const category_id = formData.get('category_id') as string;
  const frequency = formData.get('frequency') as 'daily' | 'weekly' | 'monthly' | 'yearly';
  const next_date = formData.get('next_date') as string;
  const is_active = formData.get('is_active') === 'true';

  if (!amount || isNaN(amount) || amount <= 0) {
    return { error: 'Please enter a valid amount' };
  }

  const { error: dbError } = await supabase
    .from('recurring_expenses')
    .update({
      amount,
      description: description || null,
      category_id: category_id || null,
      frequency,
      next_date,
      is_active,
    })
    .eq('id', id)
    .eq('user_id', user.id);

  if (dbError) {
    return { error: dbError.message };
  }

  revalidatePath('/recurring');
  return { success: true };
}

export async function deleteRecurringExpense(id: string) {
  const { user, supabase, error } = await getAuthenticatedUser();
  if (error || !user || !supabase) {
    return { error: error || 'Not authenticated' };
  }

  const { error: dbError } = await supabase
    .from('recurring_expenses')
    .delete()
    .eq('id', id)
    .eq('user_id', user.id);

  if (dbError) {
    return { error: dbError.message };
  }

  revalidatePath('/recurring');
  return { success: true };
}

export async function toggleRecurringExpense(id: string, is_active: boolean) {
  const { user, supabase, error } = await getAuthenticatedUser();
  if (error || !user || !supabase) {
    return { error: error || 'Not authenticated' };
  }

  const { error: dbError } = await supabase
    .from('recurring_expenses')
    .update({ is_active })
    .eq('id', id)
    .eq('user_id', user.id);

  if (dbError) {
    return { error: dbError.message };
  }

  revalidatePath('/recurring');
  return { success: true };
}

export async function processRecurringExpenses() {
  const { user, supabase, error } = await getAuthenticatedUser();
  if (error || !user || !supabase) {
    return { error: error || 'Not authenticated' };
  }

  const today = new Date().toISOString().split('T')[0];

  // Get all active recurring expenses that are due
  const { data: dueExpenses } = await supabase
    .from('recurring_expenses')
    .select('*')
    .eq('user_id', user.id)
    .eq('is_active', true)
    .lte('next_date', today);

  if (!dueExpenses || dueExpenses.length === 0) {
    return { success: true, processed: 0 };
  }

  let processed = 0;

  for (const recurring of dueExpenses) {
    // Check if expense already exists for this recurring_id and date (prevent duplicates)
    const { data: existingExpense } = await supabase
      .from('expenses')
      .select('id')
      .eq('recurring_id', recurring.id)
      .eq('date', recurring.next_date)
      .single();

    if (existingExpense) {
      // Already processed, skip to next
      continue;
    }

    // Create the expense
    const { error: insertError } = await supabase.from('expenses').insert({
      user_id: user.id,
      amount: recurring.amount,
      description: recurring.description,
      category_id: recurring.category_id,
      date: recurring.next_date,
      recurring_id: recurring.id,
      tags: [],
    });

    if (insertError) {
      continue;
    }

    // Calculate next date based on frequency
    const nextDate = new Date(recurring.next_date);
    switch (recurring.frequency) {
      case 'daily':
        nextDate.setDate(nextDate.getDate() + 1);
        break;
      case 'weekly':
        nextDate.setDate(nextDate.getDate() + 7);
        break;
      case 'monthly':
        nextDate.setMonth(nextDate.getMonth() + 1);
        break;
      case 'yearly':
        nextDate.setFullYear(nextDate.getFullYear() + 1);
        break;
    }

    // Update the recurring expense with the new next_date
    await supabase
      .from('recurring_expenses')
      .update({ next_date: nextDate.toISOString().split('T')[0] })
      .eq('id', recurring.id);

    processed++;
  }

  revalidatePath('/dashboard');
  revalidatePath('/expenses');
  revalidatePath('/recurring');

  return { success: true, processed };
}
