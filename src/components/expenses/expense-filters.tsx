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
import { Badge } from '@/components/ui/badge';
import { Search, X, SlidersHorizontal, ArrowUpDown } from 'lucide-react';
import { type Category } from '@/types';
import { useCallback, useRef, useMemo, useEffect } from 'react';

interface ExpenseFiltersProps {
  categories: Category[];
  currency?: string;
}

// Sort options configuration
const SORT_OPTIONS = [
  { value: 'date_desc', label: 'Date (Newest)' },
  { value: 'date_asc', label: 'Date (Oldest)' },
  { value: 'amount_desc', label: 'Amount (Highest)' },
  { value: 'amount_asc', label: 'Amount (Lowest)' },
];

export function ExpenseFilters({ categories, currency: _currency = 'EUR' }: ExpenseFiltersProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const searchTimeoutRef = useRef<NodeJS.Timeout>();
  const amountTimeoutRef = useRef<NodeJS.Timeout>();

  useEffect(() => {
    return () => {
      if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current);
      if (amountTimeoutRef.current) clearTimeout(amountTimeoutRef.current);
    };
  }, []);

  const updateFilters = useCallback(
    (key: string, value: string | null) => {
      const params = new URLSearchParams(searchParams.toString());
      if (value) {
        params.set(key, value);
      } else {
        params.delete(key);
      }
      // Reset to page 1 when filters change
      params.delete('page');
      router.push(`/expenses?${params.toString()}`);
    },
    [router, searchParams]
  );

  const removeFilter = useCallback(
    (key: string) => {
      const params = new URLSearchParams(searchParams.toString());
      params.delete(key);
      params.delete('page');
      router.push(`/expenses?${params.toString()}`);
    },
    [router, searchParams]
  );

  const clearFilters = () => {
    router.push('/expenses');
  };

  // Get current filter values
  const currentSearch = searchParams.get('search');
  const currentCategory = searchParams.get('category');
  const currentStartDate = searchParams.get('startDate');
  const currentEndDate = searchParams.get('endDate');
  const currentMinAmount = searchParams.get('minAmount');
  const currentMaxAmount = searchParams.get('maxAmount');
  const currentSort = searchParams.get('sort') || 'date_desc';

  // Check if any filters are active
  const hasFilters =
    currentSearch ||
    currentCategory ||
    currentStartDate ||
    currentEndDate ||
    currentMinAmount ||
    currentMaxAmount ||
    (currentSort && currentSort !== 'date_desc');

  // Build active filters for chips
  const activeFilters = useMemo(() => {
    const filters: { key: string; label: string; value: string }[] = [];

    if (currentSearch) {
      filters.push({ key: 'search', label: `"${currentSearch}"`, value: currentSearch });
    }

    if (currentCategory) {
      const category = categories.find((c) => c.id === currentCategory);
      if (category) {
        filters.push({ key: 'category', label: category.name, value: currentCategory });
      }
    }

    if (currentStartDate) {
      filters.push({
        key: 'startDate',
        label: `From: ${new Date(currentStartDate).toLocaleDateString()}`,
        value: currentStartDate,
      });
    }

    if (currentEndDate) {
      filters.push({
        key: 'endDate',
        label: `To: ${new Date(currentEndDate).toLocaleDateString()}`,
        value: currentEndDate,
      });
    }

    if (currentMinAmount) {
      filters.push({
        key: 'minAmount',
        label: `Min: ${currentMinAmount}`,
        value: currentMinAmount,
      });
    }

    if (currentMaxAmount) {
      filters.push({
        key: 'maxAmount',
        label: `Max: ${currentMaxAmount}`,
        value: currentMaxAmount,
      });
    }

    if (currentSort && currentSort !== 'date_desc') {
      const sortOption = SORT_OPTIONS.find((s) => s.value === currentSort);
      if (sortOption) {
        filters.push({ key: 'sort', label: sortOption.label, value: currentSort });
      }
    }

    return filters;
  }, [currentSearch, currentCategory, currentStartDate, currentEndDate, currentMinAmount, currentMaxAmount, currentSort, categories]);

  return (
    <div className="space-y-3 mb-6">
      {/* Main Filter Row */}
      <div className="flex flex-col lg:flex-row gap-3">
        {/* Search */}
        <div className="relative flex-1 min-w-0">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <Input
            placeholder="Search expenses..."
            className="pl-10"
            defaultValue={currentSearch || ''}
            onChange={(e) => {
              const value = e.target.value;
              if (searchTimeoutRef.current) {
                clearTimeout(searchTimeoutRef.current);
              }
              searchTimeoutRef.current = setTimeout(() => {
                updateFilters('search', value || null);
              }, 300);
            }}
          />
        </div>

        {/* Category Filter */}
        <Select
          value={currentCategory || 'all'}
          onValueChange={(value) =>
            updateFilters('category', value === 'all' ? null : value)
          }
        >
          <SelectTrigger className="w-full lg:w-[180px]">
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

        {/* Sort Dropdown */}
        <Select
          value={currentSort}
          onValueChange={(value) =>
            updateFilters('sort', value === 'date_desc' ? null : value)
          }
        >
          <SelectTrigger className="w-full lg:w-[160px]">
            <ArrowUpDown className="w-4 h-4 mr-2" />
            <SelectValue placeholder="Sort by" />
          </SelectTrigger>
          <SelectContent>
            {SORT_OPTIONS.map((option) => (
              <SelectItem key={option.value} value={option.value}>
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Second Row: Dates and Amount */}
      <div className="flex flex-col sm:flex-row gap-3">
        {/* Date Range */}
        <div className="flex gap-2 flex-1">
          <Input
            type="date"
            className="flex-1"
            placeholder="Start Date"
            value={currentStartDate || ''}
            onChange={(e) => updateFilters('startDate', e.target.value || null)}
          />
          <Input
            type="date"
            className="flex-1"
            placeholder="End Date"
            value={currentEndDate || ''}
            onChange={(e) => updateFilters('endDate', e.target.value || null)}
          />
        </div>

        {/* Amount Range */}
        <div className="flex gap-2 items-center">
          <SlidersHorizontal className="w-4 h-4 text-gray-400 hidden sm:block" />
          <Input
            type="number"
            className="w-24"
            placeholder="Min"
            min="0"
            step="0.01"
            defaultValue={currentMinAmount || ''}
            onChange={(e) => {
              const value = e.target.value;
              if (amountTimeoutRef.current) {
                clearTimeout(amountTimeoutRef.current);
              }
              amountTimeoutRef.current = setTimeout(() => {
                updateFilters('minAmount', value || null);
              }, 500);
            }}
          />
          <span className="text-gray-400">-</span>
          <Input
            type="number"
            className="w-24"
            placeholder="Max"
            min="0"
            step="0.01"
            defaultValue={currentMaxAmount || ''}
            onChange={(e) => {
              const value = e.target.value;
              if (amountTimeoutRef.current) {
                clearTimeout(amountTimeoutRef.current);
              }
              amountTimeoutRef.current = setTimeout(() => {
                updateFilters('maxAmount', value || null);
              }, 500);
            }}
          />
        </div>

        {/* Clear All Filters */}
        {hasFilters && (
          <Button
            variant="ghost"
            size="sm"
            onClick={clearFilters}
            className="text-gray-500 hover:text-gray-700"
          >
            <X className="w-4 h-4 mr-1" />
            Clear all
          </Button>
        )}
      </div>

      {/* Active Filter Chips */}
      {activeFilters.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {activeFilters.map((filter) => (
            <Badge
              key={filter.key}
              variant="secondary"
              className="pl-3 pr-1 py-1 flex items-center gap-1 cursor-pointer hover:bg-gray-200 dark:hover:bg-gray-700"
              onClick={() => removeFilter(filter.key)}
            >
              <span className="text-sm">{filter.label}</span>
              <Button
                variant="ghost"
                size="sm"
                className="h-5 w-5 p-0 hover:bg-transparent"
                onClick={(e) => {
                  e.stopPropagation();
                  removeFilter(filter.key);
                }}
              >
                <X className="w-3 h-3" />
              </Button>
            </Badge>
          ))}
        </div>
      )}
    </div>
  );
}
