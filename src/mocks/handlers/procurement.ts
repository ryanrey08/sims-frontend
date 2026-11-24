import { PERMISSIONS } from "@/constants/permissions";
import type { PurchaseOrder, PurchaseOrderStatus, Requisition, RequisitionStatus } from "@/types/models";
import { getDb, newId, nowISO, persistDb } from "../database/db";
import { logActivityEntry } from "./activity";
import { actorName, enrichPurchaseOrder, enrichRequisition, postMovement, productTotals } from "./relations";
import {
  applyFilters,
  bodyOf,
  conflict,
  listResponse,
  matchesSearch,
  notFound,
  requireFields,
  requirePermission,
  validationFailed,
  type MockRequest,
  type MockRoute,
} from "./utils";

const findOrder = (id: string) => getDb().purchaseOrders.find((item) => item.id === id) ?? notFound("Purchase order");
const findRequisition = (id: string) => getDb().requisitions.find((item) => item.id === id) ?? notFound("Requisition");

function nextNumber(prefix: string, existing: string[]) {
  const max = existing.reduce((highest, value) => Math.max(highest, Number(value.replace(/\D/g, "").slice(-4)) || 0), 0);
  return `${prefix}${String(max + 1).padStart(4, "0")}`;
}

function validateLines(items: { productId: string; quantity: number; unitCost?: number }[] | undefined, withCost: boolean) {
  if (!items?.length) validationFailed({ items: ["Add at least one item."] });
  const errors: Record<string, string[]> = {};
  const seen = new Set<string>();
  items.forEach((item, index) => {
    if (!getDb().products.some((product) => product.id === item.productId)) errors[`items.${index}.productId`] = ["Select a product."];
    if (seen.has(item.productId)) errors[`items.${index}.productId`] = ["This product is already on the list."];
    seen.add(item.productId);
    if (!Number.isInteger(item.quantity) || item.quantity <= 0) errors[`items.${index}.quantity`] = ["Enter a quantity above 0."];
    if (withCost && (item.unitCost === undefined || item.unitCost < 0)) errors[`items.${index}.unitCost`] = ["Enter a valid unit cost."];
  });
  if (Object.keys(errors).length) validationFailed(errors);
}

function setOrderStatus(request: MockRequest, order: PurchaseOrder, status: PurchaseOrderStatus) {
  const allowed: Record<PurchaseOrderStatus, PurchaseOrderStatus[]> = {
    draft: ["pending", "cancelled"],
    pending: ["approved", "cancelled", "draft"],
    approved: ["cancelled"],
    "partially-received": [],
    received: [],
    cancelled: [],
  };
  if (!allowed[order.status].includes(status)) conflict(`A ${order.status.replace("-", " ")} purchase order cannot be changed to ${status}.`);
  if (status === "approved" || status === "cancelled") requirePermission(request, PERMISSIONS.purchasingApprove);
  order.status = status;
  if (status === "approved") order.approvedBy = actorName(request.userId);
  order.updatedAt = nowISO();
}

