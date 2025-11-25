'use client';

import { useFormStatus } from 'react-dom';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Loader2, Users } from 'lucide-react';
import type { ExpenseGroup } from '@/types';

interface GroupFormProps {
  group?: ExpenseGroup | null;
  action: (formData: FormData) => Promise<{ error?: string; success?: boolean }>;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

function SubmitButton({ isEdit }: { isEdit: boolean }) {
  const { pending } = useFormStatus();

  return (
    <Button
      type="submit"
      className="w-full bg-emerald-500 hover:bg-emerald-600"
      disabled={pending}
    >
      {pending ? (
        <>
          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
          {isEdit ? 'Updating...' : 'Creating...'}
        </>
      ) : (
        <>
          <Users className="w-4 h-4 mr-2" />
          {isEdit ? 'Update Group' : 'Create Group'}
        </>
      )}
    </Button>
  );
}

export function GroupForm({ group, action, open, onOpenChange }: GroupFormProps) {
  const handleSubmit = async (formData: FormData) => {
    const result = await action(formData);
    if (result?.error) {
      alert(result.error);
    } else {
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

          <SubmitButton isEdit={!!group} />
        </form>
      </DialogContent>
    </Dialog>
  );
}
