# SIMS – Supply & Inventory Management System (frontend)

`sims-frontend` is the web client for SIMS: products and categories, stock levels across warehouses, stock adjustments and transfers, suppliers, purchase orders (approve → receive), department supply requisitions (approve → issue), reports, and user / role administration.

It is **frontend only**. Every screen works today against a built-in **mock API** with realistic data, and switches to a real backend by changing two environment variables — no component changes needed.

## Tech stack

| Concern | Library |
|---|---|
| Framework | Next.js 15 (App Router), React 19, TypeScript (strict) |
| Styling | Tailwind CSS 4 (design tokens in `src/app/globals.css`) |
| Client state | Redux Toolkit (`configureStore`, `createSlice`, `createSelector`, listener middleware) |
| Server state / HTTP | RTK Query (`createApi` + `fetchBaseQuery`, one shared API slice, `injectEndpoints`) |
| Forms | React Hook Form + Zod (`@hookform/resolvers`) |
| Icons / charts | Lucide React, Recharts |

## Getting started

Requires Node.js 20.18+ and npm 10+.

```bash
npm install
cp .env.example .env.local   # mock mode by default
npm run dev                  # http://localhost:3000
```

Sign in with any demo account (mock mode only). The password for all of them is `Password@123`; the login page has one-click buttons.

| Role | Email | Sees |
|---|---|---|
| Administrator | admin@sims.local | Everything |
| Inventory Manager | manager@sims.local | Inventory, procurement, approvals, reports |
| Purchasing Officer | purchasing@sims.local | Suppliers, purchase orders, reports |
| Warehouse Staff | warehouse@sims.local | Stock, receiving, issuing requisitions |
| Requester | requester@sims.local | Product catalog and own requisitions |

## Commands

| Command | Purpose |
|---|---|
| `npm run dev` | Development server with hot reload |
| `npm run lint` | ESLint (Next.js core-web-vitals + TypeScript rules) |
| `npx tsc --noEmit` | Type check |
| `npm run build` | Production build |
| `npm start` | Serve the production build |

## Environment

| Variable | Default | Meaning |
|---|---|---|
| `NEXT_PUBLIC_API_MODE` | `mock` | `mock` = in-browser mock API, `real` = call the backend |
| `NEXT_PUBLIC_API_BASE_URL` | `http://localhost:8000/api` | Backend base URL (real mode) |
| `NEXT_PUBLIC_MOCK_DELAY_MS` | `400` | Simulated latency in mock mode |

`NEXT_PUBLIC_*` values are compiled into the browser bundle, so **never put secrets in them**. Use `.env.local` for development (git-ignored) and your hosting provider's environment settings for production. These are build-time values: rebuild after changing them.

## Modules and routes

The menu follows the module map of the SIMS Canva design (red/charcoal theme, white top bar, dark sidebar).

| Module | Screens |
|---|---|
| Dashboard | `/dashboard` — KPIs, movement trend, stock health, reorder alerts, value by category, recent activity |
| Warehouse Management | Multiple Warehouse (`/warehouses`, Add/Edit modal), Warehouse Locations (`/warehouses/locations`), Stock Transfer (`/documents/stock-transfers`), Stock Movement (`/inventory/movements`), Stock Management (`/inventory`) |
| Inventory Transactions | Receiving (GRN), Issuance (RIS/ICS/PAR), Adjustment, Return, Physical Inventory / Stock Count (3-step wizard), Stock Reconciliation (`/documents/<type>`) |
| Inventory Management | Item Master and New Item (`/products`), Stock Inquiry (`/inventory/inquiry`), Reorder Management and Purchase Requests (`/inventory/reorder`, `/documents/purchase-requests`), Barcode / QR Management (`/inventory/labels`) |
| Property Management | Property Management (`/property`), Property Transactions (`/property/transactions`), Property Master (`/property/master`), Maintenance and work orders (`/property/maintenance`), Disposal / Transfer (`/property/disposal`), Property / Inventory / Maintenance / Disposal report hubs (`/property/reports`) |
| Reports | `/forms` index and `/forms/<code>` government forms (IAR, RAAF, Stock Card, RIS, RSMI, RPCI, PAR, RPCPPE, IIRUP, PTR, PPE Ledger…); analytics at `/reports` |
| Monitoring | Low Stock Alerts, Reorder Level Monitoring, Inventory Valuation, Stock Aging, Movement History, Audit Trail, Notifications |
| Administration | Users, Roles & Permissions, Employees / Custodians, Suppliers, Purchase Orders, Supply Requests, System Settings, My Profile |

Three config files drive most of these screens, the mock API and the route permissions:

- `src/config/masterData.ts` — registries (fields, validation, permissions) rendered by one list + modal-form screen.
- `src/config/documents.ts` — transaction documents (header fields, item mode, approval chain, posting effect) rendered by one list / form / approval-detail set. Stock Transfer and Stock Adjustment use the 3-step chain Warehouse Head → Supply Officer → Property Custodian; posting happens at the final approval.
- `src/config/reportForms.ts` — government forms and monitoring views; the API returns them as tables, the UI renders them printable with signatories and CSV export.

Workflow rules enforced by the API: stock cannot go negative when a document posts; only drafts/returned documents can be edited; returning a document requires remarks; records in use cannot be deleted.

## Folder structure

