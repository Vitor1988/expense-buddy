'use client';

import { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { CardActionMenu, DeleteConfirmationDialog } from '@/components/shared';
import { useDeleteAction } from '@/hooks/use-delete-action';
import { type Category } from '@/types';
import { deleteCategory, updateCategory } from '@/app/actions/categories';
import { CategoryForm } from './category-form';

interface CategoryCardProps {
  category: Category;
  expenseCount: number;
}

export function CategoryCard({ category, expenseCount }: CategoryCardProps) {
  const [showEditDialog, setShowEditDialog] = useState(false);
  const { showDialog, setShowDialog, handleDelete } = useDeleteAction(
    deleteCategory,
    category.id
  );

  const handleUpdate = async (formData: FormData) => {
    return updateCategory(category.id, formData);
  };

  const deleteDescription = expenseCount > 0
    ? `Are you sure you want to delete "${category.name}"? This category has ${expenseCount} expense${expenseCount !== 1 ? 's' : ''} associated with it. Those expenses will be set to "Uncategorized".`
    : `Are you sure you want to delete "${category.name}"?`;

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
            <CardActionMenu
              onEdit={() => setShowEditDialog(true)}
              onDelete={() => setShowDialog(true)}
            />
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
      <DeleteConfirmationDialog
        open={showDialog}
        onOpenChange={setShowDialog}
        onConfirm={handleDelete}
        title="Delete Category"
        description={deleteDescription}
      />
    </>
  );
}
