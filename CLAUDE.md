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
│   ├── (auth)/            # Auth pages (login, register)
│   ├── (dashboard)/       # Protected dashboard pages
│   ├── api/               # API routes
│   └── layout.tsx         # Root layout
├── components/
│   ├── ui/                # shadcn/ui components
│   ├── expenses/          # Expense-related components
│   ├── budgets/           # Budget-related components
│   ├── charts/            # Chart components
│   ├── layout/            # Layout components (sidebar, header)
│   └── shared/            # Shared/common components
├── lib/
│   ├── supabase/          # Supabase client configuration
│   ├── utils.ts           # Utility functions
│   └── validations.ts     # Zod schemas for validation
├── hooks/                 # Custom React hooks
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
- `group_members` - Group membership
- `shared_expenses` - Shared expense records
- `expense_splits` - How expenses are split

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
- Shared expenses (split bills)
- Dark/light mode
- PWA (installable on mobile)
- Mobile-first responsive design
