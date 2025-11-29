'use client';

/**
 * Hook to manage delete action state and workflow.
 * Encapsulates the common pattern of showing a confirmation dialog,
 * handling the delete action, and managing loading state.
 *
 * @module hooks/use-delete-action
 * @see MODULES.md for full documentation
 *
 * @example
 * // Basic usage in a card component
 * const { showDialog, setShowDialog, isDeleting, handleDelete } = useDeleteAction(
 *   deleteExpense,
 *   expense.id
 * );
 *
 * return (
 *   <>
 *     <CardActionMenu onDelete={() => setShowDialog(true)} />
 *     <DeleteConfirmationDialog
 *       open={showDialog}
 *       onOpenChange={setShowDialog}
 *       onConfirm={handleDelete}
 *       isDeleting={isDeleting}
 *       title="Delete Expense"
 *     />
 *   </>
 * );
 *
 * @example
 * // With success/error callbacks
 * const { showDialog, setShowDialog, isDeleting, handleDelete } = useDeleteAction(
 *   deleteItem,
 *   item.id,
 *   {
 *     onSuccess: () => router.push('/items'),
 *     onError: (error) => console.error(error),
 *   }
 * );
 */

import { useState, useCallback } from 'react';
import { toast } from 'sonner';

export interface UseDeleteActionOptions {
  /** Callback when delete succeeds */
  onSuccess?: () => void;
  /** Callback when delete fails */
  onError?: (error: string) => void;
  /** Success toast message (if omitted, no success toast) */
  successMessage?: string;
  /** Whether to show error toast (default: true) */
  showErrorToast?: boolean;
}

export interface UseDeleteActionReturn {
  /** Whether the delete confirmation dialog is open */
  showDialog: boolean;
  /** Set the dialog open state */
  setShowDialog: (open: boolean) => void;
  /** Whether the delete action is in progress */
  isDeleting: boolean;
  /** Handler to execute the delete action */
  handleDelete: () => Promise<void>;
}

/**
 * Hook to manage delete action state and workflow.
 *
 * @param deleteAction - The async function to call for deletion
 * @param id - The ID of the item to delete
 * @param options - Optional callbacks and configuration
 * @returns Object with dialog state, loading state, and delete handler
 */
export function useDeleteAction(
  deleteAction: (id: string) => Promise<{ error?: string }>,
  id: string,
  options?: UseDeleteActionOptions
): UseDeleteActionReturn {
  const [showDialog, setShowDialog] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const handleDelete = useCallback(async () => {
    setIsDeleting(true);
    try {
      const result = await deleteAction(id);

      if (result?.error) {
        if (options?.showErrorToast !== false) {
          toast.error(result.error);
        }
        options?.onError?.(result.error);
      } else {
        if (options?.successMessage) {
          toast.success(options.successMessage);
        }
        options?.onSuccess?.();
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Delete failed';
      if (options?.showErrorToast !== false) {
        toast.error(message);
      }
      options?.onError?.(message);
    } finally {
      setIsDeleting(false);
      setShowDialog(false);
    }
  }, [deleteAction, id, options]);

  return {
    showDialog,
    setShowDialog,
    isDeleting,
    handleDelete,
  };
}
