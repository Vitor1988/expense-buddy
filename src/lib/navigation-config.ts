import {
  LayoutDashboard,
  Receipt,
  PiggyBank,
  BarChart3,
  Settings,
  Repeat,
  FolderOpen,
  Users,
  UserPlus,
  Plus,
  type LucideIcon,
} from 'lucide-react';

export interface NavItem {
  href: string;
  label: string;
  icon: LucideIcon;
  isAction?: boolean;
}

/** Full sidebar navigation items (desktop) */
export const sidebarNavItems: NavItem[] = [
  { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/expenses', label: 'Expenses', icon: Receipt },
  { href: '/groups', label: 'Groups', icon: Users },
  { href: '/contacts', label: 'Contacts', icon: UserPlus },
  { href: '/categories', label: 'Categories', icon: FolderOpen },
  { href: '/budgets', label: 'Budgets', icon: PiggyBank },
  { href: '/recurring', label: 'Recurring', icon: Repeat },
  { href: '/reports', label: 'Reports', icon: BarChart3 },
  { href: '/settings', label: 'Settings', icon: Settings },
];

/** Bottom navigation items (mobile) */
export const bottomNavItems: NavItem[] = [
  { href: '/dashboard', label: 'Home', icon: LayoutDashboard },
  { href: '/expenses', label: 'Expenses', icon: Receipt },
  { href: '/expenses/new', label: 'Add', icon: Plus, isAction: true },
  { href: '/groups', label: 'Groups', icon: Users },
  { href: '/reports', label: 'Reports', icon: BarChart3 },
];
