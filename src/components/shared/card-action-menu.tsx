'use client';

/**
 * Reusable dropdown menu for card actions (Edit, Delete, etc.).
 * Use this component in card components that need action buttons.
 *
 * @module components/shared/card-action-menu
 * @see MODULES.md for full documentation
 *
 * @example
 * // Basic usage with edit and delete
 * <CardActionMenu
 *   onEdit={() => setShowEditDialog(true)}
 *   onDelete={() => setShowDeleteDialog(true)}
 * />
 *
 * @example
 * // With custom labels
 * <CardActionMenu
 *   onEdit={handleEdit}
 *   onDelete={handleDelete}
 *   editLabel="Modify"
 *   deleteLabel="Remove"
 * />
 *
 * @example
 * // With additional custom menu items
 * <CardActionMenu onDelete={handleDelete}>
 *   <DropdownMenuItem onClick={handleDuplicate}>
 *     <Copy className="w-4 h-4 mr-2" />
 *     Duplicate
 *   </DropdownMenuItem>
 * </CardActionMenu>
 */

import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
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
  // Don't render if no actions
  if (!onEdit && !onDelete && !children) {
    return null;
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className={`h-8 w-8 touch-manipulation ${className}`}
        >
          <MoreVertical className="w-4 h-4" />
          <span className="sr-only">Open menu</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        {onEdit && (
          <DropdownMenuItem onClick={onEdit}>
            <Pencil className="w-4 h-4 mr-2" />
            {editLabel}
          </DropdownMenuItem>
        )}
        {children}
        {onDelete && (
          <DropdownMenuItem
            onClick={onDelete}
            className="text-red-600 focus:text-red-600 dark:text-red-400 dark:focus:text-red-400"
          >
            <Trash2 className="w-4 h-4 mr-2" />
            {deleteLabel}
          </DropdownMenuItem>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
