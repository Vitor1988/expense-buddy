# Expense Buddy Modules Documentation

This document describes the reusable modules in Expense Buddy. Use these modules when building new features to maintain consistency and avoid code duplication.

## Table of Contents

- [Utility Libraries](#utility-libraries)
  - [auth-helpers](#auth-helpers)
  - [currency](#currency)
  - [validations](#validations)
  - [action-types](#action-types)
  - [member-helpers](#member-helpers)
- [Shared Components](#shared-components)
  - [FormSubmitButton](#formsubmitbutton)
  - [DeleteConfirmationDialog](#deleteconfirmationdialog)
  - [CurrencyInput](#currencyinput)
  - [CategorySelect](#categoryselect)
  - [CardActionMenu](#cardactionmenu)
  - [IconBadge](#iconbadge)
- [Custom Hooks](#custom-hooks)
  - [useDeleteAction](#usedeleteaction)
- [Usage Patterns](#usage-patterns)

---

## Utility Libraries

### auth-helpers

**Location:** `src/lib/auth-helpers.ts`

Provides authenticated Supabase client for server actions.

```typescript
import { getAuthenticatedUser } from '@/lib/auth-helpers';

export async function myServerAction() {
  const { user, supabase, error } = await getAuthenticatedUser();
  if (error || !user || !supabase) {
    return { error: error || 'Not authenticated' };
  }

  // Use supabase client here
  const { data, error: dbError } = await supabase
    .from('my_table')
    .select('*')
    .eq('user_id', user.id);
}
```

**Note:** Always rename inner error variables to `dbError` to avoid shadowing.

---

### currency

**Location:** `src/lib/currency.ts`

Utilities for consistent currency formatting across the app.

```typescript
import { formatCurrency, createCurrencyFormatter } from '@/lib/currency';

// Quick format (defaults to USD)
formatCurrency(123.45); // "$123.45"
formatCurrency(123.45, 'EUR'); // "€123.45"

// Reusable formatter for multiple values
const formatter = createCurrencyFormatter('USD');
formatter.format(100); // "$100.00"
formatter.format(200); // "$200.00"
```

**When to use:**
- Displaying expense amounts
- Showing budget totals
- Formatting settlement amounts

---

### validations

**Location:** `src/lib/validations.ts`

Zod schemas for form and data validation.

```typescript
import {
  expenseSchema,
  budgetSchema,
  categorySchema,
  groupSchema,
  parseFormData
} from '@/lib/validations';

// Validate expense form
const result = expenseSchema.safeParse({
  amount: 50,
  description: 'Lunch',
  date: '2024-01-15',
  category_id: 'cat-123'
});

// Parse FormData with schema
const data = parseFormData(formData, expenseSchema);
```

**Available schemas:**
- `expenseSchema` - Individual expenses
- `budgetSchema` - Budget limits
- `categorySchema` - Expense categories
- `recurringSchema` - Recurring expenses
- `groupSchema` - Expense groups
- `sharedExpenseSchema` - Shared expenses

---

### action-types

**Location:** `src/lib/action-types.ts`

Standard return types for server actions using discriminated unions.

```typescript
import type { ActionResult, DataResult, ListResult } from '@/lib/action-types';

// Simple success/error actions
export async function createItem(data: FormData): Promise<ActionResult> {
  // ... create logic
  return { success: true };
  // or return { error: 'Failed to create' };
}

// Actions returning single item
export async function getItem(id: string): Promise<DataResult<Item>> {
  // ... fetch logic
  return { data: item };
  // or return { data: null, error: 'Not found' };
}

// Actions returning lists
export async function getItems(): Promise<ListResult<Item>> {
  // ... fetch logic
  return { data: items };
  // or return { data: [], error: 'Failed to fetch' };
}
```

**Why use these:**
- Consistent error handling patterns
- Type-safe responses
- Easier to handle in components

---

### member-helpers

**Location:** `src/lib/member-helpers.ts`

Utilities for working with group members.

```typescript
import {
  getMemberName,
  getMemberInitials,
  getProfileName,
  getInitials,
  getMemberById,
  isGroupAdmin,
  getGroupAdmins,
  sortMembersByRole
} from '@/lib/member-helpers';

// Get display name from member
getMemberName({ profile: { full_name: 'John Doe' } }); // 'John Doe'
getMemberName({ profile: null }); // 'Unknown'

// Get initials for avatars
getMemberInitials({ profile: { full_name: 'John Doe' } }); // 'JD'
getInitials('Jane Smith'); // 'JS'

// Check admin status
if (isGroupAdmin(members, currentUserId)) {
  // Show admin controls
}

// Sort members (admins first)
const sorted = sortMembersByRole(members);
```

**When to use:**
- Displaying member names in groups
- Avatar placeholders
- Member permission checks

---

## Shared Components

All shared components are exported from `@/components/shared`.

```typescript
import {
  FormSubmitButton,
  DeleteConfirmationDialog,
  CurrencyInput,
  CategorySelect,
  CardActionMenu,
  IconBadge
} from '@/components/shared';
```

---

### FormSubmitButton

**Location:** `src/components/shared/form-submit-button.tsx`

Submit button with automatic loading state using `useFormStatus`.

```tsx
<form action={serverAction}>
  {/* form fields */}
  <FormSubmitButton>Create Expense</FormSubmitButton>
  <FormSubmitButton loadingText="Saving...">Save Changes</FormSubmitButton>
</form>
```

**Props:**
- `children` - Button text
- `loadingText` - Text shown during submission (default: "Submitting...")
- `className` - Additional CSS classes

---

### DeleteConfirmationDialog

**Location:** `src/components/shared/delete-confirmation-dialog.tsx`

Reusable confirmation dialog for delete operations.

```tsx
const [open, setOpen] = useState(false);

<DeleteConfirmationDialog
  open={open}
  onOpenChange={setOpen}
  onConfirm={handleDelete}
  title="Delete Expense"
  description="Are you sure? This cannot be undone."
/>
```

**Props:**
- `open` - Dialog visibility state
- `onOpenChange` - Callback when visibility changes
- `onConfirm` - Async callback executed on confirm
- `title` - Dialog title
- `description` - Explanatory text

---

### CurrencyInput

**Location:** `src/components/shared/currency-input.tsx`

Currency-formatted input field with proper validation.

```tsx
<CurrencyInput
  name="amount"
  label="Amount"
  currency="USD"
  defaultValue={100}
  required
/>
```

**Props:**
- `name` - Form field name
- `label` - Input label
- `currency` - Currency code (default: "USD")
- `defaultValue` - Initial value
- `placeholder` - Placeholder text
- `required` - Whether field is required
- `className` - Additional CSS classes

---

### CategorySelect

**Location:** `src/components/shared/category-select.tsx`

Dropdown for selecting expense categories.

```tsx
<CategorySelect
  categories={categories}
  defaultValue={expense?.category_id}
  label="Category"
  showAllOption  // For budget form
/>
```

**Props:**
- `categories` - Array of Category objects
- `defaultValue` - Initially selected category ID
- `name` - Form field name (default: "category_id")
- `label` - Label text (default: "Category")
- `showAllOption` - Include "All Categories" option
- `required` - Whether selection is required

---

### CardActionMenu

**Location:** `src/components/shared/card-action-menu.tsx`

Dropdown menu for card actions (edit, delete, etc).

```tsx
// Standard usage with edit and delete
<CardActionMenu
  onEdit={() => setShowEditDialog(true)}
  onDelete={() => setShowDialog(true)}
/>

// Custom menu items
<CardActionMenu onDelete={handleDelete}>
  <Link href={`/items/${id}/edit`} className="...">
    Edit
  </Link>
  <button onClick={handleDuplicate}>Duplicate</button>
</CardActionMenu>
```

**Props:**
- `onEdit` - Edit action callback (shows Edit option)
- `onDelete` - Delete action callback (shows Delete option)
- `children` - Custom menu items

---

### IconBadge

**Location:** `src/components/shared/icon-badge.tsx`

Styled icon container for visual indicators.

```tsx
<IconBadge icon={TrendingUp} color="success" />
<IconBadge icon={AlertTriangle} color="warning" size="lg" />
```

**Props:**
- `icon` - Lucide icon component
- `color` - "default" | "success" | "warning" | "danger"
- `size` - "sm" | "md" | "lg"

---

## Custom Hooks

### useDeleteAction

**Location:** `src/hooks/use-delete-action.ts`

Encapsulates delete operation state and workflow.

```tsx
import { useDeleteAction } from '@/hooks/use-delete-action';

function MyCard({ item }) {
  const { showDialog, setShowDialog, handleDelete } = useDeleteAction(
    deleteItem,  // Server action
    item.id      // Item ID
  );

  return (
    <>
      <Card>
        <CardActionMenu
          onEdit={() => setEditOpen(true)}
          onDelete={() => setShowDialog(true)}
        />
      </Card>

      <DeleteConfirmationDialog
        open={showDialog}
        onOpenChange={setShowDialog}
        onConfirm={handleDelete}
        title="Delete Item"
        description="Are you sure?"
      />
    </>
  );
}
```

**Returns:**
- `showDialog` - Boolean for dialog visibility
- `setShowDialog` - Toggle dialog visibility
- `handleDelete` - Async handler that calls the action

---

## Usage Patterns

### Standard Card Component Pattern

```tsx
'use client';

import { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { CardActionMenu, DeleteConfirmationDialog } from '@/components/shared';
import { useDeleteAction } from '@/hooks/use-delete-action';
import { deleteItem, updateItem } from '@/app/actions/items';
import { ItemForm } from './item-form';

export function ItemCard({ item }) {
  const [showEditDialog, setShowEditDialog] = useState(false);
  const { showDialog, setShowDialog, handleDelete } = useDeleteAction(
    deleteItem,
    item.id
  );

  const handleUpdate = async (formData: FormData) => {
    return updateItem(item.id, formData);
  };

  return (
    <>
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div>{/* Item content */}</div>
            <CardActionMenu
              onEdit={() => setShowEditDialog(true)}
              onDelete={() => setShowDialog(true)}
            />
          </div>
        </CardContent>
      </Card>

      <ItemForm
        item={item}
        action={handleUpdate}
        open={showEditDialog}
        onOpenChange={setShowEditDialog}
      />

      <DeleteConfirmationDialog
        open={showDialog}
        onOpenChange={setShowDialog}
        onConfirm={handleDelete}
        title="Delete Item"
        description="Are you sure you want to delete this item?"
      />
    </>
  );
}
```

### Standard Form Component Pattern

```tsx
'use client';

import { useRef } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { FormSubmitButton, CurrencyInput, CategorySelect } from '@/components/shared';
import type { ActionResult } from '@/lib/action-types';

interface ItemFormProps {
  item?: Item;
  categories: Category[];
  action: (formData: FormData) => Promise<ActionResult>;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  currency?: string;
}

export function ItemForm({ item, categories, action, open, onOpenChange, currency = 'USD' }: ItemFormProps) {
  const formRef = useRef<HTMLFormElement>(null);
  const isEditing = !!item;

  const handleAction = async (formData: FormData) => {
    const result = await action(formData);
    if (result && 'error' in result) {
      alert(result.error);
      return;
    }
    formRef.current?.reset();
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{isEditing ? 'Edit' : 'Add'} Item</DialogTitle>
        </DialogHeader>
        <form ref={formRef} action={handleAction} className="space-y-4">
          <CurrencyInput
            name="amount"
            label="Amount"
            currency={currency}
            defaultValue={item?.amount}
            required
          />
          <CategorySelect
            categories={categories}
            defaultValue={item?.category_id}
          />
          <FormSubmitButton>{isEditing ? 'Update' : 'Create'}</FormSubmitButton>
        </form>
      </DialogContent>
    </Dialog>
  );
}
```

### Standard Server Action Pattern

```typescript
'use server';

import { revalidatePath } from 'next/cache';
import { getAuthenticatedUser } from '@/lib/auth-helpers';
import type { ActionResult, DataResult } from '@/lib/action-types';

export async function createItem(formData: FormData): Promise<ActionResult> {
  const { user, supabase, error } = await getAuthenticatedUser();
  if (error || !user || !supabase) {
    return { error: error || 'Not authenticated' };
  }

  const amount = parseFloat(formData.get('amount') as string);
  const category_id = formData.get('category_id') as string || null;

  const { error: dbError } = await supabase.from('items').insert({
    user_id: user.id,
    amount,
    category_id: category_id === 'all' ? null : category_id,
  });

  if (dbError) {
    return { error: dbError.message };
  }

  revalidatePath('/items');
  return { success: true };
}

export async function getItem(id: string): Promise<DataResult<Item>> {
  const { user, supabase, error } = await getAuthenticatedUser();
  if (error || !user || !supabase) {
    return { data: null, error: error || 'Not authenticated' };
  }

  const { data, error: dbError } = await supabase
    .from('items')
    .select('*, category:categories(*)')
    .eq('id', id)
    .eq('user_id', user.id)
    .single();

  if (dbError) {
    return { data: null, error: dbError.message };
  }

  return { data };
}
```

---

## Adding New Modules

When creating new reusable code:

1. **Utilities** go in `src/lib/` with JSDoc comments
2. **Components** go in `src/components/shared/` and export from `index.ts`
3. **Hooks** go in `src/hooks/` with descriptive names
4. **Document** all new modules in this file

Follow existing patterns for consistency. When in doubt, look at similar existing modules.
