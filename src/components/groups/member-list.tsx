'use client';

import { Card, CardContent } from '@/components/ui/card';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Crown } from 'lucide-react';
import type { GroupMember } from '@/types';

interface MemberListProps {
  members: (GroupMember & {
    profile: { id: string; full_name: string | null; avatar_url: string | null };
  })[];
  currentUserId: string;
}

export function MemberList({ members, currentUserId }: MemberListProps) {
  // Sort members: current user first, then admins, then by name
  const sortedMembers = [...members].sort((a, b) => {
    if (a.user_id === currentUserId) return -1;
    if (b.user_id === currentUserId) return 1;
    if (a.role === 'admin' && b.role !== 'admin') return -1;
    if (a.role !== 'admin' && b.role === 'admin') return 1;
    return (a.profile?.full_name || '').localeCompare(b.profile?.full_name || '');
  });

  return (
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
                {member.role === 'admin' && (
                  <Badge
                    variant="secondary"
                    className="bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400"
                  >
                    <Crown className="w-3 h-3 mr-1" />
                    Admin
                  </Badge>
                )}
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
