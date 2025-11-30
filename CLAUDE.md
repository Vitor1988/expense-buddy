# Expense Buddy

A modern, full-featured expense tracker Progressive Web App built with Next.js 14 and Supabase.

## Tech Stack

- **Framework**: Next.js 14 (App Router)
- **Language**: TypeScript
- **Styling**: Tailwind CSS + shadcn/ui
- **Database**: Supabase (PostgreSQL)
- **Authentication**: Supabase Auth (email/password)
- **File Storage**: Supabase Storage
- **Charts**: Recharts
- **PWA**: next-pwa

## Project Structure

```
src/
├── app/                    # Next.js App Router pages
│   ├── (auth)/            # Auth pages (login, register, check-email)
│   ├── (dashboard)/       # Protected dashboard pages
│   │   └── groups/        # Shared expenses feature
│   │       ├── page.tsx           # Groups list
│   │       └── [id]/              # Group detail
│   │           ├── page.tsx       # Group overview with tabs
│   │           └── expenses/new/  # Add expense to group
│   ├── invite/[token]/    # Group invitation accept page
│   ├── api/               # API routes
│   ├── actions/           # Server actions
│   │   ├── auth.ts        # Authentication actions
│   │   ├── groups.ts      # Group/shared expenses actions
│   │   └── ...            # Other actions
│   └── layout.tsx         # Root layout
├── components/
│   ├── ui/                # shadcn/ui components
│   ├── expenses/          # Expense-related components
│   ├── budgets/           # Budget-related components
│   │   ├── budget-form.tsx
│   │   └── budgets-page-client.tsx  # Client wrapper for server component
│   ├── categories/        # Category-related components
│   │   ├── category-form.tsx
│   │   └── categories-page-client.tsx  # Client wrapper for server component
│   ├── recurring/         # Recurring expense components
│   │   ├── recurring-form.tsx
│   │   ├── recurring-card.tsx
│   │   └── recurring-page-client.tsx  # Client wrapper for server component
│   ├── settings/          # Settings components
│   │   └── settings-page-client.tsx  # Client wrapper for server component
│   ├── groups/            # Shared expenses components
│   │   ├── group-card.tsx
│   │   ├── group-form.tsx
│   │   ├── group-header.tsx
│   │   ├── group-tabs.tsx
│   │   ├── shared-expense-card.tsx
│   │   ├── shared-expense-form.tsx
│   │   ├── split-preview.tsx
│   │   ├── balance-summary.tsx
│   │   ├── balance-card.tsx
│   │   ├── member-list.tsx
│   │   ├── member-card.tsx
│   │   ├── member-invite-form.tsx
│   │   └── pending-invitations-banner.tsx
│   ├── charts/            # Chart components
│   ├── layout/            # Layout components (sidebar, header)
│   └── shared/            # Shared/common components
├── lib/
│   ├── supabase/          # Supabase client configuration
│   ├── utils.ts           # Utility functions
│   └── validations.ts     # Zod schemas for validation
├── hooks/                 # Custom React hooks
│   └── use-formatter.ts   # Memoized currency formatter hook
└── types/                 # TypeScript type definitions
```

## Key Conventions

### File Naming
- Components: PascalCase (e.g., `ExpenseCard.tsx`)
- Utilities/hooks: camelCase (e.g., `useExpenses.ts`)
- Pages: lowercase with hyphens via folder names

### Component Structure
- Use functional components with TypeScript
- Props interface defined above component
- Export as default for pages, named for components

### Styling
- Use Tailwind CSS utility classes
- Mobile-first responsive design (sm:, md:, lg: breakpoints)
- Dark mode support via `dark:` variant
- shadcn/ui for consistent component styling

### State Management
- React hooks for local state
- Supabase real-time for synced data
- URL state for filters/pagination

### API Routes
- Located in `src/app/api/`
- Use Next.js Route Handlers
- Validate input with Zod
- Return consistent JSON responses

## Database Tables

- `profiles` - User profiles (extends Supabase auth)
- `categories` - Expense categories
- `expenses` - Individual expenses
- `budgets` - Budget limits per category
- `recurring_expenses` - Recurring expense templates
- `expense_groups` - Groups for shared expenses
- `group_members` - Group membership (with role: admin/member)
- `group_invitations` - Pending group invitations with tokens
- `shared_expenses` - Shared expense records (with split_method)
- `expense_splits` - How expenses are split (amount, shares, percentage)
- `settlements` - Payment settlements between members

## Environment Variables

```env
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
```

## Commands

```bash
npm run dev      # Start development server
npm run build    # Build for production
npm run start    # Start production server
npm run lint     # Run ESLint
```

## Features

- Expense tracking with categories and tags
- Budget management with alerts
- Recurring expenses
- Reports and analytics with charts
- CSV/Excel export
- Receipt image upload
- Shared expenses (split bills) - Splitwise-style
- Dark/light mode
- PWA (installable on mobile)
- Mobile-first responsive design

## Shared Expenses Implementation Status

### Phase 1: Foundation (MVP) - COMPLETED
- [x] Database schema and TypeScript types
- [x] Server actions for groups CRUD
- [x] Server actions for shared expenses
- [x] Groups navigation in sidebar/bottom-nav/header
- [x] Groups list page with create group dialog
- [x] Group detail page with tabs (Activity/Balances/Members)
- [x] Add expense page with equal splits
- [x] Balance calculations and display

### Phase 2: Invitations - COMPLETED
- [x] Server actions for invitations (send, accept, decline, cancel)
- [x] Member management actions (remove, change role, leave)
- [x] Invitation accept page (`/invite/[token]`)
- [x] Pending invitations banner on groups list
- [x] Member list with admin actions
- [x] Invite member dialog with email and copy link

### Phase 3: Advanced Splits - COMPLETED
- [x] Split calculator library (equal, percentage, shares, exact)
- [x] Split method selector UI
- [x] Dynamic split inputs per method
- [x] Edit expense functionality

### Phase 4: Settlements & Debt Simplification - COMPLETED
- [x] Debt simplification algorithm
- [x] Settlement recording
- [x] Settle up dialog
- [x] Activity feed with settlements

### Phase 5: Polish - IN PROGRESS
- [x] Toast notifications for all actions
- [x] Skeleton loaders
- [x] Server components for faster page loads (budgets, categories, recurring, settings)
- [x] Loading states for categories, recurring, settings pages
- [x] Performance optimizations (useMemo/useCallback, batch queries, lazy loading)
- [x] ErrorBoundary component for graceful error handling
- [x] Pagination for expenses page (20 items per page)
- [ ] Edge case handling
- [ ] Dashboard groups balance widget
- [ ] Mobile UX improvements

## Performance Patterns

- Use `useMemo` for expensive calculations and `Intl.NumberFormat` instances
- Use `useCallback` for functions passed as props
- Use `useRef` for debounce timeouts (not state)
- Use `useFormatter` hook from `@/hooks/use-formatter.ts` for currency formatting
- Wrap lazy-loaded components with `ErrorBoundary` from `@/components/shared`
- Use `Promise.all()` for parallel database queries
- Use Next.js `<Image>` instead of `<img>` for images
- Expenses page uses server-side pagination (20 items/page) via `getExpensesPaginated()`

## Supabase Configuration Required

To fix email confirmation redirects, configure in Supabase Dashboard:
1. Go to Authentication > URL Configuration
2. Set Site URL to your production URL (e.g., `https://your-domain.com`)
3. Add redirect URLs: `https://your-domain.com/**` and `http://localhost:3000/**` for development
