'use server';

import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';
import { createServiceClient } from '@/lib/supabase/service';
import { type Contact, type ContactRequest, type ContactBalance, type ContactBalanceExpense } from '@/types';

// ============================================
// GET CONTACTS
// ============================================

export async function getContacts(): Promise<{ contacts: Contact[]; error?: string }> {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { contacts: [], error: 'Not authenticated' };
  }

  const { data, error } = await supabase
    .from('contacts')
    .select(`
      *,
      profile:profiles!contacts_profile_id_fkey(id, full_name, avatar_url),
      group:expense_groups!contacts_source_group_id_fkey(id, name)
    `)
    .eq('user_id', user.id)
    .order('name', { ascending: true });

  if (error) {
    return { contacts: [], error: error.message };
  }

  return { contacts: data || [] };
}

// ============================================
// CREATE CONTACT (manual)
// ============================================

export async function createContact(formData: FormData) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: 'Not authenticated' };
  }

  const name = formData.get('name') as string;
  const email = formData.get('email') as string | null;

  if (!name || name.trim().length === 0) {
    return { error: 'Name is required' };
  }

  // Check if contact with same name already exists
  const { data: existing } = await supabase
    .from('contacts')
    .select('id')
    .eq('user_id', user.id)
    .eq('name', name.trim())
    .is('profile_id', null)
    .single();

  if (existing) {
    return { error: 'A contact with this name already exists' };
  }

  const { data, error } = await supabase
    .from('contacts')
    .insert({
      user_id: user.id,
      name: name.trim(),
      email: email?.trim().toLowerCase() || null,
      source: 'manual',
    })
    .select()
    .single();

  if (error) {
    return { error: error.message };
  }

  revalidatePath('/expenses');
  return { contact: data };
}

// ============================================
// UPDATE CONTACT
// ============================================

export async function updateContact(contactId: string, formData: FormData) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: 'Not authenticated' };
  }

  const name = formData.get('name') as string;
  const email = formData.get('email') as string | null;

  if (!name || name.trim().length === 0) {
    return { error: 'Name is required' };
  }

  const { error } = await supabase
    .from('contacts')
    .update({
      name: name.trim(),
      email: email?.trim().toLowerCase() || null,
    })
    .eq('id', contactId)
    .eq('user_id', user.id);

  if (error) {
    return { error: error.message };
  }

  revalidatePath('/expenses');
  return { success: true };
}

// ============================================
// DELETE CONTACT
// ============================================

export async function deleteContact(contactId: string) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: 'Not authenticated' };
  }

  // Only allow deleting manual contacts
  const { data: contact } = await supabase
    .from('contacts')
    .select('source, profile_id, request_id')
    .eq('id', contactId)
    .eq('user_id', user.id)
    .single();

  if (!contact) {
    return { error: 'Contact not found' };
  }

  if (contact.source === 'group_member') {
    return { error: 'Cannot delete contacts synced from groups. Remove from group instead.' };
  }

  const serviceClient = createServiceClient();

  // Delete the contact
  const { error } = await supabase
    .from('contacts')
    .delete()
    .eq('id', contactId)
    .eq('user_id', user.id);

  if (error) {
    return { error: error.message };
  }

  // Also delete the mutual contact (the other person's contact entry for us)
  if (contact.profile_id) {
    await serviceClient
      .from('contacts')
      .delete()
      .eq('user_id', contact.profile_id)
      .eq('profile_id', user.id);
  }

  // Delete the associated contact request (so they can send a new one)
  if (contact.request_id) {
    await serviceClient
      .from('contact_requests')
      .delete()
      .eq('id', contact.request_id);
  }

  revalidatePath('/contacts');
  revalidatePath('/expenses');
  return { success: true };
}

// ============================================
// LINK CONTACTS BY EMAIL
// (Called after login/signup to connect contacts created before user registered)
// ============================================

export async function linkContactsByEmail(userId: string, email: string) {
  // Use service client to bypass RLS - we need to update contacts owned by other users
  const supabase = createServiceClient();

  // Find contacts with this email that don't have a profile_id yet
  const { data: contacts, error: findError } = await supabase
    .from('contacts')
    .select('id, email, profile_id, user_id')
    .eq('email', email.toLowerCase())
    .is('profile_id', null);

  if (findError || !contacts?.length) {
    return;
  }

  const contactIds = contacts.map(c => c.id);

  // Update contacts to link profile_id
  await supabase
    .from('contacts')
    .update({ profile_id: userId })
    .eq('email', email.toLowerCase())
    .is('profile_id', null);

  // Also update expense_splits that have these contact_ids but no user_id
  await supabase
    .from('expense_splits')
    .update({ user_id: userId })
    .in('contact_id', contactIds)
    .is('user_id', null);
}

