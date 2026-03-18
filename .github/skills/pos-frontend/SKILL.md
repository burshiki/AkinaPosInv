---
name: pos-frontend
description: "POS front-end design expert. Use when: building new pages, adding UI sections, designing status badges, creating modals/dialogs, structuring tables, building POS layouts, fixing visual inconsistencies, reviewing UI for consistency, designing dashboards, or implementing any React/Tailwind/shadcn component in this codebase."
argument-hint: "Describe the page or component to build or review"
---

# POS Front-End Design Expert

Expert guidance for building visually consistent, production-ready UI in **AkinaPOS** — a Laravel + Inertia.js + React + TypeScript + Tailwind + shadcn/ui POS system.

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Framework | Laravel 11 + Inertia.js (server-driven SPA) |
| UI library | React 18 + TypeScript |
| Styling | Tailwind CSS v3, `tailwind.config.js` extends shadcn tokens |
| Components | shadcn/ui (Radix primitives) in `resources/js/Components/ui/` |
| App components | `resources/js/Components/app/` |
| Layout | `AuthenticatedLayout` — Sidebar + Header + main scrollable |
| Font | Figtree (sans) |
| Icons | Lucide React (all icons from `lucide-react`) |

---

## Layout Rules

### Page Shell

Every page **must** use `AuthenticatedLayout`:

```tsx
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { Head } from '@inertiajs/react';

export default function MyPage() {
    return (
        <AuthenticatedLayout>
            <Head title="Page Title" />
            <div className="space-y-6 p-6">
                {/* content */}
            </div>
        </AuthenticatedLayout>
    );
}
```

- Top-level content wrapper: `<div className="space-y-6 p-6">`
- Detail/form pages (narrow): `<div className="max-w-2xl mx-auto space-y-6 p-6">`
- Full-page POS (no padding): main element already has `p-6`; override with `p-0` class or negate

### Spacing Scale

| Purpose | Class |
|---------|-------|
| Between major sections | `space-y-6` |
| Between related items | `space-y-3` |
| Button label + icon gap | `mr-1.5` (for `size="default"`), `mr-1` (for `size="sm"`) |
| Inline tag/icon gap | `gap-2` |
| Input group stacking | `space-y-1.5` |

---

## Color & Theme Tokens

Use **semantic CSS variables** from `app.css` — never raw hex values or arbitrary colors:

| Token | Usage |
|-------|-------|
| `bg-background` | Page background |
| `text-foreground` | Body text |
| `text-muted-foreground` | Labels, secondary text, placeholders |
| `bg-muted` / `bg-muted/40` | Read-only info boxes |
| `border-border` | Default border (applied globally via `@apply`) |
| `text-primary` / `bg-primary` | Primary action color |
| `text-destructive` | Errors, danger |
| `bg-success` / `text-success-foreground` | Success state (custom token) |
| `bg-warning` / `text-warning-foreground` | Warning state (custom token) |

**Only use raw Tailwind color utilities** (`text-amber-600`, `bg-green-50`, `border-orange-300`) for **contextual status callout boxes** (alert banners, defective unit notices), not for structural layout.

---

## Status Badge Convention

All status configs follow this pattern:

```tsx
const STATUS_CFG: Record<string, {
    label: string;
    variant: 'default' | 'secondary' | 'outline' | 'destructive' | 'success';
}> = {
    pending:     { label: 'Pending',     variant: 'outline' },
    in_progress: { label: 'In Progress', variant: 'default' },
    done:        { label: 'Done',        variant: 'secondary' },
    claimed:     { label: 'Claimed',     variant: 'success' },
    active:      { label: 'Active',      variant: 'default' },
    void:        { label: 'Voided',      variant: 'secondary' },
    // destructive for error/cancelled states
};
```

**Badge variant semantics:**
- `default` (dark) → Active / In Progress / Confirmed
- `outline` (bordered) → Pending / Unactioned  
- `secondary` (light grey) → Closed / Archived / Replaced  
- `destructive` (red) → Error / Defect / Open Claim  
- `success` (green) → Completed / Claimed / Resolved  
- `warning` (yellow) → Warning / Low Stock  

Always render expired items with `variant="secondary"` (never `destructive`).

---

## Page Header Pattern

```tsx
{/* Header */}
<div className="flex items-center justify-between">
    <h1 className="text-2xl font-bold flex items-center gap-2">
        <Icon className="h-6 w-6" />
        Page Title
    </h1>
    <PermissionGate permission="module.action">
        <Button onClick={...}>
            <Plus className="h-4 w-4 mr-1.5" />
            Primary Action
        </Button>
    </PermissionGate>
</div>
```

