# API integration

## Configuration

`src/services/api/apiConfig.ts` reads:

| Variable | Values | Notes |
|---|---|---|
| `NEXT_PUBLIC_API_MODE` | `mock` (default) · `real` | Build-time; rebuild after changing |
| `NEXT_PUBLIC_API_BASE_URL` | e.g. `https://api.example.com/api` | No trailing slash needed |
| `NEXT_PUBLIC_MOCK_DELAY_MS` | number | Mock latency only |

All requests go through `appBaseQuery` (`src/services/api/baseQuery.ts`):

- **Real mode**: `fetchBaseQuery` with `baseUrl`, `Accept: application/json`, `Authorization: Bearer <token>` when signed in, a 20 s timeout and a stable query-string serializer (sorted keys, empty values dropped).
- **Mock mode**: the same arguments are handled in the browser by `src/mocks/mockBaseQuery.ts`.
- Errors in both modes are normalized to `ApiError`: `{ status, message, errors? }`. A `401` dispatches `sessionExpired()` and the app returns to `/login?next=…`. Real mode never falls back to mock data.

## Conventions the backend should follow

**List endpoints** accept `page` (1-based), `pageSize`, `search`, `sortBy`, `sortOrder` (`asc`|`desc`) plus module filters, and return:

```json
{ "data": [ … ], "meta": { "page": 1, "pageSize": 10, "total": 42, "totalPages": 5 } }
```

**Single-record endpoints** return the record object. **Mutations** return the saved record (or `{ "message": "…" }` for deletes and actions without a record).

**Errors** return JSON with a message; validation errors use `422` and field errors (arrays or strings):

```json
{ "message": "Please correct the highlighted fields.", "errors": { "sku": ["This SKU is already used by another product."] } }
```

`401` = not signed in / expired, `403` = missing permission, `404` = not found, `409` = business-rule conflict (e.g. deleting a product with stock history). Field errors are shown inline on forms via `applyServerErrors`; others appear as banners/toasts.

Records may include **derived fields** (marked "Derived" in `src/types/models.ts`, e.g. `categoryName`, `totalStock`, `stockStatus`, `supplierName`, `total`). The UI expects the API to compute these, as the mock does.

Dates are ISO strings (`YYYY-MM-DD` for dates, full ISO for timestamps). Money is a number in the system currency (PHP).

## Endpoint reference

Grouped by endpoint file in `src/services/api/endpoints/`.

### authApi.ts
| Method | Path | Body / params | Returns |
|---|---|---|---|
| POST | `/auth/login` | `{ email, password }` | `{ token, user: AuthUser }` |
| POST | `/auth/logout` | – | `{ message }` |
| GET | `/auth/me` | – | `AuthUser` (`id, name, email, roleId, roleName, department, permissions[]`) |
| PUT | `/auth/profile` | `{ name, email }` | `AuthUser` |
| PUT | `/auth/password` | `{ currentPassword, newPassword }` | `{ message }` |
| POST | `/auth/forgot-password` | `{ email }` | `{ message }` (same response whether or not the email exists) |
| POST | `/auth/reset-password` | `{ token, password }` | `{ message }` |

### dashboardApi.ts
| GET | `/dashboard/summary` | `warehouseId?` | `DashboardSummary` |
|---|---|---|---|
| GET | `/dashboard/activities` | `limit?` | `ActivityLog[]` |
| GET | `/search` | `q` | `{ products[], suppliers[], purchaseOrders[] }` of `{ id, title, subtitle }` |

### productsApi.ts / categoriesApi.ts
| Method | Path | Notes |
|---|---|---|
| GET | `/products` | filters: `categoryId, status, stockStatus, preferredSupplierId, warehouseId` (scopes stock totals) |
| GET | `/products/:id` · `/products/:id/stock` · `/products/:id/movements?limit=` | detail, stock per warehouse, recent movements |
| POST / PUT | `/products` · `/products/:id` | `sku, name, description, categoryId, unit, unitCost, reorderLevel, reorderQuantity, preferredSupplierId, barcode?, status` |
| PATCH | `/products/:id/status` | `{ status: "active" | "discontinued" }` |
| DELETE | `/products/:id` | 409 if the product has stock history |
| GET/POST/PUT/DELETE | `/categories`, `/categories/:id` | `code, name, description, status`; delete blocked while products exist |

### suppliersApi.ts
| GET | `/suppliers` (filters `status, paymentTerms`) · `/suppliers/:id` · `/suppliers/:id/purchase-orders` · `/suppliers/:id/products` |
|---|
| POST / PUT `/suppliers[/:id]` — `code, name, contactPerson, email, phone, address, tin?, paymentTerms, leadTimeDays, status` |
| PATCH `/suppliers/:id/status` · DELETE `/suppliers/:id` (409 if it has purchase orders) |