// ============================================
// CONTACT REQUESTS
// ============================================

/**
 * Send a contact request to another user by email
 */
export async function sendContactRequest(email: string): Promise<{ request?: ContactRequest; error?: string }> {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: 'Not authenticated' };
  }

  const normalizedEmail = email.trim().toLowerCase();

  // Can't send request to yourself
  if (normalizedEmail === user.email?.toLowerCase()) {
    return { error: 'Cannot send contact request to yourself' };
  }

  // Check if we already have an approved contact with this email
  const { data: existingContact } = await supabase
    .from('contacts')
    .select('id, is_approved')
    .eq('user_id', user.id)
    .eq('email', normalizedEmail)
    .eq('is_approved', true)
    .single();

  if (existingContact) {
    return { error: 'This person is already your contact' };
  }

  // Check if there's already a pending request
  const { data: existingRequest } = await supabase
    .from('contact_requests')
    .select('id, status')
    .eq('from_user_id', user.id)
    .eq('to_email', normalizedEmail)
    .eq('status', 'pending')
    .single();

  if (existingRequest) {
    return { error: 'You already have a pending request to this person' };
  }

  // Check if the target user already exists by looking up auth users
  const serviceClient = createServiceClient();
  let targetUserId: string | null = null;

  // Use admin API to find user by email
  const { data: authUsers } = await serviceClient.auth.admin.listUsers();
  const targetAuthUser = authUsers?.users?.find(u => u.email?.toLowerCase() === normalizedEmail);
  if (targetAuthUser) {
    targetUserId = targetAuthUser.id;
  }

  // Create the request
  const { data: request, error } = await supabase
    .from('contact_requests')
    .insert({
      from_user_id: user.id,
      to_email: normalizedEmail,
      to_user_id: targetUserId,
    })
    .select()
    .single();

  if (error) {
    if (error.code === '23505') {
      return { error: 'You already have a request to this person' };
    }
    return { error: error.message };
  }

  revalidatePath('/contacts');
  return { request };
}

/**
 * Get pending contact requests received by the current user
 */
export async function getPendingContactRequests(): Promise<{ requests: ContactRequest[]; error?: string }> {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { requests: [], error: 'Not authenticated' };
  }

  const { data, error } = await supabase
    .from('contact_requests')
    .select(`
      *,
      from_user:profiles!contact_requests_from_user_id_fkey(id, full_name, avatar_url)
    `)
    .eq('to_user_id', user.id)
    .eq('status', 'pending')
    .order('created_at', { ascending: false });

  if (error) {
    return { requests: [], error: error.message };
  }

  return { requests: data || [] };
}

/**
 * Get contact requests sent by the current user
 */
export async function getSentContactRequests(): Promise<{ requests: ContactRequest[]; error?: string }> {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { requests: [], error: 'Not authenticated' };
  }

  const { data, error } = await supabase
    .from('contact_requests')
    .select(`
      *,
      to_user:profiles!contact_requests_to_user_id_fkey(id, full_name, avatar_url)
    `)
    .eq('from_user_id', user.id)
    .order('created_at', { ascending: false });

  if (error) {
    return { requests: [], error: error.message };
  }

  return { requests: data || [] };
}

/**
 * Accept a contact request - creates mutual contacts
 */