```text
src/
├── app/                    # Routes only (thin pages that render feature components)
│   ├── (auth)/             # Login, forgot/reset password — public layout
│   ├── (dashboard)/        # Authenticated app — DashboardShell layout
│   ├── layout.tsx          # Root layout: fonts, Redux provider, toaster
│   └── loading.tsx · error.tsx · not-found.tsx
├── features/<module>/      # Module UI: components/ and schemas/ (Zod)
├── components/
│   ├── ui/                 # Primitives: Button, Input, Select, Modal, Dropdown, Tabs, Badge, Card…
│   ├── common/             # PageHeader, StatCard, StatusBadge, ConfirmDialog, empty/error states…
│   ├── forms/              # FormField, FormSection, FormErrorBanner
│   ├── tables/             # DataTable (sortable, paginated, mobile cards), toolbar, row actions
│   ├── charts/             # Recharts wrappers, code-split with next/dynamic
│   └── layout/             # Sidebar, MobileNav, Header, Breadcrumbs, GlobalSearch, DashboardShell
├── services/api/           # baseApi, baseQuery, apiConfig, apiTags, endpoints/*
├── mocks/                  # Mock API: database/ (seed, fixtures), handlers/, mockBaseQuery.ts
├── store/features/         # Redux slices: auth, ui, appContext
├── lib/redux/              # store, typed hooks, provider, listener middleware
├── lib/utils/              # cn, format, csv, query, storage, errors
├── hooks/                  # useListState, usePermissions, useToast, useDebounce, useBreadcrumbLabel
├── config/                 # app.config.ts, navigation.ts (menu + route permissions)
├── constants/              # permissions, statuses, select options, storage keys
├── schemas/                # Shared Zod building blocks
└── types/                  # API contracts and domain models
```

More detail: [docs/PROJECT_STRUCTURE.md](docs/PROJECT_STRUCTURE.md).

## Redux architecture

- **One store**, created once per browser tab in `lib/redux/provider.tsx` (App Router safe).
- **Slices** hold only client-owned state: `auth` (user, token, status), `ui` (sidebar, mobile nav, toasts, breadcrumb labels) and `appContext` (selected warehouse — a global filter used by the dashboard, products and stock pages).
- **Listener middleware** persists the session, sidebar preference and selected warehouse to `localStorage`; persisted state is restored after mount, so server and client renders match.
- Typed hooks: `useAppDispatch`, `useAppSelector`, `useAppStore`. Memoized selectors with `createSelector` (e.g. `selectPermissionSet`).
- API data is never copied into slices; it lives in the RTK Query cache.

## RTK Query architecture

- `services/api/baseApi.ts` is the single `createApi` slice; each module adds endpoints with `injectEndpoints` in `services/api/endpoints/*Api.ts`.
- `baseQuery.ts` centralizes the base URL, `Authorization` header, query-string serialization, timeouts, error normalization (`ApiError`) and 401 → session expiry.
- Cache: entity tags (`{ type: "Product", id }`) plus collection tags (`LIST`), cross-module invalidation (receiving a PO refreshes stock, movements, dashboard and reports), `upsertQueryData` after edits, optimistic updates for notification read state and product status, polling for notifications and the dashboard, lazy queries for CSV export and header search, and `skip` for conditional fetching.

Full contract and integration guide: [docs/API_INTEGRATION.md](docs/API_INTEGRATION.md).

## Mock API

In mock mode `baseQuery` lazy-loads `src/mocks/mockBaseQuery.ts`, which routes the same `{ url, method, params, body }` requests to handlers in `src/mocks/handlers/`. It supports CRUD, search, filters, sorting, pagination, latency, permission checks (403), validation errors (422 with field messages), conflicts (409) and session expiry (401). Data is seeded deterministically and saved to `localStorage`, so changes survive reloads; **Settings → Reset demo data** restores the seed.

## Connecting a real backend

1. Implement the endpoints listed in `docs/API_INTEGRATION.md` (same paths, payloads and response shapes as the mock).
2. Set `NEXT_PUBLIC_API_MODE=real` and `NEXT_PUBLIC_API_BASE_URL=https://your-api.example.com/api`.
3. Rebuild. Hooks and components do not change. In real mode the app never falls back to mock data; API errors are shown to the user.

If the backend wraps responses (e.g. `{ data: … }`) or uses cookie sessions instead of bearer tokens, adapt `services/api/baseQuery.ts` only.

## Design reference and assumptions

- The UI follows the 88-screen SIMS Canva mockup (https://www.canva.com/design/DAHazTVmi3k). `design/CANVA_NOTES.md` records what each screen contains and `design/GAP_ANALYSIS.md` tracks what was matched and what still differs.
- Theme: red `#d32f2f` primary with a charcoal sidebar; colours live in `src/app/globals.css` and the logo in `public/logo/logo.svg`.
- Screens with no mockup (login, dashboard, administration, suppliers, purchase orders, supply requests) use the same shared components so they match the rest of the app.
- To run a second dev server next to your own (for example for automated screenshots) without clashing over `.next`, set `NEXT_DIST_DIR`, e.g. `NEXT_DIST_DIR=.next-claude npx next dev -p 3101`.
- Authentication assumes a bearer token returned by `POST /auth/login`; switch to cookies in `baseQuery.ts` if needed.
- Route protection is client-side; the backend must still enforce permissions.
