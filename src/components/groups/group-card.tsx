'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
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
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { MoreVertical, Trash2, Pencil, Users, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { deleteGroup } from '@/app/actions/groups';
import type { ExpenseGroup } from '@/types';

interface GroupCardProps {
  group: ExpenseGroup & { member_count: number; your_balance: number };
  currency: string;
  onEdit: () => void;
  onDeleted: () => void;
}

export function GroupCard({ group, currency, onEdit, onDeleted }: GroupCardProps) {
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const formatter = new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency,
  });

  const handleDelete = async () => {
    setIsDeleting(true);
    const result = await deleteGroup(group.id);
    if (result.error) {
      toast.error(result.error);
    } else {
      toast.success('Group deleted');
      onDeleted();
    }
    setIsDeleting(false);
    setShowDeleteDialog(false);
  };

  const balanceText = group.your_balance > 0
    ? `You are owed ${formatter.format(group.your_balance)}`
    : group.your_balance < 0
    ? `You owe ${formatter.format(Math.abs(group.your_balance))}`
    : 'Settled up';

  const balanceColor = group.your_balance > 0
    ? 'text-emerald-600 dark:text-emerald-400'
    : group.your_balance < 0
    ? 'text-red-600 dark:text-red-400'
    : 'text-gray-500 dark:text-gray-400';

  return (
    <>
      <Card className="hover:shadow-md transition-shadow">
        <CardContent className="p-4">
          <div className="flex items-start justify-between">
            <Link href={`/groups/${group.id}`} className="flex-1">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-full bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center">
                  <Users className="w-6 h-6 text-purple-600 dark:text-purple-400" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-gray-900 dark:text-white truncate">
                    {group.name}
                  </p>
                  {group.description && (
                    <p className="text-sm text-gray-500 dark:text-gray-400 truncate">
                      {group.description}
                    </p>
                  )}
                  <div className="flex items-center gap-2 mt-1">
                    <div className="flex -space-x-2">
                      {Array.from({ length: Math.min(group.member_count, 3) }).map((_, i) => (
                        <Avatar key={i} className="w-6 h-6 border-2 border-white dark:border-gray-900">
                          <AvatarFallback className="text-xs bg-gray-200 dark:bg-gray-700">
                            {i + 1}
                          </AvatarFallback>
                        </Avatar>
                      ))}
                    </div>
                    <span className="text-xs text-gray-500 dark:text-gray-400">
                      {group.member_count} member{group.member_count !== 1 ? 's' : ''}
                    </span>
                  </div>
                </div>
              </div>
            </Link>

            <div className="flex items-center gap-2">
              <div className="text-right">
                <p className={`text-sm font-medium ${balanceColor}`}>
                  {balanceText}
                </p>
              </div>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon" className="h-8 w-8">
                    <MoreVertical className="w-4 h-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={onEdit}>
                    <Pencil className="w-4 h-4 mr-2" />
                    Edit
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={() => setShowDeleteDialog(true)}
                    className="text-red-600 dark:text-red-400"
                  >
                    <Trash2 className="w-4 h-4 mr-2" />
                    Delete
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        </CardContent>
      </Card>

      <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Group</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete &quot;{group.name}&quot;? This will delete all
              expenses and settlements in this group. This action cannot be undone.
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