- Page title: `text-2xl font-bold` + icon `h-6 w-6`
- Section headings: `text-sm font-semibold uppercase tracking-wide text-muted-foreground` + icon `h-4 w-4`
- All primary action buttons guarded by `<PermissionGate permission="...">` from `@/Components/app/permission-gate`

---

## Stat Badges / Summary Row

Used on list pages to show filterable counts:

```tsx
<div className="flex flex-wrap gap-3">
    {[
        { key: 'pending',     label: 'Awaiting',    count: counts.pending,     color: 'border-orange-300 bg-orange-50 text-orange-800 dark:border-orange-700 dark:bg-orange-950 dark:text-orange-200' },
        { key: 'in_progress', label: 'In Progress', count: counts.in_progress, color: 'border-blue-300 bg-blue-50 text-blue-800 dark:border-blue-700 dark:bg-blue-950 dark:text-blue-200' },
        { key: 'done',        label: 'Ready',       count: counts.done,        color: 'border-green-300 bg-green-50 text-green-800 dark:border-green-700 dark:bg-green-950 dark:text-green-200' },
    ].map(({ key, label, count, color }) => (
        <button
            key={key}
            type="button"
            onClick={() => setStatus(status === key ? 'all' : key)}
            className={`rounded-lg border px-4 py-2 text-sm font-medium transition-opacity ${color} ${status !== key && status !== 'all' ? 'opacity-50' : ''}`}
        >
            {count} {label}
        </button>
    ))}
</div>
```

Color palette for stat buttons:
| State | Border/BG/Text |
|-------|---------------|
| Pending / Warning | `orange-300 / orange-50 / orange-800` |
| Active / In Progress | `blue-300 / blue-50 / blue-800` |
| Done / Success | `green-300 / green-50 / green-800` |
| Alert | `amber-300 / amber-50 / amber-800` |

---

## Filter Bar Pattern

Always placed between the header and the table:

```tsx
<div className="flex flex-wrap gap-3">
    {/* Search */}
    <div className="relative flex-1 min-w-48">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
            placeholder="Search…"
            className="pl-9"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
        />
    </div>
    {/* Status filter */}
    <Select value={status} onValueChange={setStatus}>
        <SelectTrigger className="w-44">
            <SelectValue placeholder="All Statuses" />
        </SelectTrigger>
        <SelectContent>
            <SelectItem value="all">All</SelectItem>
            {/* ... */}
        </SelectContent>
    </Select>
</div>
```

- Search uses `pl-9` + absolutely-positioned `Search` icon
- Status select is `w-44` (or `w-48` for longer labels)
- Use `useDebounce(search, 300)` from `@/hooks/use-debounce` for search
- Sync filters to URL with `router.get(..., { preserveState: true, replace: true })` in `useEffect`

---

## Table Pattern

```tsx
<div className="rounded-md border">
    <ScrollArea>
        <Table>
            <TableHeader>
                <TableRow>
                    <TableHead>Column</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                </TableRow>
            </TableHeader>
            <TableBody>
                {data.length === 0 ? (
                    <TableRow>
                        <TableCell colSpan={N} className="h-32 text-center text-muted-foreground">
                            No items found.
                        </TableCell>
                    </TableRow>
                ) : data.map((row) => (
                    <TableRow key={row.id} className="cursor-pointer hover:bg-muted/50" onClick={...}>
                        {/* cells */}
                        <TableCell className="text-right" onClick={(e) => e.stopPropagation()}>
                            <Button size="sm" variant="ghost" onClick={...}>
                                <Eye className="h-4 w-4 mr-1" /> View
                            </Button>
                        </TableCell>
                    </TableRow>
                ))}
            </TableBody>
        </Table>
    </ScrollArea>
</div>
<Pagination data={paginatedData} />
```

- Wrap in `rounded-md border` div
- Always include `ScrollArea` for horizontal scroll
- Empty state: `h-32 text-center text-muted-foreground`
- Clickable rows: `cursor-pointer hover:bg-muted/50`
- Action cell: `text-right`, stop propagation so row click doesn't fire
- Monetary values: `font-mono text-sm` + `formatCurrency()`
- IDs / codes: `font-mono text-sm`
- Follow with `<Pagination data={...} />` from `@/Components/ui/pagination`

---

## Detail Row Pattern

For read-only key/value pairs in detail views and modals:

