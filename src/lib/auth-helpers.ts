'use server';

import { createClient } from '@/lib/supabase/server';
import type { SupabaseClient, User } from '@supabase/supabase-js';

/**
 * Authentication result type
 */
export type AuthResult =
  | { user: User; supabase: SupabaseClient; error: null }
  | { user: null; supabase: null; error: string };

/**
 * Get the authenticated user and Supabase client.
 * Returns both user and supabase client for subsequent queries.
 */
export async function getAuthenticatedUser(): Promise<AuthResult> {
  const supabase = await createClient();
  const { data: { user }, error } = await supabase.auth.getUser();

  if (error || !user) {
    return { user: null, supabase: null, error: 'Unauthorized' };
  }

  return { user, supabase, error: null };
}

/**
 * Group membership result type
 */
export type MembershipResult =
  | { membership: { role: 'admin' | 'member' }; error: null }
  | { membership: null; error: string };

/**
 * Check if a user is a member of a group.
 * Optionally require a specific role (admin).
 */
export async function requireGroupMembership(
  supabase: SupabaseClient,
  userId: string,
  groupId: string,
  requiredRole?: 'admin'
): Promise<MembershipResult> {
  const { data: membership, error } = await supabase
    .from('group_members')
    .select('role')
    .eq('group_id', groupId)
    .eq('user_id', userId)
    .single();

  if (error || !membership) {
    return { membership: null, error: 'Not a member of this group' };
  }

  if (requiredRole === 'admin' && membership.role !== 'admin') {
    return { membership: null, error: 'Admin access required' };
  }

  return { membership: membership as { role: 'admin' | 'member' }, error: null };
}

/**
 * Combined auth and membership check result type
 */
export type AuthWithMembershipResult =
  | { user: User; supabase: SupabaseClient; membership: { role: 'admin' | 'member' }; error: null }
  | { user: null; supabase: null; membership: null; error: string };

/**
 * Get authenticated user and verify group membership in one call.
 * Useful for group-related server actions.
 */
export async function getAuthenticatedMember(
  groupId: string,
  requiredRole?: 'admin'
): Promise<AuthWithMembershipResult> {
  const authResult = await getAuthenticatedUser();
  if (authResult.error || !authResult.user || !authResult.supabase) {
    return { user: null, supabase: null, membership: null, error: authResult.error || 'Unauthorized' };
  }

  // Now TypeScript knows these are non-null
  const { user, supabase } = authResult;

  const membershipResult = await requireGroupMembership(
    supabase,
    user.id,
    groupId,
    requiredRole
  );

  if (membershipResult.error || !membershipResult.membership) {
    return { user: null, supabase: null, membership: null, error: membershipResult.error || 'Not a member' };
  }

  return {
    user,
    supabase,
    membership: membershipResult.membership,
    error: null,
  };
}
