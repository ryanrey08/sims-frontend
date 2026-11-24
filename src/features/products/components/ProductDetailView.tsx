"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { ArrowLeftRight, Archive, ArchiveRestore, Package, Pencil, SlidersHorizontal, Trash2 } from "lucide-react";
import { Can } from "@/components/common/Can";
import { ConfirmDialog } from "@/components/common/ConfirmDialog";
import { DetailList } from "@/components/common/DetailList";
import { ProfileHeader } from "@/components/common/ProfileHeader";
import { QueryBoundary } from "@/components/common/QueryBoundary";
import { StatusBadge } from "@/components/common/StatusBadge";
import { EmptyState } from "@/components/common/States";
import { DataTable, type Column } from "@/components/tables/DataTable";
import { Button } from "@/components/ui/Button";
import { ButtonLink } from "@/components/ui/ButtonLink";
import { Card, CardContent, CardHeader } from "@/components/ui/Card";
import { PERMISSIONS } from "@/constants/permissions";
import { INBOUND_TYPES } from "@/constants/status";
import { useBreadcrumbLabel } from "@/hooks/useBreadcrumbLabel";
import { useToast } from "@/hooks/useToast";
import { formatCurrency, formatDateTime, formatNumber } from "@/lib/utils/format";
import {
  useDeleteProductMutation,
  useGetProductMovementsQuery,
  useGetProductQuery,
  useGetProductStockQuery,
  useUpdateProductStatusMutation,
} from "@/services/api/endpoints/productsApi";
import type { Product, StockLevel, StockMovement } from "@/types/models";

