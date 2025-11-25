export interface Profile {
  id: string;
  full_name: string | null;
  avatar_url: string | null;
  currency: string;
  created_at: string;
}

export interface Category {
  id: string;
  user_id: string;
  name: string;
  icon: string | null;
  color: string | null;
  is_default: boolean;
  created_at: string;
}

export interface Expense {
  id: string;
  user_id: string;
  category_id: string | null;
  amount: number;
  description: string | null;
  notes: string | null;
  date: string;
  receipt_url: string | null;
  tags: string[];
  recurring_id: string | null;
  created_at: string;
  updated_at: string;
  category?: Category;
}

export interface Budget {
  id: string;
  user_id: string;
  category_id: string | null;
  amount: number;
  period: 'weekly' | 'monthly' | 'yearly';
  start_date: string | null;
  created_at: string;
  category?: Category;
}

export interface RecurringExpense {
  id: string;
  user_id: string;
  category_id: string | null;
  amount: number;
  description: string | null;
  frequency: 'daily' | 'weekly' | 'monthly' | 'yearly';
  next_date: string;
  is_active: boolean;
  created_at: string;
  category?: Category;
}

export interface ExpenseGroup {
  id: string;
  name: string;
  created_by: string;
  created_at: string;
}

export interface GroupMember {
  id: string;
  group_id: string;
  user_id: string;
  joined_at: string;
  profile?: Profile;
}

export interface SharedExpense {
  id: string;
  group_id: string;
  paid_by: string;
  amount: number;
  description: string | null;
  date: string;
  created_at: string;
  payer?: Profile;
}

export interface ExpenseSplit {
  id: string;
  shared_expense_id: string;
  user_id: string;
  amount: number;
  is_settled: boolean;
  settled_at: string | null;
  profile?: Profile;
}

// Form types
export interface ExpenseFormData {
  amount: number;
  description: string;
  category_id: string;
  date: Date;
  notes?: string;
  tags?: string[];
}

export interface BudgetFormData {
  amount: number;
  category_id: string;
  period: 'weekly' | 'monthly' | 'yearly';
  start_date?: Date;
}

export interface CategoryFormData {
  name: string;
  icon?: string;
  color?: string;
}

// Dashboard stats
export interface DashboardStats {
  totalSpent: number;
  totalBudget: number;
  expenseCount: number;
  topCategory: {
    name: string;
    amount: number;
  } | null;
}

// Chart data types
export interface SpendingByCategory {
  name: string;
  value: number;
  color: string;
}

export interface SpendingTrend {
  date: string;
  amount: number;
}

// Currency options
export const CURRENCIES = [
  { code: 'USD', symbol: '$', name: 'US Dollar' },
  { code: 'EUR', symbol: '€', name: 'Euro' },
  { code: 'GBP', symbol: '£', name: 'British Pound' },
  { code: 'CAD', symbol: 'C$', name: 'Canadian Dollar' },
  { code: 'AUD', symbol: 'A$', name: 'Australian Dollar' },
  { code: 'JPY', symbol: '¥', name: 'Japanese Yen' },
  { code: 'INR', symbol: '₹', name: 'Indian Rupee' },
  { code: 'BRL', symbol: 'R$', name: 'Brazilian Real' },
  { code: 'MXN', symbol: 'MX$', name: 'Mexican Peso' },
  { code: 'CHF', symbol: 'CHF', name: 'Swiss Franc' },
] as const;

export type CurrencyCode = typeof CURRENCIES[number]['code'];

// Monthly expense data for dashboard
export interface CategoryBreakdown {
  name: string;
  amount: number;
  percentage: number;
  color: string;
}

export interface MonthlyExpenseData {
  month: string;           // "2025-11"
  monthLabel: string;      // "November 2025"
  totalAmount: number;
  budgetAmount: number;
  budgetPercentage: number;
  expenseCount: number;
  expenses: Expense[];
  categoryBreakdown: CategoryBreakdown[];
}