### warehousesApi.ts
| GET `/warehouses` (filters `status, type`) · `/warehouses/:id` — includes derived `locationCount, itemCount, totalUnits, stockValue` |
|---|
| POST / PUT `/warehouses[/:id]` — `code, name, type (central|supplies|property|field), address, region, city, barangay, postalCode, manager?, phone?, status, allowTransactions, allowTransfer, allowPhysicalInventory, defaultReceiving, defaultIssuance, remarks` |
| DELETE `/warehouses/:id` (409 if it has stock history) |

### inventoryApi.ts
| Method | Path | Body / params |
|---|---|---|
| GET | `/inventory/stock` | filters `warehouseId, categoryId, productId, stockStatus` → `Paginated<StockLevel>`; each level includes `warehouseCode`, `reserved` (held by pending issuances, transfers and stock-out adjustments) and `available` |
| GET | `/inventory/summary` | `warehouseId?` → `{ totalItems, totalValue, belowReorder, outOfStock, valueTrend: [{ label, value }] }` (last 6 months; Stock Management cards and chart) |
| GET | `/inventory/movements` | filters `type, warehouseId, productId, from, to` → `Paginated<StockMovement>` |
| GET | `/inventory/availability` | `productId, warehouseId` → `{ quantity }` |
| POST | `/inventory/adjustments` | `{ productId, warehouseId, direction: "in"|"out", quantity, reason }` → `StockMovement` (422 if out > available) |
| POST | `/inventory/transfers` | `{ productId, fromWarehouseId, toWarehouseId, quantity, reason }` → `StockMovement` (records transfer-out and transfer-in) |

### purchaseOrdersApi.ts
| Method | Path | Body |
|---|---|---|
| GET | `/purchase-orders` | filters `status, supplierId, warehouseId, from, to` |
| GET | `/purchase-orders/:id` | items include `sku, productName, unit` |
| POST / PUT | `/purchase-orders[/:id]` | `{ supplierId, warehouseId, orderDate, expectedDate, notes?, status: "draft"|"pending", items: [{ productId, quantity, unitCost }] }`; PUT only for draft/pending |
| PATCH | `/purchase-orders/:id/status` | `{ status }` — draft→pending, pending→approved, draft/pending/approved→cancelled |
| POST | `/purchase-orders/:id/receive` | `{ items: [{ productId, quantity }], notes? }` → adds stock, sets `partially-received`/`received` |
| DELETE | `/purchase-orders/:id` | drafts only |

### requisitionsApi.ts
| Method | Path | Body |
|---|---|---|
| GET | `/requisitions` | filters `status, department, warehouseId, priority`; items include `available` |
| GET | `/requisitions/:id` | |
| POST | `/requisitions` | `{ department, warehouseId, neededBy, purpose, priority, remarks?, items: [{ productId, quantity }] }` |
| PATCH | `/requisitions/:id/status` | `{ status: "approved"|"rejected"|"cancelled", remarks? }` (reason required for rejection) |
| POST | `/requisitions/:id/issue` | `{ items: [{ productId, quantity }] }` → deducts stock, status `issued` |

### reportsApi.ts
| GET | `/reports/valuation` | `warehouseId, categoryId` → `ValuationReport` |
|---|---|---|
| GET | `/reports/movements` | `warehouseId, categoryId, from, to` → `MovementReport` |
| GET | `/reports/purchasing` | `supplierId, from, to` → `PurchasingReport` |

### usersApi.ts · rolesApi.ts · settingsApi.ts · notificationsApi.ts
| Path | Notes |
|---|---|
| `GET/POST /users`, `GET/PUT/DELETE /users/:id`, `PATCH /users/:id/status` | user: `name, email, roleId, department, status`; `password` on create |
| `GET /permissions` | `[{ key, module, label }]` |
| `GET/POST /roles`, `GET/PUT/DELETE /roles/:id` | role: `name, description, permissions[]`; system roles cannot be deleted |
| `GET/PUT /settings` | `SystemSettings` |
| `POST /settings/reset-demo-data` | mock only |
| `GET /notifications`, `PATCH /notifications/:id/read`, `POST /notifications/read-all` | |

Permission keys are listed in `src/constants/permissions.ts`; the backend should enforce the same keys.

## Using the API in components

```tsx
const list = useListState({ sortBy: "name" });                 // search, filters, sort, page
const { data, isLoading, isFetching, error } = useGetProductsQuery(list.params);
const [updateProduct] = useUpdateProductMutation();
await updateProduct({ id, body }).unwrap();                    // throws ApiError on failure
```

- Conditional fetching: pass `{ skip: true }` until inputs are ready, e.g. `useGetAvailabilityQuery(args, { skip: !productId })`.
- Lazy queries: `useLazyGetProductsQuery()` for CSV export, `useLazyGlobalSearchQuery()` in the header.
- Identical arguments share one request and one cache entry (deduplication).

