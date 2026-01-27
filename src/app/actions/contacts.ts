'use server';

import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';
import { createServiceClient } from '@/lib/supabase/service';
import { type Contact } from '@/types';

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
    .select('source')
    .eq('id', contactId)
    .eq('user_id', user.id)
    .single();

  if (!contact) {
    return { error: 'Contact not found' };
  }

  if (contact.source === 'group_member') {
    return { error: 'Cannot delete contacts synced from groups. Remove from group instead.' };
  }

  const { error } = await supabase
    .from('contacts')
    .delete()
    .eq('id', contactId)
    .eq('user_id', user.id);

  if (error) {
    return { error: error.message };
  }

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

  console.log('[linkContactsByEmail] Starting for userId:', userId, 'email:', email.toLowerCase());

  // Find contacts with this email that don't have a profile_id yet
  const { data: contacts, error: findError } = await supabase
    .from('contacts')
    .select('id, email, profile_id, user_id')
    .eq('email', email.toLowerCase())
    .is('profile_id', null);

  console.log('[linkContactsByEmail] Found contacts:', contacts, 'Error:', findError);

  if (findError) {
    console.error('[linkContactsByEmail] Error finding contacts:', findError);
    return;
  }

  if (!contacts?.length) {
    // Also check if there are ANY contacts with this email (even with profile_id set)
    const { data: allContacts } = await supabase
      .from('contacts')
      .select('id, email, profile_id')
      .eq('email', email.toLowerCase());
    console.log('[linkContactsByEmail] No unlinked contacts. All contacts with this email:', allContacts);
    return;
  }

  const contactIds = contacts.map(c => c.id);
  console.log('[linkContactsByEmail] Contact IDs to update:', contactIds);

  // Update contacts to link profile_id
  const { error: updateContactError } = await supabase
    .from('contacts')
    .update({ profile_id: userId })
    .eq('email', email.toLowerCase())
    .is('profile_id', null);

  console.log('[linkContactsByEmail] Update contacts result - Error:', updateContactError);

  // Also update expense_splits that have these contact_ids but no user_id
  const { data: updatedSplits, error: updateSplitsError } = await supabase
    .from('expense_splits')
    .update({ user_id: userId })
    .in('contact_id', contactIds)
    .is('user_id', null)
    .select();

  console.log('[linkContactsByEmail] Updated splits:', updatedSplits, 'Error:', updateSplitsError);
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

  // Create contacts in both directions
  const contactsToCreate: Array<{
    user_id: string;
    name: string;
    profile_id: string;
    source: 'group_member';
    source_group_id: string;
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
    });

    // Existing member gets contact for new member
    contactsToCreate.push({
      user_id: member.user_id,
      name: newMemberProfile.full_name || 'Unknown',
      profile_id: newMemberProfile.id,
      source: 'group_member',
      source_group_id: groupId,
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
