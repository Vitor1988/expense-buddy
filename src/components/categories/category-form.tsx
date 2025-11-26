'use client';

import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { FormSubmitButton } from '@/components/shared';
import { type Category } from '@/types';

interface CategoryFormProps {
  category?: Category;
  action: (formData: FormData) => Promise<{ error?: string; success?: boolean }>;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const EMOJI_OPTIONS = ['🍔', '🚗', '🛍️', '🎬', '💡', '💊', '✈️', '📚', '💅', '📦', '🏠', '💰', '🎮', '☕', '🎁', '🏋️', '🎵', '🐕'];

const COLOR_OPTIONS = [
  '#ef4444', '#f97316', '#eab308', '#22c55e', '#3b82f6',
  '#8b5cf6', '#ec4899', '#06b6d4', '#f43f5e', '#6b7280',
];

export function CategoryForm({ category, action, open, onOpenChange }: CategoryFormProps) {
  const handleSubmit = async (formData: FormData) => {
    const result = await action(formData);
    if (result?.success) {
      onOpenChange(false);
    } else if (result?.error) {
      alert(result.error);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{category ? 'Edit Category' : 'New Category'}</DialogTitle>
        </DialogHeader>
        <form action={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Name</Label>
            <Input
              id="name"
              name="name"
              placeholder="Category name"
              defaultValue={category?.name || ''}
              required
            />
          </div>

          <div className="space-y-2">
            <Label>Icon</Label>
            <div className="grid grid-cols-9 gap-2">
              {EMOJI_OPTIONS.map((emoji) => (
                <label key={emoji} className="cursor-pointer">
                  <input
                    type="radio"
                    name="icon"
                    value={emoji}
                    defaultChecked={category?.icon === emoji || (!category && emoji === '📦')}
                    className="sr-only peer"
                  />
                  <div className="w-10 h-10 flex items-center justify-center text-xl rounded-lg border-2 border-transparent peer-checked:border-emerald-500 peer-checked:bg-emerald-50 dark:peer-checked:bg-emerald-900/30 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors">
                    {emoji}
                  </div>
                </label>
              ))}
            </div>
          </div>

          <div className="space-y-2">
            <Label>Color</Label>
            <div className="flex gap-2 flex-wrap">
              {COLOR_OPTIONS.map((color) => (
                <label key={color} className="cursor-pointer">
                  <input
                    type="radio"
                    name="color"
                    value={color}
                    defaultChecked={category?.color === color || (!category && color === '#6b7280')}
                    className="sr-only peer"
                  />
                  <div
                    className="w-8 h-8 rounded-full border-2 border-transparent peer-checked:border-gray-900 dark:peer-checked:border-white peer-checked:ring-2 peer-checked:ring-offset-2 transition-all"
                    style={{ backgroundColor: color }}
                  />
                </label>
              ))}
            </div>
          </div>

          <FormSubmitButton
            className="w-full bg-emerald-500 hover:bg-emerald-600"
            loadingText={category ? 'Updating...' : 'Creating...'}
          >
            {category ? 'Update Category' : 'Create Category'}
          </FormSubmitButton>
        </form>
      </DialogContent>
    </Dialog>
  );
}