```tsx
function DetailRow({ label, value }: { label: string; value: React.ReactNode }) {
    return (
        <div className="flex justify-between py-2 px-4 text-sm border-b last:border-0">
            <span className="text-muted-foreground shrink-0">{label}</span>
            <span className="text-right">{value}</span>
        </div>
    );
}

{/* Usage */}
<div className="rounded-lg border divide-y">
    <DetailRow label="Receipt #" value={<span className="font-mono">{item.receipt_number}</span>} />
    <DetailRow label="Customer"  value={item.customer_name ?? '—'} />
</div>
```

- Container: `rounded-lg border divide-y`
- Missing values: always render `'—'` (em dash), never empty string

---

## Dashboard Stat Cards

```tsx
<div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
    <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Label</CardTitle>
            <Icon className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
            <div className="text-2xl font-bold">{value}</div>
            <p className="text-xs text-muted-foreground">description</p>
        </CardContent>
    </Card>
</div>
```

---

## Dialog / Modal Pattern

```tsx
<Dialog open={open} onOpenChange={setOpen}>
    <DialogContent className="max-w-md">
        <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
                <Icon className="h-5 w-5" /> Dialog Title
            </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
            {/* optional info box */}
            <div className="rounded-md border bg-muted/40 px-4 py-3 text-sm space-y-1.5">
                {/* read-only context */}
            </div>

            {/* fields */}
            <div className="space-y-1.5">
                <Label htmlFor="field">Field Label</Label>
                <Input id="field" ... />
                {errors.field && <p className="text-sm text-destructive">{errors.field}</p>}
            </div>

            <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
                <Button type="submit" disabled={form.processing}>Confirm</Button>
            </DialogFooter>
        </form>
    </DialogContent>
</Dialog>
```

- Default width: `max-w-md` (simple), `max-w-lg` (complex), `max-w-2xl` (detail panel)
- Dialog title always has an icon: `flex items-center gap-2` + icon `h-5 w-5`
- Info boxes in forms: `rounded-md border bg-muted/40 px-4 py-3 text-sm`
- Contextual alert boxes: `rounded-md bg-{color}-50 px-3 py-2 text-sm text-{color}-700`
- DialogFooter: Cancel (`variant="outline"`) always left; Submit always right
- Modals with scrollable content (detail panels): `max-h-[90vh] overflow-y-auto`

---

## Modal vs Full-Page Form Decision Guide

Use this table to decide whether new forms/create/edit flows should open as a **Dialog** on the Index page or navigate to a **separate page**.

### Rule of thumb

| Condition | Use |
|-----------|-----|
| Form has ≤ ~8 fields, no complex sub-sections | **Modal** on Index |
| Form has file uploads, rich text, or many sub-sections | **Full page** |
| Creating a simple "header" record (name + a few config fields) | **Modal** |
| Record has complex line items, tabs, or multi-step flow | **Full page** |
| Action is a workflow step (confirm, resolve, record serial) | **Modal** (action dialog, not a form page) |
| Detail view that shows nested relations (Show page) | **Full page** with back button |

### Current module map

Modules that currently use **modal dialogs** on the Index page — keep consistent:

| Module | Modal Actions |
|--------|--------------|
| Categories | Create + Edit |
| Customers | Create + Edit + Record Initial Debt |
| Suppliers | Create + Edit |
| Users | Create + Edit (with permission checkboxes) |
| Products | Create (quick-add) |
| PurchaseOrders | Create |
| Promotions | Create |
| Payroll / Employees | Create + Edit (extracted as `EmployeeCreateModal` / `EmployeeEditModal` components) |
| Payroll / Holidays | Create + Edit + Delete confirm |
| Payroll / Leave | File Request + Reject |
| CashDrawer | Open · Close · Transfer · Expense · Cash In |
| Stock | Adjust Stock · Start Inventory Session |
| Warranties | Detail panel (JSON-fetch modal, read-only) + all claim workflow actions |

Modules that use **full-page navigation** — keep consistent:

| Module | Full Pages |
|--------|-----------|
| Bills | Create (`Bills/Create.tsx`) |
| Quotations | Create (`Quotations/Create.tsx`) |
| RecurringBills | Create + Edit (`RecurringBills/Create.tsx`, `Edit.tsx`) |
| Repairs | Create (`Repairs/Create.tsx`) |
| Sales (POS) | Create (`Sales/Create.tsx`) — full POS screen |
| Payroll / Periods | Create (`Payroll/Periods/Create.tsx`) |

### Scaffolding a new modal form on an Index page

