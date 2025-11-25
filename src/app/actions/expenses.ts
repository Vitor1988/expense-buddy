'use server';

import { createClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';

export async function createExpense(formData: FormData) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: 'Not authenticated' };
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

  const { error } = await supabase.from('expenses').insert({
    user_id: user.id,
    amount,
    description: description || null,
    category_id: category_id || null,
    date: date || new Date().toISOString().split('T')[0],
    notes: notes || null,
    receipt_url: receipt_url || null,
    tags,
  });

  if (error) {
    return { error: error.message };
  }

  revalidatePath('/dashboard');
  revalidatePath('/expenses');
  redirect('/expenses');
}

export async function updateExpense(id: string, formData: FormData) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: 'Not authenticated' };
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

  const { error } = await supabase
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

  if (error) {
    return { error: error.message };
  }

  revalidatePath('/dashboard');
  revalidatePath('/expenses');
  redirect('/expenses');
}

export async function deleteExpense(id: string) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: 'Not authenticated' };
  }

  const { error } = await supabase
    .from('expenses')
    .delete()
    .eq('id', id)
    .eq('user_id', user.id);

  if (error) {
    return { error: error.message };
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
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { data: null, error: 'Not authenticated' };
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

  const { data, error } = await query;

  return { data, error: error?.message };
}

export async function getExpenseById(id: string) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { data: null, error: 'Not authenticated' };
  }

  const { data, error } = await supabase
    .from('expenses')
    .select('*, category:categories(*)')
    .eq('id', id)
    .eq('user_id', user.id)
    .single();

  return { data, error: error?.message };
}
