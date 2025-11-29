/**
 * Utility functions for working with group members.
 * Use these for consistent member display across the app.
 *
 * @module lib/member-helpers
 * @see MODULES.md for full documentation
 */

import type { GroupMember, GroupMemberProfile, Profile } from '@/types';

/**
 * Type for any object that has profile information.
 * Used for flexible member name extraction.
 */
type WithProfile = {
  profile?: Profile | GroupMemberProfile | null;
};

/**
 * Type for any object that might have user profile info directly.
 */
type ProfileLike = Profile | GroupMemberProfile | null | undefined;

/**
 * Get a display name for a group member.
 * Falls back to 'Unknown' if no name is available.
 *
 * @param member - The group member object
 * @returns Display name string
 *
 * @example
 * getMemberName({ profile: { full_name: 'John Doe' } }) // 'John Doe'
 * getMemberName({ profile: null }) // 'Unknown'
 */
export function getMemberName(member: WithProfile): string {
  const profile = member.profile;
  if (!profile) return 'Unknown';

  if ('full_name' in profile && profile.full_name) {
    return profile.full_name;
  }

  return 'Unknown';
}

/**
 * Get a display name from a profile object directly.
 *
 * @param profile - The profile object
 * @returns Display name string
 *
 * @example
 * getProfileName({ full_name: 'John Doe' }) // 'John Doe'
 * getProfileName(null) // 'Unknown'
 */
export function getProfileName(profile: ProfileLike): string {
  if (!profile) return 'Unknown';
  return profile.full_name || 'Unknown';
}

/**
 * Get initials from a member's name.
 * Returns up to 2 characters.
 *
 * @param member - The group member object
 * @returns Initials string (1-2 characters)
 *
 * @example
 * getMemberInitials({ profile: { full_name: 'John Doe' } }) // 'JD'
 * getMemberInitials({ profile: { full_name: 'Alice' } }) // 'A'
 * getMemberInitials({ profile: null }) // 'U'
 */
export function getMemberInitials(member: WithProfile): string {
  const name = getMemberName(member);
  return name
    .split(' ')
    .map(n => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2) || 'U';
}

/**
 * Get initials from a profile name.
 *
 * @param name - The full name string
 * @returns Initials string (1-2 characters)
 *
 * @example
 * getInitials('John Doe') // 'JD'
 * getInitials('Alice') // 'A'
 * getInitials('') // 'U'
 */
export function getInitials(name: string): string {
  if (!name) return 'U';
  return name
    .split(' ')
    .map(n => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2) || 'U';
}

/**
 * Find a member by user ID in a members array.
 *
 * @param members - Array of group members
 * @param userId - User ID to find
 * @returns The member or undefined if not found
 *
 * @example
 * const member = getMemberById(members, 'user-123');
 * if (member) {
 *   console.log(getMemberName(member));
 * }
 */
export function getMemberById(
  members: GroupMember[],
  userId: string
): GroupMember | undefined {
  return members.find(m => m.user_id === userId);
}

/**
 * Check if a user is an admin of a group.
 *
 * @param members - Array of group members
 * @param userId - User ID to check
 * @returns True if user is an admin
 *
 * @example
 * if (isGroupAdmin(members, currentUserId)) {
 *   // Show admin controls
 * }
 */
export function isGroupAdmin(
  members: GroupMember[],
  userId: string
): boolean {
  const member = getMemberById(members, userId);
  return member?.role === 'admin';
}

/**
 * Get all admins from a members array.
 *
 * @param members - Array of group members
 * @returns Array of admin members
 *
 * @example
 * const admins = getGroupAdmins(members);
 * console.log(`${admins.length} admins in group`);
 */
export function getGroupAdmins(members: GroupMember[]): GroupMember[] {
  return members.filter(m => m.role === 'admin');
}

/**
 * Sort members with admins first, then by name.
 *
 * @param members - Array of group members
 * @returns Sorted array (does not mutate original)
 *
 * @example
 * const sorted = sortMembersByRole(members);
 */
export function sortMembersByRole(members: GroupMember[]): GroupMember[] {
  return [...members].sort((a, b) => {
    // Admins first
    if (a.role === 'admin' && b.role !== 'admin') return -1;
    if (a.role !== 'admin' && b.role === 'admin') return 1;
    // Then by name
    return getMemberName(a).localeCompare(getMemberName(b));
  });
}