```tsx
// 1. State on Index
const [createOpen, setCreateOpen] = useState(false);
const [editTarget, setEditTarget] = useState<MyType | null>(null);

// 2. Single form covers both create & edit
const form = useForm({ name: '', notes: '' });

const openCreate = () => {
    form.reset();
    form.clearErrors();
    setEditTarget(null);
    setCreateOpen(true);
};

const openEdit = (item: MyType) => {
    form.setData({ name: item.name, notes: item.notes ?? '' });
    form.clearErrors();
    setEditTarget(item);
    setCreateOpen(true);
};

const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (editTarget) {
        form.put(route('items.update', editTarget.id), { onSuccess: () => setCreateOpen(false) });
    } else {
        form.post(route('items.store'), { onSuccess: () => setCreateOpen(false) });
    }
};

// 3. Header button
<PermissionGate permission="items.create">
    <Button onClick={openCreate}>
        <Plus className="h-4 w-4 mr-1.5" /> New Item
    </Button>
</PermissionGate>

// 4. Edit button in table row (inside PermissionGate)
<Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openEdit(row)}>
    <Pencil className="h-4 w-4" />
</Button>

// 5. Dialog (placed outside the main content div, inside AuthenticatedLayout)
<Dialog open={createOpen} onOpenChange={setCreateOpen}>
    <DialogContent className="max-w-md">
        <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
                <Icon className="h-5 w-5" />
                {editTarget ? `Edit: ${editTarget.name}` : 'New Item'}
            </DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1.5">
                <Label htmlFor="name">Name</Label>
                <Input id="name" value={form.data.name} onChange={(e) => form.setData('name', e.target.value)} autoFocus />
                {form.errors.name && <p className="text-sm text-destructive">{form.errors.name}</p>}
            </div>
            <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setCreateOpen(false)}>Cancel</Button>
                <Button type="submit" disabled={form.processing}>
                    {editTarget ? 'Save Changes' : 'Create'}
                </Button>
            </DialogFooter>
        </form>
    </DialogContent>
</Dialog>
```

### Extracting large modals into separate components

When a modal form has more than ~6 fields or complex state (e.g. Employees), extract it into a dedicated component file:

```
resources/js/Pages/MyModule/
├── Index.tsx           ← imports and renders the modals
├── CreateModal.tsx     ← <Dialog> with its own useForm
└── EditModal.tsx       ← <Dialog> with its own useForm + item prop
```

Pattern for extracted modal component:

```tsx
// CreateModal.tsx
interface Props {
    open: boolean;
    onClose: () => void;
}

export default function CreateModal({ open, onClose }: Props) {
    const form = useForm({ name: '' });
    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        form.post(route('items.store'), { onSuccess: onClose });
    };
    return (
        <Dialog open={open} onOpenChange={(v) => { if (!v) onClose(); }}>
            {/* ... */}
        </Dialog>
    );
}
```

```tsx
// EditModal.tsx
interface Props {
    open: boolean;
    onClose: () => void;
    item: MyType;
}

export default function EditModal({ open, onClose, item }: Props) {
    const form = useForm({ name: item.name });
    useEffect(() => { form.setData('name', item.name); }, [item.id]);
    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        form.put(route('items.update', item.id), { onSuccess: onClose });
    };
    return (
        <Dialog open={open} onOpenChange={(v) => { if (!v) onClose(); }}>
            {/* ... */}
        </Dialog>
    );
}
```

```tsx
// Index.tsx usage
import CreateModal from './CreateModal';
import EditModal from './EditModal';

{/* At bottom of AuthenticatedLayout, outside main div */}
<CreateModal open={createOpen} onClose={() => setCreateOpen(false)} />
{editTarget && (
    <EditModal
        key={editTarget.id}
        open={!!editTarget}
        onClose={() => setEditTarget(null)}
        item={editTarget}
    />
)}
```

> Use `key={item.id}` on `EditModal` so the form state resets when switching between items.

---

## Action Button Colors

| Action | Style |
|--------|-------|
| Primary / default | `<Button>` (default variant) |
| Destructive cancel | `<Button variant="destructive">` |
| Secondary / neutral | `<Button variant="outline">` |
| Inline table action | `<Button size="sm" variant="ghost">` |
| Contextual green action | `className="border-green-500 text-green-700 hover:bg-green-50"` + `variant="outline"` |
| Contextual orange action | `className="border-orange-400 text-orange-700 hover:bg-orange-50"` + `variant="outline"` |
| Contextual blue action | `className="border-blue-400 text-blue-700 hover:bg-blue-50"` + `variant="outline"` |
| Contextual amber/warning | `className="border-amber-400 text-amber-700 hover:bg-amber-50"` + `variant="outline"` |
| Danger confirmation | `className="bg-destructive text-destructive-foreground hover:bg-destructive/90"` |
| Compact toolbar | `size="sm"` with `h-7 text-xs` override |

---

## Callout / Alert Banner Pattern

