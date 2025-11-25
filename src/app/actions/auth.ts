'use server';

import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';

export interface AuthResult {
  error?: string;
  success?: boolean;
  requiresEmailConfirmation?: boolean;
}

export async function signUp(formData: FormData): Promise<AuthResult> {
  const supabase = await createClient();

  const email = formData.get('email') as string;
  const password = formData.get('password') as string;
  const fullName = formData.get('fullName') as string;
  const currency = formData.get('currency') as string;

  if (!email || !password || !fullName || !currency) {
    return { error: 'All fields are required' };
  }

  if (password.length < 6) {
    return { error: 'Password must be at least 6 characters' };
  }

  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: {
        full_name: fullName,
        currency: currency,
      },
    },
  });

  if (error) {
    return { error: error.message };
  }

  // Create profile in profiles table
  if (data.user) {
    const { error: profileError } = await supabase.from('profiles').insert({
      id: data.user.id,
      full_name: fullName,
      currency: currency,
    });

    if (profileError) {
      console.error('Error creating profile:', profileError);
    }

    // Create default categories for the user
    const defaultCategories = [
      { name: 'Food & Dining', icon: 'utensils', color: '#ef4444', user_id: data.user.id, is_default: true },
      { name: 'Transportation', icon: 'car', color: '#f97316', user_id: data.user.id, is_default: true },
      { name: 'Shopping', icon: 'shopping-bag', color: '#eab308', user_id: data.user.id, is_default: true },
      { name: 'Entertainment', icon: 'film', color: '#22c55e', user_id: data.user.id, is_default: true },
      { name: 'Bills & Utilities', icon: 'receipt', color: '#3b82f6', user_id: data.user.id, is_default: true },
      { name: 'Healthcare', icon: 'heart-pulse', color: '#ec4899', user_id: data.user.id, is_default: true },
      { name: 'Education', icon: 'graduation-cap', color: '#8b5cf6', user_id: data.user.id, is_default: true },
      { name: 'Other', icon: 'circle-ellipsis', color: '#6b7280', user_id: data.user.id, is_default: true },
    ];

    await supabase.from('categories').insert(defaultCategories);

    // Check if email confirmation is required
    // If user.identities is empty or email is not confirmed, redirect to confirmation page
    if (!data.user.email_confirmed_at) {
      return { success: true, requiresEmailConfirmation: true };
    }
  }

  revalidatePath('/', 'layout');
  redirect('/dashboard');
}

export async function signIn(formData: FormData): Promise<AuthResult> {
  const supabase = await createClient();

  const email = formData.get('email') as string;
  const password = formData.get('password') as string;

  if (!email || !password) {
    return { error: 'Email and password are required' };
  }

  const { error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error) {
    return { error: error.message };
  }

  revalidatePath('/', 'layout');
  redirect('/dashboard');
}

export async function signOut(): Promise<void> {
  const supabase = await createClient();
  await supabase.auth.signOut();
  revalidatePath('/', 'layout');
  redirect('/login');
}

export async function getUser() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  return user;
}

export async function getProfile() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) return null;

  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single();

  return profile;
}
