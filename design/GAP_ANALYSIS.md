# UI gap analysis: current app vs. Canva mockup

Source of truth: `design/CANVA_NOTES.md` (all 88 screens, read at full resolution on 2026-11-26).
Legend: [ ] to do · [x] done · (new) = screen exists in the mockup but not in the app yet.

## A. Shared shell and components (affects every page)
- [ ] Header: remove the warehouse selector (not in the mockup); search box with icon on the right and module-specific placeholder; bell with red dot; help icon; avatar + "Admin" + chevron (no role line).
- [ ] Sidebar: exact menu tree and labels from the mockup (Warehouse / Inventory Transactions / Inventory Management / Property Management children); children use bullets; active parent and active child red.
- [ ] Breadcrumb: home icon › Module › Page (last item bold).
- [ ] Page title: 32px red outline module icon, 22px bold title, gray subtitle; actions on the right (red primary, outline secondary).
- [ ] Summary cards: 5 tints (blue, green, yellow, pink, purple) with large outline icon; 4–6 per row.
- [ ] Tables: gray header row with ⇅ sort icons; code columns as blue links; status pills rounded-md without dot; inline square icon actions (view / edit / delete / more).
- [ ] Pagination: "Showing 1 to 10 of N records" + « ‹ 1 2 3 › » (active red) + "10 / page".
- [ ] Filter bars: inline "Label [select]" variant (warehouse screens) and labels-above variant with red "Search" button (transaction / inventory / property screens).
- [ ] Tabs: underline-with-icons variant and bordered-pill variant.
- [ ] Modals: red header bar variant (create/edit), white confirm variant with green check icon (approve/post), success dialog (big green check + summary + 2–3 actions).
- [ ] Forms: horizontal label-left fields inside section cards with small red section icons; toggle switch for Status; red asterisks.
- [ ] Buttons: green success variant (Approve, Approve and Post, Submit for Approval on some screens).
- [ ] Approval workflow: horizontal stepper (forms) and vertical list with pink current row (approval pages).
- [ ] Summary box: pink "Total Amount" panel used on every transaction form.

## B. Pages with a mockup screen
| Area | Mockup pages | Current app | Gap |
|---|---|---|---|
| Multiple Warehouse | p3–p5 | list + separate add page | [ ] Import button, list/grid toggle, No. of Locations column, colored type pills, inline actions; [ ] Add/Edit as red modal with Region/City/Barangay/Postal + Warehouse Settings; [ ] success dialog |
| Warehouse Locations | p6–p8 | generic registry | [ ] dedicated screen: 4 cards incl. Total Capacity, Warehouse filter, type pills; [ ] Add Location modal with Location Attributes; [ ] success dialog |
| Stock Transfer | p9–p13 | generic document list/form/detail | [ ] list cards (Total, Completed, In Transit, Cancelled), From → To columns, Requested By; [ ] form layout with Transfer Information card, items with Available/Remarks, bottom Remarks + horizontal workflow; [ ] role approval page (Current Status box, remarks, Reject/Approve) |
| Stock Management | p14 | "Stock levels" | [ ] title/cards + Stock Value Trend chart, pill tabs, Reserved/Available, Sufficient/Below Reorder/Out of Stock |
| Stock Adjustment | p15–p18 | generic form | [ ] Current/Adjustment/New Stock columns, attachments, approval page with info banner and Return to Supply Officer |
| Stock Count (Physical Inventory) | p19–p25 | generic list/form | [ ] list with 5 cards and underline tabs; [ ] 3-step wizard (Setup, Enter Count, Review & Submit); [ ] custodian approval + "Approve and Post Count" modal |
| Receiving (GRN) | p26–p27 | generic IAR form | [ ] GRN header (Draft pill, GRN No., Date), Supplier Information card, PO/Received/Accepted/Rejected qty, summary + pink total, approve modal |
| Issuance (RIS/ICS/PAR) | p28–p36 | generic RIS list/form | [ ] list with RIS/ICS/PAR cards and tabs, type pills; [ ] RIS / ICS / PAR forms with Requestor Information and Approvals cards; [ ] submit popover; [ ] approved PAR detail |
| Item Master / New Item | p37–p38 | product list + form | [ ] 5 cards, underline tabs, Item Type / Reorder cols; [ ] New Item page with Classification, Item Image, Inventory & Reorder, Costing, Additional Details |
| Stock Inquiry (new) | p39 | — | [ ] build |
| Reorder Management + PR (new) | p40–p43 | — | [ ] build reorder suggestions and Purchase Request create / submit / detail |
| Barcode / QR Management | p44–p50 | simple labels page | [ ] Generate Labels with preview + settings, generate modals; [ ] Manage Barcodes / QR; [ ] Label Templates; [ ] Scan / Verify |
| Property Management | p51–p53 | registry list | [ ] list + details panel, 5 cards, tabs; [ ] New Property red modal; [ ] success dialog |
| Property Transactions | p54–p61 | separate document types | [ ] unified list with 6 cards, type tabs, details panel; [ ] New Property Transaction modal with 7 type buttons |
| Property Master | p62–p66 | registry | [ ] red-header card with tabs; [ ] New Property modal with 5 tabs incl. Depreciation Setup and Attachments |
| Maintenance (new) | p67–p78 | — | [ ] dashboard, requests wizard, work orders list, work order detail tabs, completion modal |
| Disposal / Transfer | p79–p84 | separate document types | [ ] list + details panel; [ ] transfer / disposal forms; [ ] submit + approved modals |
| Property / Inventory / Maintenance / Disposal Reports | p85–p88 | forms index | [ ] report hub with categories, report cards, generate form, recent reports |

## C. Pages without a mockup screen
Login, Dashboard, Reports module index, Monitoring, Administration (Users, Roles, Settings), Profile, Notifications, Suppliers, Purchase Orders, Supply Requests: apply the shared components above so they match the rest of the app. No layout changes are invented beyond the shared style.
