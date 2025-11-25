'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Crown, MoreVertical, UserMinus, Shield, ShieldOff, Clock, X, Mail } from 'lucide-react';
import { MemberInviteForm } from './member-invite-form';
import { getPendingInvitations, cancelInvitation, removeMemberFromGroup, updateMemberRole } from '@/app/actions/groups';
import type { GroupMember } from '@/types';

interface MemberListProps {
  groupId: string;
  members: (GroupMember & {
    profile: { id: string; full_name: string | null; avatar_url: string | null };
  })[];
  currentUserId: string;
}

export function MemberList({ groupId, members, currentUserId }: MemberListProps) {
  const [pendingInvites, setPendingInvites] = useState<{ id: string; invited_email: string; created_at: string; token: string }[]>([]);
  const [loading, setLoading] = useState(false);

  // Check if current user is admin
  const currentMember = members.find((m) => m.user_id === currentUserId);
  const isAdmin = currentMember?.role === 'admin';

  useEffect(() => {
    if (isAdmin) {
      loadPendingInvites();
    }
  }, [isAdmin, groupId]);

  const loadPendingInvites = async () => {
    const { data } = await getPendingInvitations(groupId);
    if (data) {
      setPendingInvites(data);
    }
  };

  const handleCancelInvite = async (inviteId: string) => {
    setLoading(true);
    const result = await cancelInvitation(inviteId);
    if (!result.error) {
      setPendingInvites((prev) => prev.filter((i) => i.id !== inviteId));
    }
    setLoading(false);
  };

  const handleRemoveMember = async (userId: string) => {
    if (!confirm('Are you sure you want to remove this member?')) return;
    setLoading(true);
    const result = await removeMemberFromGroup(groupId, userId);
    if (result.error) {
      alert(result.error);
    }
    setLoading(false);
  };

  const handleToggleRole = async (userId: string, currentRole: string) => {
    const newRole = currentRole === 'admin' ? 'member' : 'admin';
    setLoading(true);
    const result = await updateMemberRole(groupId, userId, newRole);
    if (result.error) {
      alert(result.error);
    }
    setLoading(false);
  };

  // Sort members: current user first, then admins, then by name
  const sortedMembers = [...members].sort((a, b) => {
    if (a.user_id === currentUserId) return -1;
    if (b.user_id === currentUserId) return 1;
    if (a.role === 'admin' && b.role !== 'admin') return -1;
    if (a.role !== 'admin' && b.role === 'admin') return 1;
    return (a.profile?.full_name || '').localeCompare(b.profile?.full_name || '');
  });

  return (
    <div className="space-y-4">
      {/* Header with invite button */}
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
          Members ({members.length})
        </h3>
        <MemberInviteForm groupId={groupId} isAdmin={isAdmin} />
      </div>

      {/* Pending invitations */}
      {isAdmin && pendingInvites.length > 0 && (
        <Card className="border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-950/30">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-amber-700 dark:text-amber-400 flex items-center gap-2">
              <Clock className="w-4 h-4" />
              Pending Invitations ({pendingInvites.length})
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {pendingInvites.map((invite) => (
              <div
                key={invite.id}
                className="flex items-center justify-between p-2 bg-white dark:bg-gray-800 rounded-lg"
              >
                <div className="flex items-center gap-2">
                  <Mail className="w-4 h-4 text-gray-400" />
                  <span className="text-sm">{invite.invited_email}</span>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleCancelInvite(invite.id)}
                  disabled={loading}
                  className="text-red-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/30"
                >
                  <X className="w-4 h-4" />
                </Button>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Member list */}
      <div className="space-y-3">
        {sortedMembers.map((member) => {
          const initials = member.profile?.full_name
            ?.split(' ')
            .map((n) => n[0])
            .join('')
            .toUpperCase() || '?';

          const isCurrentUser = member.user_id === currentUserId;
          const name = isCurrentUser
            ? `${member.profile?.full_name || 'Unknown'} (You)`
            : member.profile?.full_name || 'Unknown';

          return (
            <Card
              key={member.id}
              className={isCurrentUser ? 'ring-2 ring-emerald-500' : ''}
            >
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Avatar className="w-10 h-10">
                      <AvatarFallback
                        className={
                          isCurrentUser
                            ? 'bg-emerald-100 text-emerald-600 dark:bg-emerald-900 dark:text-emerald-400'
                            : 'bg-purple-100 text-purple-600 dark:bg-purple-900 dark:text-purple-400'
                        }
                      >
                        {initials}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <p className="font-medium text-gray-900 dark:text-white">
                        {name}
                      </p>
                      <p className="text-sm text-gray-500 dark:text-gray-400">
                        Joined {new Date(member.joined_at).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {member.role === 'admin' && (
                      <Badge
                        variant="secondary"
                        className="bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400"
                      >
                        <Crown className="w-3 h-3 mr-1" />
                        Admin
                      </Badge>
                    )}
                    {isAdmin && !isCurrentUser && (
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-8 w-8">
                            <MoreVertical className="w-4 h-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem
                            onClick={() => handleToggleRole(member.user_id, member.role)}
                            disabled={loading}
                          >
                            {member.role === 'admin' ? (
                              <>
                                <ShieldOff className="w-4 h-4 mr-2" />
                                Remove Admin
                              </>
                            ) : (
                              <>
                                <Shield className="w-4 h-4 mr-2" />
                                Make Admin
                              </>
                            )}
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem
                            onClick={() => handleRemoveMember(member.user_id)}
                            disabled={loading}
                            className="text-red-600 focus:text-red-600"
                          >
                            <UserMinus className="w-4 h-4 mr-2" />
                            Remove from Group
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
