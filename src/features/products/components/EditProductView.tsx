"use client";

import { QueryBoundary } from "@/components/common/QueryBoundary";
import { useBreadcrumbLabel } from "@/hooks/useBreadcrumbLabel";
import { useGetProductQuery } from "@/services/api/endpoints/productsApi";
import { ProductForm } from "./ProductForm";

export function EditProductView({ id }: { id: string }) {
  const query = useGetProductQuery(id);
  useBreadcrumbLabel(id, query.data?.name);
  return <QueryBoundary {...query}>{(product) => <ProductForm product={product} />}</QueryBoundary>;
}