## Adding a module

1. Add types to `src/types/models.ts` and a tag to `apiTags.ts`.
2. Create `src/services/api/endpoints/<module>Api.ts` with `baseApi.injectEndpoints`.
3. (Mock mode) add handlers in `src/mocks/handlers/` and register them in `handlers/index.ts`.
4. Build views under `src/features/<module>/`, add thin pages under `src/app/(dashboard)/`, and add the menu item + route rule in `src/config/navigation.ts`.

## Connecting the backend — checklist

1. Implement the endpoints above with the same shapes (or adapt `baseQuery.ts` if responses are wrapped).
2. Allow the frontend origin in CORS and the `Authorization` header.
3. Set `NEXT_PUBLIC_API_MODE=real` and `NEXT_PUBLIC_API_BASE_URL`, then `npm run build`.
4. Sign in with a real account; the demo-account panel is hidden in real mode.
5. For cookie-based sessions: remove the `Authorization` header in `prepareHeaders`, add `credentials: "include"` to `fetchBaseQuery`, and return the user from `/auth/login` without a token (store a placeholder token or adjust `authSlice`).

## Config-driven modules (registries, documents, forms)

These endpoints serve the modules generated from `src/config/masterData.ts`, `src/config/documents.ts` and `src/config/reportForms.ts`. The `:resource`, `:type` and `:code` values are the `key`/`code` entries in those files.

### mastersApi.ts — registries
| Method | Path | Notes |
|---|---|---|
| GET | `/masters/:resource` | list params plus any field as a filter; reference fields come back with a `<field>__label` companion |
| GET | `/masters/:resource/:id` | |
| POST / PUT | `/masters/:resource[/:id]` | body = the config's fields; 422 for required/unique violations |
| DELETE | `/masters/:resource/:id` | 409 when the record is referenced |

Resources: `locations`, `item-classifications`, `units`, `property-classifications`, `employees`, `properties`, `label-codes` (barcodes / QR codes), `label-templates`, `label-prints` (print history), `work-orders` (maintenance requests and work orders; `tasks`, `parts`, `activity` and `attachments` are JSON strings), `generated-reports` (report hub history).

Products also accept the Item Master fields `itemType, shortDescription, subcategory, itemGroup, brand, model, accountCode, minStock, maxStock, defaultWarehouseId, unitPrice, valuationMethod, specifications, remarks, imageUrl` and return `reservedStock`.

### documentsApi.ts — transaction documents with approval
| Method | Path | Body |
|---|---|---|
| GET | `/documents/:type` | filters `status` (also the display statuses `completed`, `in-transit`, `in-progress`, `variance`), `from, to, search`, and any header field (e.g. `warehouseId`, `issuanceType=RIS`) → `Paginated<TransactionDocument>` |
| GET | `/documents/summary` | `{ [type]: { total, pending } }` |
| GET | `/documents/:type/:id` | items include `code, description, unit`; `labels` holds reference names |
| POST / PUT | `/documents/:type[/:id]` | `{ date, fields: {…}, items: [{ refId, quantity, countedQty?, poQty?, receivedQty?, condition?, remarks? }], remarks?, attachments?: [{ name, size, type }], submit }` |
| POST | `/documents/:type/:id/submit` · `/approve` · `/reject` · `/cancel` | `{ remarks? }` (required for reject) |

`approvals` is an ordered array of `{ role, status: waiting|pending|approved|rejected, by, at, remarks }`. The last approval posts the document and applies its effect (stock movements or property accountability changes). Types: `stock-transfers`, `stock-adjustments`, `receiving` (GRN; accepted quantity is `quantity`, rejected = received − accepted), `issuances` (RIS / ICS / PAR; the number prefix follows `issuanceType`), `purchase-requests` (Department Head → Procurement → Finance), `returns`, `physical-counts` (Stock Count, prefix CNT), `reconciliations`, `property-assignments`, `property-transfers`, `property-returns`, `property-disposals`. Numbers use five digits, e.g. `ST-2026-00129`.

### reportFormsApi.ts — forms and monitoring
| GET | `/reports/forms/:code` | filters `warehouseId, productId, supplierId, employeeId, propertyId, from, to` → `ReportTable` `{ title, subtitle?, meta?, columns[{key,label,format,align}], rows[], totals?, signatories? }` |
|---|---|---|

Codes: `iar, raaf, supplier-ledger, stock-card, inventory-ledger, ics, ris, rsmi, wmr, rpci, low-stock, reorder, valuation, stock-aging, movement-history, property-card, par, rpcppe, iirup, rlsddp, ptr, ppe-ledger, audit-trail`.