```tsx
{/* Info */}
<div className="rounded-md bg-blue-50 px-3 py-2 text-sm text-blue-700">
    Informational message.
</div>

{/* Warning */}
<div className="rounded-md bg-amber-50 px-3 py-2 text-xs text-amber-700 border border-amber-200">
    Warning message.
</div>

{/* Success notice */}
<div className="rounded-lg border border-green-300 bg-green-50 p-4 flex items-start gap-3 text-green-800 dark:bg-green-950/30 dark:border-green-800 dark:text-green-200">
    <CheckCircle className="h-5 w-5 shrink-0" />
    <p>Success message.</p>
</div>
```

---

## PermissionGate Usage

Wrap **every** destructive or privileged action:

```tsx
import { PermissionGate } from '@/Components/app/permission-gate';

<PermissionGate permission="module.action">
    <Button ...>Action</Button>
</PermissionGate>
```

- Renders `<>{children}</>` when user has permission, nothing otherwise
- Permission string format: `module.action` (e.g. `repairs.create`, `warranties.check`, `banking.view`)

---

## Inertia Navigation

```tsx
import { router } from '@inertiajs/react';

// Navigate
router.get(route('module.index'));
router.get(route('module.show', id));

// Navigate with query params
router.get(route('module.index'), { search, status }, { preserveState: true, replace: true });

// Form submission
router.post(route('module.store'), data, { onSuccess: () => ... });

// Link component (passive navigation)
import { Link } from '@inertiajs/react';
<Link href={route('module.index')}>Back</Link>

// Inertia useForm (for all form submissions with validation)
import { useForm } from '@inertiajs/react';
const form = useForm({ field: '' });
form.post(route(...), { onSuccess: () => ... });
// Access: form.data, form.errors, form.processing
```

---

## JSON Fetch Pattern (for modals that load data on demand)

```tsx
const [modalId, setModalId]     = useState<number | null>(null);
const [modalData, setModalData] = useState<DataType | null>(null);
const [loading, setLoading]     = useState(false);

useEffect(() => {
    if (modalId === null) { setModalData(null); return; }
    setLoading(true);
    fetch(route('module.detail', modalId), {
        headers: { 'Accept': 'application/json', 'X-Requested-With': 'XMLHttpRequest' },
        credentials: 'same-origin',
    })
        .then((r) => r.json())
        .then((data) => { setModalData(data); setLoading(false); })
        .catch(() => setLoading(false));
}, [modalId]);
```

Backend JSON endpoint returns `response()->json([...])` inside the `warrantes.view` (or equivalent) permission middleware group.

---

## Typography Rules

| Use | Class |
|-----|-------|
| Page title | `text-2xl font-bold` |
| Section heading | `text-sm font-semibold uppercase tracking-wide text-muted-foreground` |
| Table cell primary | default `text-sm` |
| Table cell code/id | `font-mono text-sm` |
| Small label | `text-xs text-muted-foreground` |
| Form label | `<Label>` component (renders `text-sm font-medium`) |
| Error text | `text-sm text-destructive` |
| Currency | `formatCurrency()` from `@/lib/utils` |
| Dates | `formatDate()` from `@/lib/utils` |
| Missing value | `'—'` wrapped in `<span className="text-muted-foreground">` |

---

## Icon Conventions

| Context | Size |
|---------|------|
| Page title | `h-6 w-6` |
| Section heading | `h-4 w-4` |
| Button (default) | `h-4 w-4 mr-1.5` |
| Button (sm) | `h-4 w-4 mr-1` or `h-3.5 w-3.5 mr-1` |
| Dialog title | `h-5 w-5` |
| Stat card | `h-4 w-4 text-muted-foreground` |
| Inline contextual | `h-3.5 w-3.5` |

All icons from `lucide-react`. Never use emoji as icons in UI components.

---

## Component Checklist (new page/section)

Before finalising any new UI, verify:

- [ ] Wrapped in `<AuthenticatedLayout>` with `<Head title="..." />`
- [ ] Top-level container is `<div className="space-y-6 p-6">`
- [ ] Header follows page-header pattern (title + icon + primary action)
- [ ] All privileged actions wrapped in `<PermissionGate>`
- [ ] Status badges use shared `STATUS_CFG` pattern with correct variants
- [ ] Tables have empty state, `ScrollArea`, action stop-propagation
- [ ] Forms use `useForm` from `@inertiajs/react`
- [ ] Missing values displayed as `'—'`
- [ ] Colors use semantic tokens (not raw hex)
- [ ] Dates via `formatDate()`, currency via `formatCurrency()`
- [ ] Icons sized per convention above
- [ ] Dark mode handled via semantic tokens (no light-mode-only raw colors in structural elements)
