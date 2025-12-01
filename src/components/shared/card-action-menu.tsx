'use client';

/**
 * Reusable action menu for cards (Edit, Delete, etc.).
 * Uses Popover with PopoverAnchor + onClick to avoid mobile scroll issues.
 *
 * DropdownMenu uses onPointerDown which fires during scroll gestures.
 * This approach uses onClick which only fires after the gesture completes,
 * behaving like native date pickers and other form elements.
 *
 * @module components/shared/card-action-menu
 */

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Popover, PopoverAnchor, PopoverContent } from '@/components/ui/popover';
import { MoreVertical, Pencil, Trash2 } from 'lucide-react';

export interface CardActionMenuProps {
  /** Handler for edit action (if omitted, edit item is not shown) */
  onEdit?: () => void;
  /** Handler for delete action (if omitted, delete item is not shown) */
  onDelete?: () => void;
  /** Label for edit action (default: 'Edit') */
  editLabel?: string;
  /** Label for delete action (default: 'Delete') */
  deleteLabel?: string;
  /** Additional menu items to render between edit and delete */
  children?: React.ReactNode;
  /** Additional CSS classes for the trigger button */
  className?: string;
}

export function CardActionMenu({
  onEdit,
  onDelete,
  editLabel = 'Edit',
  deleteLabel = 'Delete',
  children,
  className = '',
}: CardActionMenuProps) {
  const [open, setOpen] = useState(false);

  // Don't render if no actions
  if (!onEdit && !onDelete && !children) {
    return null;
  }

  const handleAction = (action: () => void) => {
    setOpen(false);
    action();
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverAnchor asChild>
        <Button
          variant="ghost"
          size="icon"
          className={`h-8 w-8 ${className}`}
          onClick={() => setOpen(true)}
        >
          <MoreVertical className="w-4 h-4" />
          <span className="sr-only">Open menu</span>
        </Button>
      </PopoverAnchor>
      <PopoverContent
        align="end"
        className="w-40 p-1"
        onOpenAutoFocus={(e) => e.preventDefault()}
      >
        <div className="flex flex-col">
          {onEdit && (
            <button
              onClick={() => handleAction(onEdit)}
              className="flex items-center gap-2 w-full px-2 py-1.5 text-sm rounded-sm hover:bg-accent hover:text-accent-foreground transition-colors text-left"
            >
              <Pencil className="w-4 h-4" />
              {editLabel}
            </button>
          )}
          {children}
          {onDelete && (
            <button
              onClick={() => handleAction(onDelete)}
              className="flex items-center gap-2 w-full px-2 py-1.5 text-sm rounded-sm hover:bg-accent text-red-600 dark:text-red-400 transition-colors text-left"
            >
              <Trash2 className="w-4 h-4" />
              {deleteLabel}
            </button>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}
