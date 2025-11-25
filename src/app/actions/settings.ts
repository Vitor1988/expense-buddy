'use server';

import { createClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';

export async function getProfile() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { data: null, error: 'Not authenticated' };
  }

  const { data: profile, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single();

  return {
    data: profile ? { ...profile, email: user.email } : null,
    error: error?.message,
  };
}

export async function updateProfile(formData: FormData) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: 'Not authenticated' };
  }

  const full_name = formData.get('full_name') as string;
  const currency = formData.get('currency') as string;

  const { error } = await supabase
    .from('profiles')
    .update({
      full_name: full_name || null,
      currency: currency || 'USD',
    })
    .eq('id', user.id);

  if (error) {
    return { error: error.message };
  }

  // Update auth metadata
  await supabase.auth.updateUser({
    data: { full_name },
  });

  revalidatePath('/settings');
  revalidatePath('/dashboard');
  return { success: true };
}

export async function updatePassword(formData: FormData) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: 'Not authenticated' };
  }

  const currentPassword = formData.get('current_password') as string;
  const newPassword = formData.get('new_password') as string;
  const confirmPassword = formData.get('confirm_password') as string;

  if (!currentPassword || !newPassword || !confirmPassword) {
    return { error: 'All fields are required' };
  }

  if (newPassword !== confirmPassword) {
    return { error: 'New passwords do not match' };
  }

  if (newPassword.length < 6) {
    return { error: 'Password must be at least 6 characters' };
  }

  // Verify current password by signing in
  const { error: signInError } = await supabase.auth.signInWithPassword({
    email: user.email!,
    password: currentPassword,
  });

  if (signInError) {
    return { error: 'Current password is incorrect' };
  }

  const { error } = await supabase.auth.updateUser({
    password: newPassword,
  });

  if (error) {
    return { error: error.message };
  }

  return { success: true };
}

export async function deleteAccount() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: 'Not authenticated' };
  }

  // Delete user data (cascades from profile)
  const { error: deleteError } = await supabase
    .from('profiles')
    .delete()
    .eq('id', user.id);

  if (deleteError) {
    return { error: deleteError.message };
  }

  // Note: The user auth record itself would need admin privileges to delete
  // For now, just sign out
  await supabase.auth.signOut();

  return { success: true };
}