export async function acceptContactRequest(requestId: string): Promise<{ error?: string }> {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: 'Not authenticated' };
  }

  // Get the request
  const { data: request, error: fetchError } = await supabase
    .from('contact_requests')
    .select('*, from_user:profiles!contact_requests_from_user_id_fkey(id, full_name)')
    .eq('id', requestId)
    .eq('to_user_id', user.id)
    .eq('status', 'pending')
    .single();

  if (fetchError || !request) {
    return { error: 'Request not found or already processed' };
  }

  // Get current user's profile
  const { data: myProfile } = await supabase
    .from('profiles')
    .select('id, full_name')
    .eq('id', user.id)
    .single();

  if (!myProfile) {
    return { error: 'Profile not found' };
  }

  // Update request status
  const { error: updateError } = await supabase
    .from('contact_requests')
    .update({
      status: 'accepted',
      responded_at: new Date().toISOString(),
    })
    .eq('id', requestId);

  if (updateError) {
    return { error: updateError.message };
  }

  const fromUserProfile = Array.isArray(request.from_user) ? request.from_user[0] : request.from_user;

  // Create mutual contacts
  const contactsToCreate = [
    // I add the requester as my contact
    {
      user_id: user.id,
      name: fromUserProfile?.full_name || 'Unknown',
      email: request.to_email, // This is actually the email they used
      profile_id: request.from_user_id,
      source: 'manual' as const,
      is_approved: true,
      request_id: requestId,
    },
    // Requester gets me as their contact
    {
      user_id: request.from_user_id,
      name: myProfile.full_name || 'Unknown',
      email: user.email?.toLowerCase() || null,
      profile_id: user.id,
      source: 'manual' as const,
      is_approved: true,
      request_id: requestId,
    },
  ];

  // Use service client to create contacts for both users (bypasses RLS)
  const serviceClient = createServiceClient();

  for (const contactData of contactsToCreate) {
    const { error: contactError } = await serviceClient
      .from('contacts')
      .insert(contactData);

    // Ignore duplicate key errors (23505) - contact already exists
    if (contactError && contactError.code !== '23505') {
      console.error('Failed to create contact:', contactError);
      return { error: 'Failed to create contacts: ' + contactError.message };
    }
  }

  revalidatePath('/contacts');
  revalidatePath('/expenses');
  return {};
}

/**
 * Reject a contact request
 */
export async function rejectContactRequest(requestId: string): Promise<{ error?: string }> {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: 'Not authenticated' };
  }

  const { error } = await supabase
    .from('contact_requests')
    .update({
      status: 'rejected',
      responded_at: new Date().toISOString(),
    })
    .eq('id', requestId)
    .eq('to_user_id', user.id)
    .eq('status', 'pending');

  if (error) {
    return { error: error.message };
  }

  revalidatePath('/contacts');
  return {};
}

/**
 * Cancel a sent contact request
 */
export async function cancelContactRequest(requestId: string): Promise<{ error?: string }> {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: 'Not authenticated' };
  }

  const { error } = await supabase
    .from('contact_requests')
    .update({
      status: 'cancelled',
      responded_at: new Date().toISOString(),
    })
    .eq('id', requestId)
    .eq('from_user_id', user.id)
    .eq('status', 'pending');

  if (error) {
    return { error: error.message };
  }

  revalidatePath('/contacts');
  return {};
}

/**
 * Get approved contacts only (for expense sharing)
 */
export async function getApprovedContacts(): Promise<{ contacts: Contact[]; error?: string }> {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { contacts: [], error: 'Not authenticated' };
  }

  const { data, error } = await supabase
    .from('contacts')
    .select(`
      *,
      profile:profiles!contacts_profile_id_fkey(id, full_name, avatar_url),
      group:expense_groups!contacts_source_group_id_fkey(id, name)
    `)
    .eq('user_id', user.id)
    .eq('is_approved', true)
    .order('name', { ascending: true });

  if (error) {
    return { contacts: [], error: error.message };
  }

  return { contacts: data || [] };
}

// ============================================
// SYNC CONTACTS FROM GROUP MEMBERSHIP
// (Called when accepting invitation or member joins)
// ============================================

export async function syncContactsForGroupMember(
  groupId: string,
  newMemberId: string
) {
  const supabase = await createClient();

  // Get all other members of the group
  const { data: members } = await supabase
    .from('group_members')
    .select('user_id, profile:profiles(id, full_name)')
    .eq('group_id', groupId)
    .neq('user_id', newMemberId);

  if (!members || members.length === 0) return;

  // Get new member's profile
  const { data: newMemberProfile } = await supabase
    .from('profiles')
    .select('id, full_name')
    .eq('id', newMemberId)
    .single();

  if (!newMemberProfile) return;

  // Create contacts in both directions (auto-approved since they're in the same group)
  const contactsToCreate: Array<{
    user_id: string;
    name: string;
    profile_id: string;
    source: 'group_member';
    source_group_id: string;
    is_approved: boolean;
  }> = [];

  for (const member of members) {
    // Supabase returns profile as an object for one-to-one relations
    const profileData = member.profile;
    const profile = Array.isArray(profileData) ? profileData[0] : profileData;
    if (!profile) continue;

    // New member gets contact for existing member
    contactsToCreate.push({
      user_id: newMemberId,
      name: profile.full_name || 'Unknown',
      profile_id: profile.id,
      source: 'group_member',
      source_group_id: groupId,
      is_approved: true,
    });

    // Existing member gets contact for new member
    contactsToCreate.push({
      user_id: member.user_id,
      name: newMemberProfile.full_name || 'Unknown',
      profile_id: newMemberProfile.id,
      source: 'group_member',
      source_group_id: groupId,
      is_approved: true,
    });
  }

  // Insert contacts (ignore conflicts - contact may already exist)
  if (contactsToCreate.length > 0) {
    await supabase
      .from('contacts')
      .upsert(contactsToCreate, {
        onConflict: 'user_id,profile_id',
        ignoreDuplicates: true,
      });
  }
}

