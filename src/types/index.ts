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

// Split method types for shared expenses
export type SplitMethod = 'equal' | 'exact' | 'percentage' | 'shares';

export interface ExpenseGroup {
  id: string;
  name: string;
  description: string | null;
  image_url: string | null;
  created_by: string;
  created_at: string;
  updated_at: string;
  creator?: Profile;
  members?: GroupMember[];
}

export interface GroupMember {
  id: string;
  group_id: string;
  user_id: string;
  role: 'admin' | 'member';
  nickname: string | null;
  joined_at: string;
  profile?: Profile;
}

export interface GroupInvitation {
  id: string;
  group_id: string;
  invited_email: string;
  invited_by: string;
  status: 'pending' | 'accepted' | 'declined' | 'expired';
  token: string;
  created_at: string;
  expires_at: string;
  group?: ExpenseGroup;
  inviter?: Profile;
}

export interface SharedExpense {
  id: string;
  group_id: string;
  paid_by: string;
  amount: number;
  description: string | null;
  category: string | null;
  date: string;
  split_method: SplitMethod;
  receipt_url: string | null;
  notes: string | null;
  created_at: string;
  payer?: Profile;
  splits?: ExpenseSplit[];
  group?: ExpenseGroup;
}

export interface ExpenseSplit {
  id: string;
  shared_expense_id: string;
  user_id: string;
  amount: number;
  shares: number | null;
  percentage: number | null;
  is_settled: boolean;
  settled_at: string | null;
  profile?: Profile;
}

export interface Settlement {
  id: string;
  group_id: string;
  from_user_id: string;
  to_user_id: string;
  amount: number;
  notes: string | null;
  created_at: string;
  from_user?: Profile;
  to_user?: Profile;
}

// Partial profile for group-related queries
export interface GroupMemberProfile {
  id: string;
  full_name: string | null;
  avatar_url: string | null;
}

export interface GroupBalance {
  user_id: string;
  profile?: GroupMemberProfile;
  total_paid: number;
  total_owed: number;
  net_balance: number; // positive = owed money, negative = owes money
}

export interface SimplifiedDebt {
  from_user_id: string;
  to_user_id: string;
  amount: number;
  from_user?: GroupMemberProfile;
  to_user?: GroupMemberProfile;
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
