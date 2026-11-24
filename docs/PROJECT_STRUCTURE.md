# Project structure and architectural decisions

## Layers

```
app/ (routes)  →  features/ (module UI)  →  components/ (shared UI)
                        │
                        ▼
              services/api/endpoints (RTK Query hooks)
                        │
                        ▼
              services/api/baseQuery  ──►  real backend (fetchBaseQuery)
                                     └──►  mocks/mockBaseQuery (in-browser)
```

Dependencies point downwards only. Presentation components never call `fetch`; they use generated RTK Query hooks. `mocks/` is imported only by `baseQuery.ts`, through a dynamic `import()`, so it is split out of the main bundle and could be removed entirely once a backend exists.

## Folders

| Folder | Purpose |
|---|---|
| `src/app` | App Router routes. `(auth)` and `(dashboard)` are route groups with their own layouts. Pages are thin server components that export `metadata` and render one feature component; dynamic pages `await params` (Next 15). |
| `src/features/<module>` | Everything specific to one module: list/detail/form views (`components/`) and Zod schemas (`schemas/`). Modules: auth, dashboard, products, categories, inventory, warehouses, suppliers, purchase-orders, requisitions, reports, users, roles, settings, profile, notifications. |
| `src/components/ui` | Unstyled-logic primitives with the design system applied: Button/ButtonLink, Input/Textarea, Select (native, accessible), Checkbox, Card, Badge, Modal (native `<dialog>`: focus trap, Esc), Dropdown (arrow keys, outside click), Tabs (roving focus), Avatar, Skeleton/Spinner. |
| `src/components/common` | App-level building blocks: PageHeader, StatCard, StatusBadge, ProfileHeader, DetailList, Empty/Error states, QueryBoundary, ConfirmDialog, SearchInput, FilterSelect, Pagination, Can (permission gate), Unauthorized, Toaster, Logo. |
| `src/components/forms` | `FormField` (label, required marker, error/hint wired with `aria-describedby`), `FormSection`, `FormErrorBanner`. |
| `src/components/tables` | `DataTable` — sortable headers with `aria-sort`, skeleton rows, pagination, and a stacked card layout below `md`. |
| `src/components/charts` | Recharts wrappers (bar, area, donut) loaded with `next/dynamic` (`ssr: false`). |
| `src/components/layout` | DashboardShell (auth guard, route permission gate, skip link), Sidebar (collapsible, submenus, active state), MobileNav (drawer), Header, Breadcrumbs, GlobalSearch, NotificationsMenu, UserMenu, ContextSwitcher (warehouse). |
| `src/services/api` | `apiConfig` (env), `apiTags`, `baseQuery`, `baseApi`, and one endpoint file per module in `endpoints/`. |
| `src/mocks` | `database/` (types, deterministic seed, fixtures, persistence), `handlers/` (route tables per domain, relations/joins, validation helpers), `mockBaseQuery.ts`. |
| `src/store/features` | Redux slices for client state: `authSlice`, `uiSlice`, `appContextSlice`. |
| `src/lib/redux` | `store.ts` (`makeStore`, `RootState`, `AppDispatch`), typed hooks, `provider.tsx`, `listeners.ts` (persistence side effects). |
| `src/lib/utils` | `cn`, formatting (dates, currency, numbers), CSV export, query-string helpers, safe storage, error helpers (`applyServerErrors`). |
| `src/hooks` | `useListState` (search/filter/sort/page → stable query args), `usePermissions`, `useToast`, `useDebounce`, `useBreadcrumbLabel`. |
| `src/config` | `app.config.ts` (names, units, departments) and `navigation.ts` (menu, breadcrumb labels, route→permission rules). |
| `src/constants` | Permission keys and labels, status → badge mapping, select options, storage keys. |
| `src/types` | `api.ts` (pagination, list params, `ApiError`) and `models.ts` (domain entities and report shapes). |
| `public/logo` | Brand logo (placeholder until the official file is supplied). |

## Decisions

- **Custom mock `baseQuery` instead of MSW.** It runs in the same process as RTK Query, needs no service worker, works in any browser and keeps one request contract for both modes. Switching is a single env variable.
- **One API slice, many endpoint files.** Avoids multiple middlewares/stores and lets tags invalidate across modules.
- **Tags model the data graph.** Stock-changing mutations (adjust, transfer, receive, issue) invalidate `Stock`, `Movement`, `Dashboard`, `Report`; entity edits invalidate their entity tag and `LIST`.
- **Client-only state in Redux, server state in RTK Query.** No API data is copied into slices.
- **Hydration-safe persistence.** The store starts empty on the server and first client render; `ReduxProvider` restores saved state in an effect. Auth status starts as `unknown` and the shell shows a loader until it resolves.
- **Permissions drive navigation and routes.** `navigation.ts` hides menu items and `DashboardShell` renders an "Access restricted" view when the user lacks the route's permission. Action buttons use `<Can>`. The mock API enforces the same permissions (403).
- **Accessible by default.** Native form controls, labelled inputs, error text linked with `aria-describedby`, `aria-invalid`, visible focus rings, skip link, `<dialog>` modals, keyboard-navigable menus/tabs, reduced-motion support.
- **Theming via tokens.** Brand colours are CSS variables in `globals.css`; swapping to the Canva palette is a one-file change.
