'use client';

import { useState } from 'react';
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
import { MoreVertical, Pencil, Trash2, Loader2 } from 'lucide-react';
import { type Category } from '@/types';
import { deleteCategory, updateCategory } from '@/app/actions/categories';
import { CategoryForm } from './category-form';

interface CategoryCardProps {
  category: Category;
  expenseCount: number;
}

export function CategoryCard({ category, expenseCount }: CategoryCardProps) {
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const handleDelete = async () => {
    setIsDeleting(true);
    const result = await deleteCategory(category.id);
    if (result?.error) {
      alert(result.error);
    }
    setIsDeleting(false);
    setShowDeleteDialog(false);
  };

  const handleUpdate = async (formData: FormData) => {
    return updateCategory(category.id, formData);
  };

  return (
    <>
      <Card className="hover:shadow-md transition-shadow">
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div
                className="w-12 h-12 rounded-full flex items-center justify-center text-xl"
                style={{
                  backgroundColor: category.color ? category.color + '20' : '#6b728020',
                }}
              >
                {category.icon || '📦'}
              </div>
              <div>
                <p className="font-medium text-gray-900 dark:text-white">
                  {category.name}
                </p>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  {expenseCount} expense{expenseCount !== 1 ? 's' : ''}
                </p>
              </div>
            </div>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="h-8 w-8">
                  <MoreVertical className="w-4 h-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => setShowEditDialog(true)}>
                  <Pencil className="w-4 h-4 mr-2" />
                  Edit
                </DropdownMenuItem>
                <DropdownMenuItem
                  className="text-red-600"
                  onClick={() => setShowDeleteDialog(true)}
                >
                  <Trash2 className="w-4 h-4 mr-2" />
                  Delete
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </CardContent>
      </Card>

      {/* Edit Dialog */}
      <CategoryForm
        category={category}
        action={handleUpdate}
        open={showEditDialog}
        onOpenChange={setShowEditDialog}
      />

      {/* Delete Dialog */}
      <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Category</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete &quot;{category.name}&quot;?
              {expenseCount > 0 && (
                <span className="block mt-2 text-amber-600 dark:text-amber-400">
                  This category has {expenseCount} expense{expenseCount !== 1 ? 's' : ''} associated with it.
                  Those expenses will be set to &quot;Uncategorized&quot;.
                </span>
              )}
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
