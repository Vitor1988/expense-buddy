'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { ArrowLeft, Settings, Pencil, Trash2, Loader2 } from 'lucide-react';
import { deleteGroup } from '@/app/actions/groups';
import type { ExpenseGroup, GroupMember } from '@/types';

interface GroupHeaderProps {
  group: ExpenseGroup & {
    members: (GroupMember & { profile: { id: string; full_name: string | null; avatar_url: string | null } })[];
  };
  currentUserId: string;
  onEdit: () => void;
}

export function GroupHeader({ group, currentUserId, onEdit }: GroupHeaderProps) {
  // Check if current user is an admin
  const isAdmin = group.members.some(
    (m) => m.user_id === currentUserId && m.role === 'admin'
  );
  const router = useRouter();
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const handleDelete = async () => {
    setIsDeleting(true);
    const result = await deleteGroup(group.id);
    if (result.error) {
      alert(result.error);
      setIsDeleting(false);
    } else {
      router.push('/groups');
    }
  };

  return (
    <>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href="/groups">
            <Button variant="ghost" size="icon">
              <ArrowLeft className="w-5 h-5" />
            </Button>
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
              {group.name}
            </h1>
            {group.description && (
              <p className="text-gray-600 dark:text-gray-400">
                {group.description}
              </p>
            )}
          </div>
        </div>

        <div className="flex items-center gap-3">
          {/* Member avatars */}
          <div className="hidden sm:flex -space-x-2">
            {group.members.slice(0, 5).map((member) => {
              const initials = member.profile?.full_name
                ?.split(' ')
                .map((n) => n[0])
                .join('')
                .toUpperCase() || '?';

              return (
                <Avatar
                  key={member.id}
                  className="w-8 h-8 border-2 border-white dark:border-gray-900"
                >
                  <AvatarFallback className="text-xs bg-purple-100 text-purple-600 dark:bg-purple-900 dark:text-purple-400">
                    {initials}
                  </AvatarFallback>
                </Avatar>
              );
            })}
            {group.members.length > 5 && (
              <div className="w-8 h-8 rounded-full bg-gray-200 dark:bg-gray-700 flex items-center justify-center border-2 border-white dark:border-gray-900">
                <span className="text-xs font-medium text-gray-600 dark:text-gray-400">
                  +{group.members.length - 5}
                </span>
              </div>
            )}
          </div>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="icon">
                <Settings className="w-4 h-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              {isAdmin && (
                <DropdownMenuItem onClick={onEdit}>
                  <Pencil className="w-4 h-4 mr-2" />
                  Edit Group
                </DropdownMenuItem>
              )}
              {isAdmin && (
                <DropdownMenuItem
                  onClick={() => setShowDeleteDialog(true)}
                  className="text-red-600 dark:text-red-400"
                >
                  <Trash2 className="w-4 h-4 mr-2" />
                  Delete Group
                </DropdownMenuItem>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Group</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete &quot;{group.name}&quot;? This will delete all
              expenses and settlements. This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowDeleteDialog(false)}
              disabled={isDeleting}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleDelete}
              disabled={isDeleting}
            >
              {isDeleting ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Deleting...
                </>
              ) : (
                'Delete'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