function ProductDetail({ product }: { product: Product }) {
  const router = useRouter();
  const toast = useToast();
  const stock = useGetProductStockQuery(product.id);
  const movements = useGetProductMovementsQuery({ id: product.id, limit: 15 });
  const [updateStatus, { isLoading: updating }] = useUpdateProductStatusMutation();
  const [deleteProduct, { isLoading: deleting }] = useDeleteProductMutation();
  const [confirmDelete, setConfirmDelete] = useState(false);
  const discontinued = product.status === "discontinued";

  const toggleStatus = async () => {
    try {
      await updateStatus({ id: product.id, status: discontinued ? "active" : "discontinued" }).unwrap();
      toast.success(discontinued ? "Product reactivated" : "Product discontinued", product.name);
    } catch (error) {
      toast.error("Could not change status", error);
    }
  };

  const onDelete = async () => {
    try {
      await deleteProduct(product.id).unwrap();
      toast.success("Product deleted", product.name);
      router.replace("/products");
    } catch (error) {
      toast.error("Could not delete product", error);
      setConfirmDelete(false);
    }
  };

  const stockColumns: Column<StockLevel>[] = [
    { key: "warehouseName", header: "Warehouse", cell: (row) => <Link href={`/warehouses/${row.warehouseId}`} className="font-medium text-brand-700 hover:underline">{row.warehouseName}</Link> },
    { key: "quantity", header: "On hand", align: "right", cell: (row) => `${formatNumber(row.quantity)} ${row.unit}` },
    { key: "value", header: "Value", align: "right", cell: (row) => formatCurrency(row.value ?? 0) },
    { key: "status", header: "Status", cell: (row) => <StatusBadge status={row.stockStatus} /> },
  ];

  const movementColumns: Column<StockMovement>[] = [
    { key: "createdAt", header: "Date", cell: (row) => formatDateTime(row.createdAt) },
    { key: "type", header: "Type", cell: (row) => <StatusBadge status={row.type} /> },
    { key: "reference", header: "Reference", cell: (row) => <span className="font-mono text-xs">{row.reference}</span> },
    { key: "warehouseName", header: "Warehouse", hideOnMobile: true, cell: (row) => row.warehouseName },
    {
      key: "quantity",
      header: "Qty",
      align: "right",
      cell: (row) => {
        const inbound = (INBOUND_TYPES as readonly string[]).includes(row.type);
        return <span className={inbound ? "font-semibold text-emerald-700" : "font-semibold text-red-600"}>{inbound ? "+" : "−"}{row.quantity}</span>;
      },
    },
    { key: "balanceAfter", header: "Balance", align: "right", cell: (row) => row.balanceAfter },
  ];

  return (
    <>
      <ProfileHeader
        name={product.name}
        icon={<span className="flex h-16 w-16 items-center justify-center rounded-full bg-brand-50 text-brand-900"><Package className="h-7 w-7" /></span>}
        subtitle={`${product.sku} · ${product.categoryName}`}
        badges={
          <>
            <StatusBadge status={product.stockStatus} />
            {discontinued && <StatusBadge status="discontinued" />}
          </>
        }
        meta={[
          { label: "Total on hand", value: `${formatNumber(product.totalStock ?? 0)} ${product.unit}` },
          { label: "Stock value", value: formatCurrency(product.stockValue ?? 0) },
          { label: "Unit cost", value: formatCurrency(product.unitCost) },
          { label: "Reorder level", value: `${product.reorderLevel} ${product.unit}` },
        ]}
        actions={
          <>
            <Can permission={PERMISSIONS.inventoryAdjust}>
              <ButtonLink href={`/inventory/adjust?productId=${product.id}`} variant="outline" leftIcon={<SlidersHorizontal className="h-4 w-4" />}>
                Adjust
              </ButtonLink>
              <ButtonLink href={`/inventory/transfer?productId=${product.id}`} variant="outline" leftIcon={<ArrowLeftRight className="h-4 w-4" />}>
                Transfer
              </ButtonLink>
            </Can>
            <Can permission={PERMISSIONS.productsManage}>
              <Button variant="outline" onClick={toggleStatus} loading={updating} leftIcon={discontinued ? <ArchiveRestore className="h-4 w-4" /> : <Archive className="h-4 w-4" />}>
                {discontinued ? "Reactivate" : "Discontinue"}
              </Button>
              <ButtonLink href={`/products/${product.id}/edit`} variant="secondary" leftIcon={<Pencil className="h-4 w-4" />}>
                Edit
              </ButtonLink>
              <Button variant="ghost" className="text-red-600 hover:bg-red-50" onClick={() => setConfirmDelete(true)} aria-label="Delete product">
                <Trash2 className="h-4 w-4" />
              </Button>
            </Can>
          </>
        }
      />
      <div className="grid gap-6 xl:grid-cols-3">
        <Card>
          <CardHeader title="Product information" />
          <CardContent>
            <DetailList
              columns={2}
              items={[
                { label: "SKU", value: <span className="font-mono">{product.sku}</span> },
                { label: "Barcode", value: product.barcode },
                { label: "Category", value: product.categoryName },
                { label: "Unit", value: product.unit },
                { label: "Reorder quantity", value: `${product.reorderQuantity} ${product.unit}` },
                {
                  label: "Preferred supplier",
                  value: product.preferredSupplierId ? (
                    <Link className="text-brand-700 hover:underline" href={`/suppliers/${product.preferredSupplierId}`}>{product.supplierName}</Link>
                  ) : (
                    "—"
                  ),
                },
                { label: "Description", value: product.description, wide: true },
              ]}
            />
          </CardContent>
        </Card>
        <Card className="xl:col-span-2">
          <CardHeader title="Stock by warehouse" />
          <DataTable
            caption="Stock by warehouse"
            columns={stockColumns}
            rows={stock.data}
            rowKey={(row) => row.id}
            loading={stock.isLoading}
            error={stock.error}
            onRetry={stock.refetch}
            empty={<EmptyState title="No stock yet" description="Receive a purchase order or adjust stock to add quantities." />}
          />
        </Card>
        <Card className="xl:col-span-3">
          <CardHeader
            title="Recent stock movements"
            actions={<ButtonLink href={`/inventory/movements?productId=${product.id}`} variant="ghost" size="sm">View all</ButtonLink>}
          />
          <DataTable
            caption="Recent stock movements"
            columns={movementColumns}
            rows={movements.data}
            rowKey={(row) => row.id}
            loading={movements.isLoading}
            error={movements.error}
            onRetry={movements.refetch}
            mobileTitleKey="reference"
            empty={<EmptyState title="No movements yet" />}
          />
        </Card>
      </div>
      <ConfirmDialog
        open={confirmDelete}
        title="Delete product?"
        description={`Delete ${product.name}? Products with stock history cannot be deleted; discontinue them instead.`}
        confirmLabel="Delete product"
        loading={deleting}
        onConfirm={onDelete}
        onClose={() => setConfirmDelete(false)}
      />
    </>
  );
}

export function ProductDetailView({ id }: { id: string }) {
  const query = useGetProductQuery(id);
  useBreadcrumbLabel(id, query.data?.name);
  return <QueryBoundary {...query}>{(product) => <ProductDetail product={product} />}</QueryBoundary>;
}
