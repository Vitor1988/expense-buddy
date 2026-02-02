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
  // Optional fields for owed expenses (inline splits)
  splitId?: string;       // Split ID for settling
  isSettled?: boolean;    // Whether this debt is settled
  owedTo?: string;        // Name of person user owes money to
  // Optional fields for payer view (inline shared expenses)
  pendingParticipants?: string[];   // Names of participants who haven't paid yet
  settledParticipants?: string[];   // Names of participants who have paid
  isSharedPayer?: boolean;          // Whether user is the payer of this shared expense
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
  group_id: string | null;  // null for inline/ad-hoc splits
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
  user_id: string | null;  // null when using contact_id for manual contacts
  contact_id: string | null;  // for manual contacts without profile
  amount: number;
  shares: number | null;
  percentage: number | null;
  is_settled: boolean;
  settled_at: string | null;
  category_id: string | null;  // user's chosen category when settling
  profile?: Profile;
  contact?: Contact;
  category?: Category;  // populated when fetched with category
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

// ============================================
// Contacts (for inline splits)
// ============================================

export type ContactSource = 'manual' | 'group_member';

export interface Contact {
  id: string;
  user_id: string;
  name: string;
  email: string | null;
  profile_id: string | null;
  source: ContactSource;
  source_group_id: string | null;
  is_approved: boolean;
  request_id: string | null;
  created_at: string;
  profile?: Profile;  // populated when profile_id is set
  group?: ExpenseGroup;  // populated when source_group_id is set
}

// ============================================
// Contact Requests
// ============================================

export type ContactRequestStatus = 'pending' | 'accepted' | 'rejected' | 'cancelled';

export interface ContactRequest {
  id: string;
  from_user_id: string;
  to_email: string;
  to_user_id: string | null;
  status: ContactRequestStatus;
  created_at: string;
  responded_at: string | null;
  // Populated via joins
  from_user?: Profile;
  to_user?: Profile;
}

// ============================================
// Unified Expenses (for combined listing)
// ============================================

export type UnifiedExpenseType = 'expense' | 'shared';

export interface SplitParticipant {
  name: string;
  amount: number;
  settled: boolean;
  profile_id?: string;
}

export interface UnifiedExpense {
  type: UnifiedExpenseType;
  id: string;
  amount: number;           // For shared: user's share (Via A)
  original_amount?: number; // For shared: total amount
  description: string | null;
  date: string;
  category_id: string | null;
  category?: Category;
  // Only for shared expenses
  split_method?: SplitMethod;
  participants?: SplitParticipant[];
  // Original data
  expense?: Expense;
  shared_expense?: SharedExpense;
  // For bidirectional shared expenses
  userRole?: 'payer' | 'debtor';  // 'payer' = paid for others, 'debtor' = owes money
  splitId?: string;               // ID of the split (for settlement)
  isSettled?: boolean;            // Whether user's debt is settled
  owedTo?: string;                // Name of person user owes money to
}

// Form data for creating inline shared expense
export interface InlineSplitData {
  enabled: boolean;
  participants: string[];  // contact IDs
  split_method: SplitMethod;
  split_values?: Record<string, number>;  // for exact/percentage/shares
}
