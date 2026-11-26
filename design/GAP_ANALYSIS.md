# UI gap analysis: app vs. Canva mockup

Source of truth: `design/CANVA_NOTES.md` (all 88 screens, read at full resolution on 2026-11-26).
Legend: [x] matched and checked in the browser · [~] matched with a noted difference · [ ] not done.

## A. Shared shell and components
- [x] Header: logo, search with icon on the right and module-specific placeholder, bell with red dot, help, avatar + name + chevron; no warehouse selector.
- [x] Sidebar: mockup menu tree; bullets for children; red active parent and child; the most specific item wins and related screens (e.g. Purchase Requests under Reorder Management) keep their menu item active.
- [x] Breadcrumb: home icon › Module › Page (last item bold).
- [x] Page title: red outline icon, bold title, grey subtitle, actions on the right.
- [x] Summary cards: blue / green / yellow / pink / purple tints, 4–6 per row.
- [x] Tables: grey header with ⇅ sort icons, blue underlined code links, rounded-md status pills, inline square icon actions.
- [x] Pagination: "Showing 1 to 10 of N records" + « ‹ 1 2 3 › » + "10 / page".
- [x] Filter bars: inline "Label [select]" and labels-above with a red Search button.
- [x] Tabs: underline-with-icons and bordered-pill variants.
- [x] Modals: red header bar, white confirmation with green check, success dialogs.
- [x] Forms: horizontal label-left fields in section cards with red icons; green toggle; red asterisks.
- [x] Buttons: green success variant (Approve, Approve and Post, Mark as Completed).
- [x] Approval workflow: horizontal stepper on forms, vertical list with pink current row on approval pages.
- [x] Pink "Total Amount" summary panel.

## B. Pages with a mockup screen
| Area | Mockup pages | Status | Notes |
|---|---|---|---|
| Multiple Warehouse | p3–p5 | [x] | Import CSV, list/grid toggle, No. of Locations, red Add/Edit modal with Region/City/Barangay/Postal and Warehouse Settings, success dialog. |
| Warehouse Locations | p6–p8 | [x] | Cards incl. Total Capacity, Warehouse filter, type pills, Add Location modal with attributes, success dialog. |
| Stock Transfer | p9–p13 | [x] | Cards, From → To warehouse cells, form with Transfer Information, Available (From WH), horizontal workflow; role approval pages with Current Status, remarks, Reject / Approve. |
| Stock Management | p14 | [x] | Cards + 6-month value trend, pill tabs to each module, Reserved / Available, Sufficient / Below Reorder / Out of Stock. |
| Stock Adjustment | p15–p18 | [~] | Current / Adjustment / New Stock columns, attachments, approval page with info banner. "Return to Supply Officer" is not available: returning sends the document back to the preparer. |
| Stock Count | p19–p25 | [x] | Five cards, list / count details / variance / history tabs, 3-step wizard with review and approval route, Approve and Post confirmation. |
| Receiving (GRN) | p26–p27 | [x] | Header Draft pill + GRN No. + date, Supplier Information card, PO / Received / Accepted / Rejected, summary with pink total, Approve and Post modal. |
| Issuance (RIS/ICS/PAR) | p28–p36 | [~] | RIS/ICS/PAR cards and tabs, type pills, Requestor Information card, summary. RIS / ICS / PAR share one form (the type select switches the number prefix); the PAR submit popover (p35) is the standard Submit for Approval action. |
| Item Master / New Item | p37–p38 | [~] | Five cards, list / item types / reorder settings views, New Item page with all six cards. UoM and Categories tabs open their registries. "Save as Draft" keeps the draft on this device. |
| Stock Inquiry | p39 | [x] | Cards, filters, On Hand / Reserved / Available, item panel with movement, warehouse stock, reservations, reorder info, history. |
| Reorder Management + PR | p40–p43 | [~] | Suggestions with editable order quantity and computation panel, Generate PR / Add to Draft PR. PR detail shows the vertical approval list instead of the horizontal stepper of p42–p43. |
| Barcode / QR Management | p44–p50 | [~] | All six tabs, generate modals, manage codes, templates, scan / verify, print history. The template designer previews the label from its properties; it is not a drag-and-drop canvas. Camera scanning uses the browser's barcode detector where available. |
| Property Management | p51–p53 | [~] | Cards, module tabs, filters, list + details panel with QR, success dialog. New Property uses the tabbed modal of p63–p66 for both screens. |
| Property Transactions | p54–p61 | [~] | Six cards, type tabs, details panel. The New Property Transaction selector (seven types) continues to each type's own form instead of one combined modal. |
| Property Master | p62–p66 | [x] | Red-header card, pill tabs, depreciation view, details + quick actions; New Property modal with Property Information, Acquisition, Depreciation Setup (schedule), Location & Custodian and Attachments tabs. |
| Maintenance | p67–p78 | [x] | Dashboard with status donut and upcoming PM, requests (3-step submit with result), work orders with type donut and due-this-week, work order detail with all five tabs, Mark as Completed modal. |
| Disposal / Transfer | p79–p84 | [~] | Cards, tabs incl. approval queue and audit log, list + details panel. New Transaction opens the transfer or disposal form; the Transfer/Disposal radio page of p80/p82 is not a separate screen. |
| Property / Inventory / Maintenance / Disposal Reports | p85–p88 | [x] | Report categories, six report cards per hub, generate form (Save Filter, Preview, Export to Excel / PDF, Generate), Recent Reports. |

## C. Pages without a mockup screen
Login, Dashboard, Reports index, Monitoring, Administration (Users, Roles, Settings), Profile, Notifications, Suppliers, Purchase Orders, Supply Requests use the shared components above. No layout was invented beyond the shared style.