// ============================================
// GET CONTACT BALANCE
// ============================================

export async function getContactBalance(contactId: string): Promise<{ data: ContactBalance | null; error: string | null }> {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { data: null, error: 'Not authenticated' };
  }

  // Get contact details
  const { data: contact, error: contactError } = await supabase
    .from('contacts')
    .select('id, name, profile_id')
    .eq('id', contactId)
    .eq('user_id', user.id)
    .single();

  if (contactError || !contact) {
    return { data: null, error: 'Contact not found' };
  }

  // Query A: Expenses where USER paid and CONTACT is participant (contact owes user)
  const { data: userPaidExpenses } = await supabase
    .from('expense_splits')
    .select(`
      id,
      amount,
      is_settled,
      shared_expense:shared_expenses!inner(
        id,
        amount,
        description,
        date,
        paid_by
      )
    `)
    .eq('contact_id', contactId)
    .eq('shared_expense.paid_by', user.id)
    .is('shared_expense.group_id', null);

  // Query B: Expenses where CONTACT paid and USER is participant (user owes contact)
  // Only works if contact has a profile_id (registered user)
  let contactPaidExpenses: typeof userPaidExpenses = [];
  if (contact.profile_id) {
    const { data } = await supabase
      .from('expense_splits')
      .select(`
        id,
        amount,
        is_settled,
        shared_expense:shared_expenses!inner(
          id,
          amount,
          description,
          date,
          paid_by
        )
      `)
      .eq('user_id', user.id)
      .eq('shared_expense.paid_by', contact.profile_id)
      .is('shared_expense.group_id', null);
    contactPaidExpenses = data || [];
  }

  // Transform user paid expenses (contact owes user)
  const userPaidList: ContactBalanceExpense[] = (userPaidExpenses || []).map((split) => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const se = split.shared_expense as any;
    return {
      id: se.id,
      description: se.description,
      date: se.date,
      totalAmount: Number(se.amount),
      userShare: Number(se.amount) - Number(split.amount), // User's own share
      contactShare: Number(split.amount),
      isSettled: split.is_settled,
    };
  });

  // Transform contact paid expenses (user owes contact)
  const contactPaidList: ContactBalanceExpense[] = (contactPaidExpenses || []).map((split) => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const se = split.shared_expense as any;
    return {
      id: se.id,
      description: se.description,
      date: se.date,
      totalAmount: Number(se.amount),
      userShare: Number(split.amount),
      contactShare: Number(se.amount) - Number(split.amount), // Contact's own share
      isSettled: split.is_settled,
    };
  });

  // Calculate totals
  const userPaidTotal = userPaidList
    .filter(e => !e.isSettled)
    .reduce((sum, e) => sum + e.contactShare, 0);
  const userPaidSettled = userPaidList
    .filter(e => e.isSettled)
    .reduce((sum, e) => sum + e.contactShare, 0);

  const contactPaidTotal = contactPaidList
    .filter(e => !e.isSettled)
    .reduce((sum, e) => sum + e.userShare, 0);
  const contactPaidSettled = contactPaidList
    .filter(e => e.isSettled)
    .reduce((sum, e) => sum + e.userShare, 0);

  // Net balance: positive = contact owes user, negative = user owes contact
  const netBalance = userPaidTotal - contactPaidTotal;

  // Sort expenses by date (newest first)
  userPaidList.sort((a, b) => b.date.localeCompare(a.date));
  contactPaidList.sort((a, b) => b.date.localeCompare(a.date));

  return {
    data: {
      contactId: contact.id,
      contactName: contact.name,
      userPaidExpenses: userPaidList,
      userPaidTotal,
      userPaidSettled,
      contactPaidExpenses: contactPaidList,
      contactPaidTotal,
      contactPaidSettled,
      netBalance,
    },
    error: null,
  };
}
