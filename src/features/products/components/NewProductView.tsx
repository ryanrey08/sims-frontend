"use client";

import { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { QueryBoundary } from "@/components/common/QueryBoundary";
import { useGetProductQuery } from "@/services/api/endpoints/productsApi";
import { ProductForm } from "./ProductForm";

/** New item page; `?copy=<id>` starts from an existing item (Duplicate action). */
function NewProduct() {
  const copyId = useSearchParams().get("copy");
  const query = useGetProductQuery(copyId ?? "", { skip: !copyId });
  if (!copyId) return <ProductForm />;
  return <QueryBoundary {...query}>{(product) => <ProductForm key={product.id} copyFrom={product} />}</QueryBoundary>;
}

export function NewProductView() {
  return (
    <Suspense>
      <NewProduct />
    </Suspense>
  );
}
