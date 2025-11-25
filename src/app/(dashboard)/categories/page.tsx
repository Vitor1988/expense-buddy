'use client';

import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Plus, FolderOpen, Loader2 } from 'lucide-react';
import { CategoryCard } from '@/components/categories/category-card';
import { CategoryForm } from '@/components/categories/category-form';
import { createCategory, getCategories, createDefaultCategories } from '@/app/actions/categories';
import { createClient } from '@/lib/supabase/client';
import { type Category } from '@/types';

export default function CategoriesPage() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [expenseCounts, setExpenseCounts] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);
  const [showNewDialog, setShowNewDialog] = useState(false);

  const loadData = useCallback(async () => {
    setLoading(true);

    // Get categories
    const { data: cats } = await getCategories();

    if (!cats || cats.length === 0) {
      await createDefaultCategories();
      const result = await getCategories();
      setCategories(result.data || []);
    } else {
      setCategories(cats);
    }

    // Get expense counts per category
    const supabase = createClient();
    const { data: counts } = await supabase
      .from('expenses')
      .select('category_id');

    if (counts) {
      const countMap: Record<string, number> = {};
      counts.forEach((expense) => {
        if (expense.category_id) {
          countMap[expense.category_id] = (countMap[expense.category_id] || 0) + 1;
        }
      });
      setExpenseCounts(countMap);
    }

    setLoading(false);
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleCreate = async (formData: FormData) => {
    const result = await createCategory(formData);
    if (result.success) {
      loadData();
    }
    return result;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-emerald-500" />
      </div>
    );
  }

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
      {categories.length > 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {categories.map((category) => (
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
