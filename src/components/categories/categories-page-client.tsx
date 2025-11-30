'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Plus, FolderOpen } from 'lucide-react';
import { CategoryCard } from '@/components/categories/category-card';
import { CategoryForm } from '@/components/categories/category-form';
import { createCategory } from '@/app/actions/categories';
import { type Category } from '@/types';

interface CategoriesPageClientProps {
  categories: Category[];
  expenseCounts: Record<string, number>;
}

export function CategoriesPageClient({
  categories: initialCategories,
  expenseCounts,
}: CategoriesPageClientProps) {
  const router = useRouter();
  const [showNewDialog, setShowNewDialog] = useState(false);

  const handleCreate = async (formData: FormData) => {
    const result = await createCategory(formData);
    if (result.success) {
      router.refresh();
      setShowNewDialog(false);
    }
    return result;
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Categories</h1>
          <p className="text-gray-600 dark:text-gray-400">
            Organize your expenses with custom categories
          </p>
        </div>
        <Button
          className="bg-emerald-500 hover:bg-emerald-600"
          onClick={() => setShowNewDialog(true)}
        >
          <Plus className="w-4 h-4 mr-2" />
          Add Category
        </Button>
      </div>

      {/* Categories Grid */}
      {initialCategories.length > 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {initialCategories.map((category) => (
            <CategoryCard
              key={category.id}
              category={category}
              expenseCount={expenseCounts[category.id] || 0}
            />
          ))}
        </div>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle className="text-center">No categories yet</CardTitle>
          </CardHeader>
          <CardContent className="text-center">
            <FolderOpen className="w-12 h-12 mx-auto mb-4 text-gray-400" />
            <p className="text-gray-500 dark:text-gray-400 mb-4">
              Create categories to organize your expenses
            </p>
            <Button
              className="bg-emerald-500 hover:bg-emerald-600"
              onClick={() => setShowNewDialog(true)}
            >
              <Plus className="w-4 h-4 mr-2" />
              Add Category
            </Button>
          </CardContent>
        </Card>
      )}

      {/* New Category Dialog */}
      <CategoryForm
        action={handleCreate}
        open={showNewDialog}
        onOpenChange={setShowNewDialog}
      />
    </div>
  );
}
