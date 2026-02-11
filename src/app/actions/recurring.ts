'use server';

import { getAuthenticatedUser } from '@/lib/auth-helpers';
import { revalidatePath } from 'next/cache';
import { calculateSplits, type SplitInput } from '@/lib/split-calculator';
import { validateEnum } from '@/lib/validations';
import type { SplitMethod } from '@/types';
import type { SupabaseClient } from '@supabase/supabase-js';

const VALID_SPLIT_METHODS = ['equal', 'exact', 'percentage', 'shares'] as const;
const VALID_FREQUENCIES = ['daily', 'weekly', 'monthly', 'yearly'] as const;

function calculateNextDate(currentDate: string, frequency: string): string {
  const next = new Date(currentDate);
  switch (frequency) {
    case 'daily':
      next.setDate(next.getDate() + 1);
      break;
    case 'weekly':
      next.setDate(next.getDate() + 7);
      break;
    case 'monthly':
      next.setMonth(next.getMonth() + 1);
      break;
    case 'yearly':
      next.setFullYear(next.getFullYear() + 1);
      break;
  }
  return next.toISOString().split('T')[0];
}

/** Parse shared expense fields from FormData */
function parseSharedFields(formData: FormData) {
  const is_shared = formData.get('is_shared') === 'true';
  if (!is_shared) {
    return { is_shared: false, split_method: 'equal' as SplitMethod, participants: null, split_values: null };
  }

  const split_method = (formData.get('split_method') as string) || 'equal';
  if (!validateEnum(split_method, VALID_SPLIT_METHODS)) {
    return { error: 'Invalid split method' };
  }

  let participants: string[] = [];
  try {
    const json = formData.get('participants') as string;
    participants = json ? JSON.parse(json) : [];
  } catch {
    return { error: 'Invalid participants data' };
  }

  if (participants.length === 0) {
    return { error: 'Please select at least one person to split with' };
  }

  let split_values: Record<string, number> | null = null;
  if (split_method !== 'equal') {
    try {
      const json = formData.get('split_values') as string;
      split_values = json ? JSON.parse(json) : null;
    } catch {
      return { error: 'Invalid split values data' };
    }
    if (!split_values) {
      return { error: 'Split values are required for this split method' };
    }
  }

  return {
    is_shared: true,
    split_method: split_method as SplitMethod,
    participants,
    split_values,
  };
}