export const procurementRoutes: MockRoute[] = [
  // Purchase orders ---------------------------------------------------------------
  {
    method: "GET",
    pattern: "/purchase-orders",
    handler: ({ query }) => {
      const items = applyFilters(getDb().purchaseOrders, query, ["status", "supplierId", "warehouseId"])
        .filter((item) => (!query.from || item.orderDate >= query.from) && (!query.to || item.orderDate <= query.to))
        .map(enrichPurchaseOrder)
        .filter((item) => matchesSearch(query.search, [item.poNumber, item.supplierName, item.notes]));
      return listResponse(items, { sortBy: "orderDate", sortOrder: "desc", ...query });
    },
  },
  { method: "GET", pattern: "/purchase-orders/:id", handler: ({ params }) => enrichPurchaseOrder(findOrder(params.id)) },
  {
    method: "POST",
    pattern: "/purchase-orders",
    handler: (request) => {
      requirePermission(request, PERMISSIONS.purchasingManage);
      const body = bodyOf<Partial<PurchaseOrder>>(request);
      requireFields(body as Record<string, unknown>, ["supplierId", "warehouseId", "orderDate", "expectedDate"]);
      validateLines(body.items, true);
      if (body.expectedDate! < body.orderDate!) validationFailed({ expectedDate: ["Expected date must be on or after the order date."] });
      const db = getDb();
      const supplier = db.suppliers.find((item) => item.id === body.supplierId);
      if (!supplier || supplier.status !== "active") validationFailed({ supplierId: ["Select an active supplier."] });
      const timestamp = nowISO();
      const order: PurchaseOrder = {
        id: newId("po"),
        poNumber: nextNumber(db.settings.poPrefix, db.purchaseOrders.map((item) => item.poNumber)),
        supplierId: body.supplierId!,
        warehouseId: body.warehouseId!,
        orderDate: body.orderDate!,
        expectedDate: body.expectedDate!,
        status: body.status === "pending" ? "pending" : "draft",
        items: body.items!.map((item) => ({ productId: item.productId, quantity: item.quantity, unitCost: item.unitCost, receivedQuantity: 0 })),
        notes: body.notes,
        createdBy: actorName(request.userId),
        approvedBy: null,
        createdAt: timestamp,
        updatedAt: timestamp,
      };
      db.purchaseOrders.unshift(order);
      logActivityEntry(request, "created purchase order", order.poNumber, "Purchasing");
      persistDb();
      return enrichPurchaseOrder(order);
    },
  },
  {
    method: "PUT",
    pattern: "/purchase-orders/:id",
    handler: (request) => {
      requirePermission(request, PERMISSIONS.purchasingManage);
      const order = findOrder(request.params.id);
      if (order.status !== "draft" && order.status !== "pending") conflict("Only draft or pending purchase orders can be edited.");
      const body = bodyOf<Partial<PurchaseOrder>>(request);
      validateLines(body.items, true);
      Object.assign(order, {
        supplierId: body.supplierId ?? order.supplierId,
        warehouseId: body.warehouseId ?? order.warehouseId,
        orderDate: body.orderDate ?? order.orderDate,
        expectedDate: body.expectedDate ?? order.expectedDate,
        notes: body.notes,
        status: body.status === "pending" ? "pending" : order.status,
        items: body.items!.map((item) => ({ productId: item.productId, quantity: item.quantity, unitCost: item.unitCost, receivedQuantity: 0 })),
        updatedAt: nowISO(),
      });
      logActivityEntry(request, "updated purchase order", order.poNumber, "Purchasing");
      persistDb();
      return enrichPurchaseOrder(order);
    },
  },
  {
    method: "PATCH",
    pattern: "/purchase-orders/:id/status",
    handler: (request) => {
      requirePermission(request, PERMISSIONS.purchasingManage);
      const order = findOrder(request.params.id);
      const { status } = bodyOf<{ status: PurchaseOrderStatus }>(request);
      setOrderStatus(request, order, status);
      logActivityEntry(request, `${status === "pending" ? "submitted" : status} purchase order`, order.poNumber, "Purchasing");
      persistDb();
      return enrichPurchaseOrder(order);
    },
  },
  {
    method: "POST",
    pattern: "/purchase-orders/:id/receive",
    handler: (request) => {
      requirePermission(request, PERMISSIONS.inventoryAdjust);
      const order = findOrder(request.params.id);
      if (order.status !== "approved" && order.status !== "partially-received") conflict("Only approved purchase orders can be received.");
      const body = bodyOf<{ items: { productId: string; quantity: number }[]; notes?: string }>(request);
      const errors: Record<string, string[]> = {};
      body.items.forEach((line, index) => {
        const item = order.items.find((entry) => entry.productId === line.productId);
        const outstanding = item ? item.quantity - item.receivedQuantity : 0;
        if (!Number.isInteger(line.quantity) || line.quantity < 0) errors[`items.${index}.quantity`] = ["Enter 0 or more."];
        else if (line.quantity > outstanding) errors[`items.${index}.quantity`] = [`Only ${outstanding} outstanding.`];
      });
      if (Object.keys(errors).length) validationFailed(errors);
      if (!body.items.some((line) => line.quantity > 0)) validationFailed({ items: ["Enter at least one received quantity."] });
      const supplier = getDb().suppliers.find((item) => item.id === order.supplierId);
      body.items.forEach((line) => {
        if (!line.quantity) return;
        const item = order.items.find((entry) => entry.productId === line.productId)!;
        item.receivedQuantity += line.quantity;
        postMovement({
          productId: item.productId,
          warehouseId: order.warehouseId,
          type: "receipt",
          quantity: line.quantity,
          reason: `Received from ${supplier?.name ?? "supplier"}${body.notes ? ` — ${body.notes}` : ""}`,
          reference: order.poNumber,
          performedBy: actorName(request.userId),
          sourceType: "purchase-order",
          sourceId: order.id,
        });
      });
      order.status = order.items.every((item) => item.receivedQuantity >= item.quantity) ? "received" : "partially-received";
      order.updatedAt = nowISO();
      logActivityEntry(request, "received delivery for", order.poNumber, "Purchasing");
      persistDb();
      return enrichPurchaseOrder(order);
    },
  },
  {
    method: "DELETE",
    pattern: "/purchase-orders/:id",
    handler: (request) => {
      requirePermission(request, PERMISSIONS.purchasingManage);
      const db = getDb();
      const order = findOrder(request.params.id);
      if (order.status !== "draft") conflict("Only draft purchase orders can be deleted. Cancel it instead.");
      db.purchaseOrders = db.purchaseOrders.filter((item) => item.id !== order.id);
      persistDb();
      return { message: "Purchase order deleted." };
    },
  },

  // Requisitions ---------------------------------------------------------------------
  {
    method: "GET",
    pattern: "/requisitions",
    handler: ({ query }) => {
      const items = applyFilters(getDb().requisitions, query, ["status", "department", "warehouseId", "priority"])
        .map(enrichRequisition)
        .filter((item) => matchesSearch(query.search, [item.reqNumber, item.requestedBy, item.department, item.purpose]));
      return listResponse(items, { sortBy: "createdAt", sortOrder: "desc", ...query });
    },
  },
  { method: "GET", pattern: "/requisitions/:id", handler: ({ params }) => enrichRequisition(findRequisition(params.id)) },
  {
    method: "POST",
    pattern: "/requisitions",
    handler: (request) => {
      requirePermission(request, PERMISSIONS.requisitionsCreate);
      const body = bodyOf<Partial<Requisition>>(request);
      requireFields(body as Record<string, unknown>, ["department", "warehouseId", "neededBy", "purpose", "priority"]);
      validateLines(body.items, false);
      const db = getDb();
      const timestamp = nowISO();
      const requisition: Requisition = {
        id: newId("req"),
        reqNumber: nextNumber(db.settings.requisitionPrefix, db.requisitions.map((item) => item.reqNumber)),
        department: body.department!,
        requestedBy: actorName(request.userId),
        warehouseId: body.warehouseId!,
        neededBy: body.neededBy!,
        purpose: body.purpose!,
        priority: body.priority!,
        status: "pending",
        items: body.items!.map((item) => ({ productId: item.productId, quantity: item.quantity, issuedQuantity: 0 })),
        remarks: body.remarks,
        createdAt: timestamp,
        updatedAt: timestamp,
      };
      db.requisitions.unshift(requisition);
      logActivityEntry(request, "submitted requisition", requisition.reqNumber, "Requisitions");
      persistDb();
      return enrichRequisition(requisition);
    },
  },
  {
    method: "PATCH",
    pattern: "/requisitions/:id/status",
    handler: (request) => {
      const requisition = findRequisition(request.params.id);
      const { status, remarks } = bodyOf<{ status: RequisitionStatus; remarks?: string }>(request);
      const allowed: Record<RequisitionStatus, RequisitionStatus[]> = {
        pending: ["approved", "rejected", "cancelled"],
        approved: ["cancelled"],
        rejected: [],
        issued: [],
        cancelled: [],
      };
      if (!allowed[requisition.status].includes(status)) conflict(`A ${requisition.status} requisition cannot be ${status}.`);
      requirePermission(request, status === "cancelled" ? PERMISSIONS.requisitionsCreate : PERMISSIONS.requisitionsApprove);
      if (status === "rejected" && !remarks?.trim()) validationFailed({ remarks: ["Give a reason for rejecting the request."] });
      requisition.status = status;
      if (remarks !== undefined) requisition.remarks = remarks;
      requisition.updatedAt = nowISO();
      logActivityEntry(request, `${status} requisition`, requisition.reqNumber, "Requisitions");
      persistDb();
      return enrichRequisition(requisition);
    },
  },
  {
    method: "POST",
    pattern: "/requisitions/:id/issue",
    handler: (request) => {
      requirePermission(request, PERMISSIONS.requisitionsApprove);
      const requisition = findRequisition(request.params.id);
      if (requisition.status !== "approved") conflict("Approve the requisition before issuing supplies.");
      const body = bodyOf<{ items: { productId: string; quantity: number }[] }>(request);
      const errors: Record<string, string[]> = {};
      body.items.forEach((line, index) => {
        const item = requisition.items.find((entry) => entry.productId === line.productId);
        const available = productTotals(line.productId, requisition.warehouseId);
        if (!item) errors[`items.${index}.quantity`] = ["Not on this requisition."];
        else if (!Number.isInteger(line.quantity) || line.quantity < 0) errors[`items.${index}.quantity`] = ["Enter 0 or more."];
        else if (line.quantity > item.quantity) errors[`items.${index}.quantity`] = [`Requested only ${item.quantity}.`];
        else if (line.quantity > available) errors[`items.${index}.quantity`] = [`Only ${available} in stock.`];
      });
      if (Object.keys(errors).length) validationFailed(errors);
      body.items.forEach((line) => {
        const item = requisition.items.find((entry) => entry.productId === line.productId)!;
        item.issuedQuantity = line.quantity;
        if (!line.quantity) return;
        postMovement({
          productId: line.productId,
          warehouseId: requisition.warehouseId,
          type: "issue",
          quantity: line.quantity,
          reason: `Issued to ${requisition.department}`,
          reference: requisition.reqNumber,
          performedBy: actorName(request.userId),
          sourceType: "requisition",
          sourceId: requisition.id,
        });
      });
      requisition.status = "issued";
      requisition.updatedAt = nowISO();
      logActivityEntry(request, "issued supplies for", requisition.reqNumber, "Requisitions");
      persistDb();
      return enrichRequisition(requisition);
    },
  },
];
