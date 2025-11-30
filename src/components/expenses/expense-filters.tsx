'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Search, X } from 'lucide-react';
import { type Category } from '@/types';
import { useCallback, useRef } from 'react';

interface ExpenseFiltersProps {
  categories: Category[];
}

export function ExpenseFilters({ categories }: ExpenseFiltersProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const searchTimeoutRef = useRef<NodeJS.Timeout>();

  const updateFilters = useCallback(
    (key: string, value: string | null) => {
      const params = new URLSearchParams(searchParams.toString());
      if (value) {
        params.set(key, value);
      } else {
        params.delete(key);
      }
      router.push(`/expenses?${params.toString()}`);
    },
    [router, searchParams]
  );

  const clearFilters = () => {
    router.push('/expenses');
  };

  const hasFilters =
    searchParams.has('search') ||
    searchParams.has('category') ||
    searchParams.has('startDate') ||
    searchParams.has('endDate');

  return (
    <div className="flex flex-col sm:flex-row gap-3 mb-6">
      {/* Search */}
      <div className="relative flex-1">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
        <Input
          placeholder="Search expenses..."
          className="pl-10"
          defaultValue={searchParams.get('search') || ''}
          onChange={(e) => {
            const value = e.target.value;
            // Clear previous timeout
            if (searchTimeoutRef.current) {
              clearTimeout(searchTimeoutRef.current);
            }
            // Debounce the search
            searchTimeoutRef.current = setTimeout(() => {
              updateFilters('search', value || null);
            }, 300);
          }}
        />
      </div>

      {/* Category Filter */}
      <Select
        value={searchParams.get('category') || 'all'}
        onValueChange={(value) =>
          updateFilters('category', value === 'all' ? null : value)
        }
      >
        <SelectTrigger className="w-full sm:w-[180px]">
          <SelectValue placeholder="All Categories" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All Categories</SelectItem>
          {categories.map((category) => (
            <SelectItem key={category.id} value={category.id}>
              <span className="flex items-center gap-2">
                <span>{category.icon}</span>
                <span>{category.name}</span>
              </span>
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {/* Date Range - side by side on mobile */}
      <div className="flex gap-2 w-full sm:w-auto sm:contents">
        <Input
          type="date"
          className="flex-1 sm:flex-none sm:w-[180px]"
          placeholder="Start Date"
          value={searchParams.get('startDate') || ''}
          onChange={(e) => updateFilters('startDate', e.target.value || null)}
        />
        <Input
          type="date"
          className="flex-1 sm:flex-none sm:w-[180px]"
          placeholder="End Date"
          value={searchParams.get('endDate') || ''}
          onChange={(e) => updateFilters('endDate', e.target.value || null)}
        />
      </div>

      {/* Clear Filters */}
      {hasFilters && (
        <Button variant="ghost" size="icon" onClick={clearFilters}>
          <X className="w-4 h-4" />
        </Button>
      )}
    </div>
  );
}
