'use client';

import { useToast } from '@/hooks/use-toast';
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

const EMOJI_OPTIONS = [
  // Food & Drinks
  '🍔', '🍕', '🍜', '🍣', '🥗', '☕', '🍺', '🍷', '🧁', '🍰',
  // Transport
  '🚗', '🚌', '🚇', '✈️', '🚲', '⛽', '🚕', '🛵', '🚀',
  // Shopping
  '🛍️', '🛒', '👕', '👟', '💎', '🎁', '👜', '🧴',
  // Entertainment
  '🎬', '🎮', '🎵', '📺', '🎭', '🎨', '📷', '🎤', '🎧',
  // Home & Bills
  '🏠', '💡', '📱', '💻', '🔌', '🛋️', '🔑', '📡',
  // Health & Fitness
  '💊', '🏥', '🏋️', '🧘', '💆', '🩺', '💉',
  // Education & Work
  '📚', '🎓', '💼', '📝', '🖊️', '📎',
  // Pets & Nature
  '🐕', '🐈', '🌱', '🌳', '🐾', '🦜',
  // Finance
  '💰', '💳', '🏦', '📈', '💵', '🪙',
  // Other
  '📦', '🔧', '✂️', '🎯', '⭐', '❤️', '🔥', '💡',
];

const COLOR_OPTIONS = [
  // Reds
  '#ef4444', '#dc2626', '#b91c1c',
  // Oranges
  '#f97316', '#ea580c',
  // Yellows/Amber
  '#eab308', '#ca8a04', '#f59e0b',
  // Greens
  '#22c55e', '#16a34a', '#15803d', '#10b981',
  // Blues
  '#3b82f6', '#2563eb', '#1d4ed8', '#0ea5e9',
  // Purples
  '#8b5cf6', '#7c3aed', '#6d28d9', '#a855f7',
  // Pinks
  '#ec4899', '#db2777', '#f43f5e', '#e11d48',
  // Cyans/Teals
  '#06b6d4', '#0891b2', '#14b8a6',
  // Grays
  '#6b7280', '#4b5563', '#374151',
];

export function CategoryForm({ category, action, open, onOpenChange }: CategoryFormProps) {
  const { toast } = useToast();

  const handleSubmit = async (formData: FormData) => {
    const result = await action(formData);
    if (result?.success) {
      onOpenChange(false);
    } else if (result?.error) {
      toast({
        title: 'Error',
        description: result.error,
        variant: 'destructive',
      });
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{category ? 'Edit Category' : 'New Category'}</DialogTitle>
        </DialogHeader>
        <form action={handleSubmit} className="space-y-4 max-h-[60vh] overflow-y-auto pr-1">
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
            <div className="grid grid-cols-10 gap-2">
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
