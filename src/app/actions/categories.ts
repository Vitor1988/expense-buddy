'use server';

import { getAuthenticatedUser } from '@/lib/auth-helpers';
import { revalidatePath } from 'next/cache';

const DEFAULT_CATEGORIES = [
  { name: 'Food & Dining', icon: '🍔', color: '#ef4444' },
  { name: 'Transportation', icon: '🚗', color: '#f97316' },
  { name: 'Shopping', icon: '🛍️', color: '#eab308' },
  { name: 'Entertainment', icon: '🎬', color: '#22c55e' },
  { name: 'Bills & Utilities', icon: '💡', color: '#3b82f6' },
  { name: 'Health', icon: '💊', color: '#ec4899' },
  { name: 'Travel', icon: '✈️', color: '#8b5cf6' },
  { name: 'Education', icon: '📚', color: '#06b6d4' },
  { name: 'Personal Care', icon: '💅', color: '#f43f5e' },
  { name: 'Other', icon: '📦', color: '#6b7280' },
];

export async function getCategories() {
  const { user, supabase, error } = await getAuthenticatedUser();
  if (error || !user || !supabase) {
    return { data: null, error: error || 'Not authenticated' };
  }

  const { data, error: dbError } = await supabase
    .from('categories')
    .select('*')
    .eq('user_id', user.id)
    .order('name');

  return { data, error: dbError?.message };
}

export async function createDefaultCategories() {
  const { user, supabase, error } = await getAuthenticatedUser();
  if (error || !user || !supabase) {
    return { error: error || 'Not authenticated' };
  }

  // Check if user already has categories
  const { data: existingCategories } = await supabase
    .from('categories')
    .select('id')
    .eq('user_id', user.id)
    .limit(1);

  if (existingCategories && existingCategories.length > 0) {
    return { success: true, message: 'Categories already exist' };
  }

  const categories = DEFAULT_CATEGORIES.map((cat) => ({
    ...cat,
    user_id: user.id,
    is_default: true,
  }));

  const { error: dbError } = await supabase.from('categories').insert(categories);

  if (dbError) {
    return { error: dbError.message };
  }

  revalidatePath('/expenses');
  revalidatePath('/categories');
  return { success: true };
}

export async function createCategory(formData: FormData) {
  const { user, supabase, error } = await getAuthenticatedUser();
  if (error || !user || !supabase) {
    return { error: error || 'Not authenticated' };
  }

  const name = formData.get('name') as string;
  const icon = formData.get('icon') as string;
  const color = formData.get('color') as string;

  if (!name) {
    return { error: 'Category name is required' };
  }

  const { error: dbError } = await supabase.from('categories').insert({
    user_id: user.id,
    name,
    icon: icon || null,
    color: color || '#6b7280',
    is_default: false,
  });

  if (dbError) {
    return { error: dbError.message };
  }

  revalidatePath('/expenses');
  revalidatePath('/categories');
  return { success: true };
}

export async function updateCategory(id: string, formData: FormData) {
  const { user, supabase, error } = await getAuthenticatedUser();
  if (error || !user || !supabase) {
    return { error: error || 'Not authenticated' };
  }

  const name = formData.get('name') as string;
  const icon = formData.get('icon') as string;
  const color = formData.get('color') as string;

  if (!name) {
    return { error: 'Category name is required' };
  }

  const { error: dbError } = await supabase
    .from('categories')
    .update({
      name,
      icon: icon || null,
      color: color || '#6b7280',
    })
    .eq('id', id)
    .eq('user_id', user.id);

  if (dbError) {
    return { error: dbError.message };
  }

  revalidatePath('/expenses');
  revalidatePath('/categories');
  return { success: true };
}

export async function deleteCategory(id: string) {
  const { user, supabase, error } = await getAuthenticatedUser();
  if (error || !user || !supabase) {
    return { error: error || 'Not authenticated' };
  }

  // Set expenses with this category to null
  await supabase
    .from('expenses')
    .update({ category_id: null })
    .eq('category_id', id)
    .eq('user_id', user.id);

  const { error: dbError } = await supabase
    .from('categories')
    .delete()
    .eq('id', id)
    .eq('user_id', user.id);

  if (dbError) {
    return { error: dbError.message };
  }

  revalidatePath('/expenses');
  revalidatePath('/categories');
  return { success: true };
}
