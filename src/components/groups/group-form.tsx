'use client';

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Users } from 'lucide-react';
import { toast } from 'sonner';
import { FormSubmitButton } from '@/components/shared';
import type { ExpenseGroup } from '@/types';

interface GroupFormProps {
  group?: ExpenseGroup | null;
  action: (formData: FormData) => Promise<{ error?: string; success?: boolean }>;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function GroupForm({ group, action, open, onOpenChange }: GroupFormProps) {
  const handleSubmit = async (formData: FormData) => {
    const result = await action(formData);
    if (result?.error) {
      toast.error(result.error);
    } else {
      toast.success(group ? 'Group updated' : 'Group created');
      onOpenChange(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{group ? 'Edit Group' : 'Create Group'}</DialogTitle>
        </DialogHeader>
        <form action={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Group Name</Label>
            <Input
              id="name"
              name="name"
              placeholder="e.g., Roommates, Trip to Paris"
              defaultValue={group?.name || ''}
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description (optional)</Label>
            <Textarea
              id="description"
              name="description"
              placeholder="What's this group for?"
              defaultValue={group?.description || ''}
              rows={3}
            />
          </div>

          <FormSubmitButton
            className="w-full bg-emerald-500 hover:bg-emerald-600"
            loadingText={group ? 'Updating...' : 'Creating...'}
            icon={<Users className="w-4 h-4 mr-2" />}
          >
            {group ? 'Update Group' : 'Create Group'}
          </FormSubmitButton>
        </form>
      </DialogContent>
    </Dialog>
  );
}