/** Create a shared expense entry from a recurring expense template */
async function createSharedExpenseFromRecurring(
  supabase: SupabaseClient,
  userId: string,
  recurring: {
    id: string;
    amount: number;
    description: string | null;
    category_id: string | null;
    split_method: string;
    participants: string[];
    split_values: Record<string, number> | null;
    next_date: string;
  }
): Promise<{ error?: string }> {
  // Get category name for backwards compatibility
  let categoryName: string | null = null;
  if (recurring.category_id) {
    const { data: category } = await supabase
      .from('categories')
      .select('name')
      .eq('id', recurring.category_id)
      .single();
    categoryName = category?.name || null;
  }

  // Fetch approved contacts that are still valid
  const { data: contacts } = await supabase
    .from('contacts')
    .select('id, name, profile_id, is_approved')
    .in('id', recurring.participants)
    .eq('is_approved', true);

  const validContacts = contacts || [];

  // If no valid contacts remain, return error instead of silently falling back
  if (validContacts.length === 0) {
    return { error: 'No valid contacts found. Contacts may have been removed or unapproved.' };
  }

  // Build participant IDs (self + valid contacts)
  const allParticipantIds = ['self', ...validContacts.map((c: { id: string }) => c.id)];
  const contactMap = new Map(validContacts.map((c: { id: string }) => [c.id, c]));

  // Calculate splits
  const split_method = recurring.split_method as SplitMethod;
  let splitInputs: SplitInput[] | undefined;

  if (split_method !== 'equal' && recurring.split_values) {
    // Filter split_values to only include valid participants
    splitInputs = [
      { userId: 'self', value: recurring.split_values['self'] || 0 },
      ...validContacts.map((c: { id: string }) => ({
        userId: c.id,
        value: recurring.split_values![c.id] || 0,
      })),
    ];
  }

  // If some contacts were removed and method isn't equal, recalculate as equal
  const useMethod = (split_method !== 'equal' && validContacts.length !== recurring.participants.length)
    ? 'equal' as SplitMethod
    : split_method;

  const splitResult = calculateSplits(
    useMethod,
    recurring.amount,
    allParticipantIds,
    useMethod === 'equal' ? undefined : splitInputs
  );

  if (splitResult.error) {
    // Fallback to equal split if calculation fails
    const equalResult = calculateSplits('equal', recurring.amount, allParticipantIds);
    if (equalResult.error) {
      return { error: equalResult.error };
    }
    Object.assign(splitResult, equalResult);
  }

  // Create shared expense
  const { data: sharedExpense, error: expenseError } = await supabase
    .from('shared_expenses')
    .insert({
      group_id: null,
      paid_by: userId,
      amount: recurring.amount,
      description: recurring.description,
      category: categoryName,
      category_id: recurring.category_id,
      date: recurring.next_date,
      split_method: useMethod,
      recurring_id: recurring.id,
    })
    .select()
    .single();

  if (expenseError) {
    return { error: expenseError.message };
  }

  // Create expense splits
  const splitsToInsert = splitResult.splits.map(split => {
    if (split.userId === 'self') {
      return {
        shared_expense_id: sharedExpense.id,
        user_id: userId,
        contact_id: null,
        amount: split.amount,
        shares: split.shares,
        percentage: split.percentage,
        is_settled: true,
      };
    } else {
      const contact = contactMap.get(split.userId) as { id: string; profile_id: string | null } | undefined;
      if (contact?.profile_id) {
        return {
          shared_expense_id: sharedExpense.id,
          user_id: contact.profile_id,
          contact_id: contact.id,
          amount: split.amount,
          shares: split.shares,
          percentage: split.percentage,
          is_settled: false,
        };
      } else {
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

  return {};
}

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
  const frequency = formData.get('frequency') as string;
  const next_date = formData.get('next_date') as string;

  if (!amount || isNaN(amount) || amount <= 0) {
    return { error: 'Please enter a valid amount' };
  }

  if (!validateEnum(frequency, VALID_FREQUENCIES)) {
    return { error: 'Please select a frequency' };
  }

  if (!next_date) {
    return { error: 'Please select the next date' };
  }

  // Parse shared fields
  const shared = parseSharedFields(formData);
  if ('error' in shared) {
    return { error: shared.error };
  }

  // Validate contacts exist and are approved when shared
  if (shared.is_shared && shared.participants) {
    const { data: contacts } = await supabase
      .from('contacts')
      .select('id')
      .in('id', shared.participants)
      .eq('is_approved', true);

    if (!contacts || contacts.length !== shared.participants.length) {
      return { error: 'Some selected contacts are not approved. Please add them via Contacts page first.' };
    }
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
      is_shared: shared.is_shared,
      split_method: shared.is_shared ? shared.split_method : 'equal',
      participants: shared.is_shared ? shared.participants : null,
      split_values: shared.is_shared ? shared.split_values : null,
    })
    .select()
    .single();

  if (dbError) {
    return { error: dbError.message };
  }

  // If the start date is today or in the past, create the first expense immediately
  const today = new Date().toISOString().split('T')[0];
  if (next_date <= today) {
    if (shared.is_shared && shared.participants) {
      try {
        const result = await createSharedExpenseFromRecurring(supabase, user.id, {
          id: inserted.id,
          amount,
          description: description || null,
          category_id: category_id || null,
          split_method: shared.split_method,
          participants: shared.participants,
          split_values: shared.split_values,
          next_date,
        });
        if (result.error) {
          return { error: `Failed to create shared expense: ${result.error}` };
        }
      } catch (err) {
        return { error: `Failed to create shared expense: ${err instanceof Error ? err.message : 'Unknown error'}` };
      }
    } else {
      await supabase.from('expenses').insert({
        user_id: user.id,
        amount,
        description: description || null,
        category_id: category_id || null,
        date: next_date,
        recurring_id: inserted.id,
        tags: [],
      });
    }

    await supabase
      .from('recurring_expenses')
      .update({ next_date: calculateNextDate(next_date, frequency) })
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

  // Parse shared fields
  const shared = parseSharedFields(formData);
  if ('error' in shared) {
    return { error: shared.error };
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
      is_shared: shared.is_shared,
      split_method: shared.is_shared ? shared.split_method : 'equal',
      participants: shared.is_shared ? shared.participants : null,
      split_values: shared.is_shared ? shared.split_values : null,
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
    if (recurring.is_shared && recurring.participants?.length > 0) {
      // === SHARED EXPENSE PATH ===

      // Check for duplicate in shared_expenses
      const { data: existingShared } = await supabase
        .from('shared_expenses')
        .select('id')
        .eq('recurring_id', recurring.id)
        .eq('date', recurring.next_date)
        .single();

      if (existingShared) {
        // Already processed, just update next_date
        await supabase
          .from('recurring_expenses')
          .update({ next_date: calculateNextDate(recurring.next_date, recurring.frequency) })
          .eq('id', recurring.id);
        continue;
      }

      try {
        const result = await createSharedExpenseFromRecurring(supabase, user.id, {
          id: recurring.id,
          amount: recurring.amount,
          description: recurring.description,
          category_id: recurring.category_id,
          split_method: recurring.split_method || 'equal',
          participants: recurring.participants,
          split_values: recurring.split_values,
          next_date: recurring.next_date,
        });

        if (result.error) {
          continue;
        }
      } catch {
        continue;
      }
    } else {
      // === PERSONAL EXPENSE PATH (original logic) ===

      // Check if expense already exists for this recurring_id and date (prevent duplicates)
      const { data: existingExpense } = await supabase
        .from('expenses')
        .select('id')
        .eq('recurring_id', recurring.id)
        .eq('date', recurring.next_date)
        .single();

      if (existingExpense) {
        // Already processed, just update next_date
        await supabase
          .from('recurring_expenses')
          .update({ next_date: calculateNextDate(recurring.next_date, recurring.frequency) })
          .eq('id', recurring.id);
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
    }

    // Calculate next date and update
    await supabase
      .from('recurring_expenses')
      .update({ next_date: calculateNextDate(recurring.next_date, recurring.frequency) })
      .eq('id', recurring.id);

    processed++;
  }

  revalidatePath('/dashboard');
  revalidatePath('/expenses');
  revalidatePath('/recurring');

  return { success: true, processed };
}
