"use client";

import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { PageHeader } from "@/components/common/PageHeader";
import { FormErrorBanner } from "@/components/forms/FormErrorBanner";
import { FormField, FormSection, RequiredNote, fieldA11y } from "@/components/forms/FormField";
import { Button } from "@/components/ui/Button";
import { Card, CardContent, CardFooter } from "@/components/ui/Card";
import { Input, Textarea } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { PRODUCT_STATUS_OPTIONS, UNIT_OPTIONS } from "@/constants/options";
import { useToast } from "@/hooks/useToast";
import { applyServerErrors, nonFieldError } from "@/lib/utils/errors";
import { useGetCategoriesQuery } from "@/services/api/endpoints/categoriesApi";
import { useCreateProductMutation, useUpdateProductMutation } from "@/services/api/endpoints/productsApi";
import { useGetSuppliersQuery } from "@/services/api/endpoints/suppliersApi";
import type { Product } from "@/types/models";
import { productSchema, type ProductFormValues } from "../schemas/productSchema";

const EMPTY: ProductFormValues = {
  sku: "",
  name: "",
  description: "",
  categoryId: "",
  unit: "pcs",
  unitCost: 0,
  reorderLevel: 10,
  reorderQuantity: 25,
  preferredSupplierId: "",
  barcode: "",
  status: "active",
};

export function ProductForm({ product }: { product?: Product }) {
  const router = useRouter();
  const toast = useToast();
  const isEdit = Boolean(product);
  const [createProduct, createState] = useCreateProductMutation();
  const [updateProduct, updateState] = useUpdateProductMutation();
  const { data: categories } = useGetCategoriesQuery({ status: "active", pageSize: 100 });
  const { data: suppliers } = useGetSuppliersQuery({ status: "active", pageSize: 100, sortBy: "name" });

  const {
    register,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting, isDirty },
  } = useForm<ProductFormValues>({
    resolver: zodResolver(productSchema),
    defaultValues: product
      ? { ...EMPTY, ...product, preferredSupplierId: product.preferredSupplierId ?? "", barcode: product.barcode ?? "" }
      : EMPTY,
  });

  const onSubmit = handleSubmit(async (values) => {
    const body = {
      ...values,
      description: values.description ?? "",
      preferredSupplierId: values.preferredSupplierId || null,
      barcode: values.barcode || undefined,
    };
    try {
      const saved = product ? await updateProduct({ id: product.id, body }).unwrap() : await createProduct(body).unwrap();
      toast.success(isEdit ? "Product updated" : "Product added", saved.name);
      router.push(`/products/${saved.id}`);
    } catch (error) {
      // Field errors from the API appear inline; entered values are preserved.
      if (!applyServerErrors(error, setError)) toast.error("Could not save product", error);
    }
  });

  const err = (name: keyof ProductFormValues) => errors[name]?.message;
  const text = (name: keyof ProductFormValues) => ({ ...fieldA11y(name, err(name)), ...register(name) });
  const number = (name: "unitCost" | "reorderLevel" | "reorderQuantity") => ({ ...fieldA11y(name, err(name)), ...register(name, { valueAsNumber: true }) });

  return (
    <>
      <PageHeader title={isEdit ? `Edit ${product?.name}` : "Add product"} description="Define the item, its unit of measure, cost and reorder rules." />
      <Card>
        <form onSubmit={onSubmit} noValidate>
          <CardContent>
            <FormErrorBanner error={nonFieldError(isEdit ? updateState.error : createState.error)} />
            <RequiredNote />
            <div className="mt-4">
              <FormSection title="Product details" description="How the item is identified and classified.">
                <FormField label="SKU" htmlFor="sku" required error={err("sku")} hint="e.g. OFF-0041">
                  <Input className="uppercase" {...fieldA11y("sku", err("sku"))} {...register("sku", { setValueAs: (value: string) => value.toUpperCase() })} />
                </FormField>
                <FormField label="Barcode" htmlFor="barcode" error={err("barcode")}>
                  <Input inputMode="numeric" {...text("barcode")} />
                </FormField>
                <FormField label="Product name" htmlFor="name" required error={err("name")} className="sm:col-span-2">
                  <Input {...text("name")} />
                </FormField>
                <FormField label="Category" htmlFor="categoryId" required error={err("categoryId")}>
                  <Select placeholder="Select a category" options={(categories?.data ?? []).map((item) => ({ label: item.name, value: item.id }))} {...text("categoryId")} />
                </FormField>
                <FormField label="Unit of measure" htmlFor="unit" required error={err("unit")}>
                  <Select options={UNIT_OPTIONS} {...text("unit")} />
                </FormField>
                <FormField label="Description" htmlFor="description" error={err("description")} className="sm:col-span-2">
                  <Textarea rows={2} {...text("description")} />
                </FormField>
              </FormSection>
              <FormSection title="Cost and replenishment" description="Used for valuation and low-stock alerts.">
                <FormField label="Unit cost (₱)" htmlFor="unitCost" required error={err("unitCost")}>
                  <Input type="number" step="0.01" min={0} {...number("unitCost")} />
                </FormField>
                <FormField label="Preferred supplier" htmlFor="preferredSupplierId" error={err("preferredSupplierId")}>
                  <Select placeholder="None" options={(suppliers?.data ?? []).map((item) => ({ label: item.name, value: item.id }))} {...text("preferredSupplierId")} />
                </FormField>
                <FormField label="Reorder level" htmlFor="reorderLevel" required error={err("reorderLevel")} hint="Alert when total stock falls to this quantity.">
                  <Input type="number" min={0} {...number("reorderLevel")} />
                </FormField>
                <FormField label="Reorder quantity" htmlFor="reorderQuantity" required error={err("reorderQuantity")} hint="Suggested quantity per purchase order.">
                  <Input type="number" min={1} {...number("reorderQuantity")} />
                </FormField>
                <FormField label="Status" htmlFor="status" required error={err("status")}>
                  <Select options={PRODUCT_STATUS_OPTIONS} {...text("status")} />
                </FormField>
              </FormSection>
            </div>
          </CardContent>
          <CardFooter>
            <Button variant="outline" onClick={() => router.back()} disabled={isSubmitting}>
              Cancel
            </Button>
            <Button type="submit" loading={isSubmitting} disabled={isEdit && !isDirty}>
              {isEdit ? "Save changes" : "Add product"}
            </Button>
          </CardFooter>
        </form>
      </Card>
    </>
  );
}
