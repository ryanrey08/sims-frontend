"use client";

import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Boxes, Coins, FileText, ImageIcon, Info, Layers, Package, Plus, RefreshCw, Save, Trash2, Upload, X } from "lucide-react";
import { PageHeader } from "@/components/common/PageHeader";
import { FormErrorBanner } from "@/components/forms/FormErrorBanner";
import { FormBlock, HField } from "@/components/forms/HField";
import { fieldA11y } from "@/components/forms/FormField";
import { Button } from "@/components/ui/Button";
import { Input, Textarea } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { ITEM_TYPE_OPTIONS, PRODUCT_STATUS_OPTIONS, UNIT_OPTIONS, VALUATION_METHOD_OPTIONS } from "@/constants/options";
import { useToast } from "@/hooks/useToast";
import { cn } from "@/lib/utils/cn";
import { applyServerErrors, nonFieldError } from "@/lib/utils/errors";
import { formatCurrency } from "@/lib/utils/format";
import { useGetCategoriesQuery } from "@/services/api/endpoints/categoriesApi";
import { useCreateProductMutation, useGetProductsQuery, useUpdateProductMutation } from "@/services/api/endpoints/productsApi";
import { useGetWarehousesQuery } from "@/services/api/endpoints/warehousesApi";
import type { Product } from "@/types/models";
import { productSchema, type ProductFormValues } from "../schemas/productSchema";

const DRAFT_KEY = "sims.itemMaster.draft";
const MAX_IMAGE_BYTES = 5 * 1024 * 1024;

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
  itemType: "Consumable",
  shortDescription: "",
  subcategory: "",
  itemGroup: "",
  brand: "",
  model: "",
  accountCode: "",
  minStock: 0,
  maxStock: 0,
  defaultWarehouseId: "",
  unitPrice: 0,
  valuationMethod: "Moving Average",
  specifications: "",
  remarks: "",
  imageUrl: "",
};

function toValues(product?: Product): ProductFormValues {
  if (!product) return EMPTY;
  return {
    ...EMPTY,
    ...Object.fromEntries(Object.entries(product).filter(([, value]) => value !== null && value !== undefined)),
    description: product.description ?? "",
    preferredSupplierId: product.preferredSupplierId ?? "",
    defaultWarehouseId: product.defaultWarehouseId ?? "",
    barcode: product.barcode ?? "",
  } as ProductFormValues;
}

/** Resize an uploaded photo to a small thumbnail so the mock API can keep it. */
function readThumbnail(file: File) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error("Could not read the image."));
    reader.onload = () => {
      const image = new Image();
      image.onerror = () => reject(new Error("The file is not a valid image."));
      image.onload = () => {
        const scale = Math.min(1, 320 / Math.max(image.width, image.height));
        const canvas = document.createElement("canvas");
        canvas.width = Math.round(image.width * scale);
        canvas.height = Math.round(image.height * scale);
        canvas.getContext("2d")?.drawImage(image, 0, 0, canvas.width, canvas.height);
        resolve(canvas.toDataURL("image/jpeg", 0.8));
      };
      image.src = String(reader.result);
    };
    reader.readAsDataURL(file);
  });
}

/** "New Item" page from the mockup (p38): information, classification, image, reorder, costing and details. */
export function ProductForm({ product, copyFrom }: { product?: Product; copyFrom?: Product }) {
  const router = useRouter();
  const toast = useToast();
  const isEdit = Boolean(product);
  const imageInput = useRef<HTMLInputElement>(null);
  const [createProduct, createState] = useCreateProductMutation();
  const [updateProduct, updateState] = useUpdateProductMutation();
  const { data: categories } = useGetCategoriesQuery({ status: "active", pageSize: 100 });
  const { data: warehouses } = useGetWarehousesQuery({ status: "active", pageSize: 100 });
  const { data: allProducts } = useGetProductsQuery({ pageSize: 500, sortBy: "sku" }, { skip: isEdit });

  const nextCode = () => {
    const numbers = (allProducts?.data ?? []).map((item) => Number(item.sku.replace(/\D/g, "")) || 0);
    return `ITM-${String(Math.max(0, ...numbers) + 1).padStart(5, "0")}`;
  };

  const {
    register,
    handleSubmit,
    setError,
    setValue,
    reset,
    getValues,
    control,
    formState: { errors, isSubmitting },
  } = useForm<ProductFormValues>({
    resolver: zodResolver(productSchema),
    defaultValues: product ? toValues(product) : copyFrom ? { ...toValues(copyFrom), sku: "", name: `${copyFrom.name} (copy)`, barcode: "" } : EMPTY,
  });
  const imageUrl = useWatch({ control, name: "imageUrl" });
  const unitCost = useWatch({ control, name: "unitCost" });

  // New items get the next item code and any saved draft.
  useEffect(() => {
    if (isEdit || copyFrom) return;
    try {
      const draft = window.localStorage.getItem(DRAFT_KEY);
      if (draft) {
        reset({ ...EMPTY, ...JSON.parse(draft) });
        toast.info("Draft restored", "Your unsaved item was restored.");
      }
    } catch {
      // Ignore unreadable drafts.
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  useEffect(() => {
    if (!isEdit && allProducts && !getValues("sku")) setValue("sku", nextCode());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [allProducts, isEdit]);

  const save = (mode: "save" | "new") =>
    handleSubmit(async (values) => {
      const body = {
        ...values,
        description: values.description ?? "",
        preferredSupplierId: values.preferredSupplierId || null,
        defaultWarehouseId: values.defaultWarehouseId || null,
        barcode: values.barcode || undefined,
      };
      try {
        const saved = product ? await updateProduct({ id: product.id, body }).unwrap() : await createProduct(body).unwrap();
        window.localStorage.removeItem(DRAFT_KEY);
        toast.success(isEdit ? "Item updated" : "Item saved", `${saved.sku} – ${saved.name}`);
        if (mode === "new") {
          reset({ ...EMPTY, sku: "" });
          router.replace("/products/new");
        } else router.push(`/products/${saved.id}`);
      } catch (error) {
        // Field errors from the API appear inline; entered values are preserved.
        if (!applyServerErrors(error, setError)) toast.error("Could not save item", error);
      }
    });

  const saveDraft = () => {
    try {
      window.localStorage.setItem(DRAFT_KEY, JSON.stringify(getValues()));
      toast.success("Draft saved", "The item is saved on this device. Open New Item to continue.");
    } catch {
      toast.error("Could not save draft", "Browser storage is not available.");
    }
  };

  const err = (name: keyof ProductFormValues) => errors[name]?.message;
  const text = (name: keyof ProductFormValues) => ({ ...fieldA11y(name, err(name)), ...register(name) });
  const number = (name: "unitCost" | "reorderLevel" | "reorderQuantity" | "minStock" | "maxStock" | "unitPrice") => ({ ...fieldA11y(name, err(name)), ...register(name, { valueAsNumber: true }) });

  return (
    <>
      <PageHeader icon={Package} title={isEdit ? `Edit Item – ${product?.sku}` : "New Item"} description="Maintain the master list of inventory items, including item details, classification, unit of measure, and stock controls." />
      <form onSubmit={save("save")} noValidate className="space-y-4">
        <FormErrorBanner error={nonFieldError(isEdit ? updateState.error : createState.error)} />
        <div className="grid gap-4 xl:grid-cols-[1.15fr_1fr_0.7fr]">
          <FormBlock title="Item Information" icon={Info}>
            <div className="space-y-3">
              <HField label="Item Code" htmlFor="sku" required error={err("sku")} labelWidth="w-32">
                <div className="flex gap-2">
                  <Input className="uppercase" {...fieldA11y("sku", err("sku"))} {...register("sku", { setValueAs: (value: string) => value.toUpperCase() })} />
                  {!isEdit && (
                    <Button variant="outline" size="icon" onClick={() => setValue("sku", nextCode(), { shouldValidate: true })} aria-label="Generate the next item code" title="Generate code">
                      <RefreshCw className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              </HField>
              <HField label="Item Description" htmlFor="name" required error={err("name")} labelWidth="w-32">
                <Textarea rows={2} {...text("name")} />
              </HField>
              <HField label="Short Description" htmlFor="shortDescription" error={err("shortDescription")} labelWidth="w-32">
                <Input {...text("shortDescription")} />
              </HField>
              <HField label="Item Type" htmlFor="itemType" required error={err("itemType")} labelWidth="w-32">
                <Select options={ITEM_TYPE_OPTIONS} {...text("itemType")} />
              </HField>
              <HField label="UoM" htmlFor="unit" required error={err("unit")} labelWidth="w-32">
                <Select options={UNIT_OPTIONS} {...text("unit")} />
              </HField>
              <HField label="Status" htmlFor="status" required error={err("status")} labelWidth="w-32">
                <Select options={PRODUCT_STATUS_OPTIONS} className="font-semibold text-[#1a7f46]" {...text("status")} />
              </HField>
            </div>
          </FormBlock>
          <FormBlock title="Classification" icon={Layers}>
            <div className="space-y-3">
              <HField label="Category" htmlFor="categoryId" required error={err("categoryId")} labelWidth="w-32">
                <Select placeholder="Select category" options={(categories?.data ?? []).map((item) => ({ label: item.name, value: item.id }))} {...text("categoryId")} />
              </HField>
              <HField label="Subcategory" htmlFor="subcategory" error={err("subcategory")} labelWidth="w-32">
                <Input {...text("subcategory")} />
              </HField>
              <HField label="Item Group" htmlFor="itemGroup" error={err("itemGroup")} labelWidth="w-32">
                <Input {...text("itemGroup")} />
              </HField>
              <HField label="Brand" htmlFor="brand" error={err("brand")} labelWidth="w-32">
                <Input {...text("brand")} />
              </HField>
              <HField label="Model" htmlFor="model" error={err("model")} labelWidth="w-32">
                <Input {...text("model")} />
              </HField>
              <HField label="Account Code" htmlFor="accountCode" error={err("accountCode")} labelWidth="w-32">
                <Input inputMode="numeric" placeholder="e.g. 10404010" {...text("accountCode")} />
              </HField>
            </div>
          </FormBlock>
          <FormBlock title="Item Image" icon={ImageIcon}>
            <div className="flex aspect-[4/3] items-center justify-center overflow-hidden rounded-lg border border-line bg-slate-50">
              {imageUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={imageUrl} alt="Item" className="h-full w-full object-contain" />
              ) : (
                <ImageIcon className="h-12 w-12 text-slate-300" aria-hidden />
              )}
            </div>
            <div className="mt-3 flex gap-2">
              <Button size="sm" variant="outline" className="flex-1" onClick={() => imageInput.current?.click()} leftIcon={<Upload className="h-3.5 w-3.5" />}>Upload Image</Button>
              <Button size="sm" variant="outline" className="text-red-600" onClick={() => setValue("imageUrl", "", { shouldDirty: true })} disabled={!imageUrl} leftIcon={<Trash2 className="h-3.5 w-3.5" />}>Remove</Button>
            </div>
            <p className="mt-2 text-xs text-slate-500">Suggested formats: JPG, PNG (Max 5 MB)</p>
            <input
              ref={imageInput}
              type="file"
              accept="image/png,image/jpeg"
              className="sr-only"
              tabIndex={-1}
              onChange={async (event) => {
                const file = event.target.files?.[0];
                event.target.value = "";
                if (!file) return;
                if (file.size > MAX_IMAGE_BYTES) return toast.error("Image too large", "Choose an image up to 5 MB.");
                try {
                  setValue("imageUrl", await readThumbnail(file), { shouldDirty: true });
                } catch (imageError) {
                  toast.error("Could not use this image", imageError);
                }
              }}
            />
          </FormBlock>
        </div>

        <div className="grid gap-4 xl:grid-cols-2">
          <FormBlock title="Inventory & Reorder" icon={Boxes}>
            <div className="grid gap-x-6 gap-y-3 2xl:grid-cols-2">
              <HField label="Reorder Level" htmlFor="reorderLevel" required error={err("reorderLevel")} labelWidth="w-32">
                <Input type="number" min={0} {...number("reorderLevel")} />
              </HField>
              <HField label="Reorder Qty" htmlFor="reorderQuantity" required error={err("reorderQuantity")} labelWidth="w-32">
                <Input type="number" min={1} {...number("reorderQuantity")} />
              </HField>
              <HField label="Minimum Stock" htmlFor="minStock" error={err("minStock")} labelWidth="w-32">
                <Input type="number" min={0} {...number("minStock")} />
              </HField>
              <HField label="Maximum Stock" htmlFor="maxStock" error={err("maxStock")} labelWidth="w-32">
                <Input type="number" min={0} {...number("maxStock")} />
              </HField>
              <HField label="Default Warehouse" htmlFor="defaultWarehouseId" required error={err("defaultWarehouseId")} labelWidth="w-32" className="2xl:col-span-2">
                <Select placeholder="Select warehouse" options={(warehouses?.data ?? []).map((item) => ({ label: `${item.code} – ${item.name}`, value: item.id }))} {...text("defaultWarehouseId")} />
              </HField>
            </div>
          </FormBlock>
          <FormBlock title="Costing" icon={Coins}>
            <div className="grid gap-x-6 gap-y-3 2xl:grid-cols-2">
              <HField label="Unit Cost (₱)" htmlFor="unitCost" required error={err("unitCost")} labelWidth="w-32">
                <Input type="number" step="0.01" min={0} {...number("unitCost")} />
              </HField>
              <HField label="Latest Cost (Reference)" htmlFor="latestCost" labelWidth="w-32">
                <Input id="latestCost" readOnly className="bg-slate-100" value={formatCurrency(product?.unitCost ?? (Number(unitCost) || 0))} />
              </HField>
              <HField label="Unit Price (Optional)" htmlFor="unitPrice" error={err("unitPrice")} labelWidth="w-32">
                <Input type="number" step="0.01" min={0} {...number("unitPrice")} />
              </HField>
              <HField label="Valuation Method" htmlFor="valuationMethod" required error={err("valuationMethod")} labelWidth="w-32">
                <Select options={VALUATION_METHOD_OPTIONS} {...text("valuationMethod")} />
              </HField>
            </div>
          </FormBlock>
        </div>

        <FormBlock title="Additional Details" icon={FileText}>
          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <label htmlFor="specifications" className="text-[13px] font-semibold">Specifications</label>
              <Textarea rows={4} className="mt-1" placeholder={"• Processor: …\n• Memory: …"} {...text("specifications")} />
            </div>
            <div>
              <label htmlFor="remarks" className="text-[13px] font-semibold">Remarks</label>
              <Textarea rows={4} className="mt-1" {...text("remarks")} />
            </div>
          </div>
        </FormBlock>

        <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-line bg-white px-4 py-3">
          <p className="text-xs text-slate-500"><span className="text-red-600">*</span> Required field</p>
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" onClick={() => router.push("/products")} disabled={isSubmitting} leftIcon={<X className="h-4 w-4" />}>Cancel</Button>
            {!isEdit && <Button variant="outline" onClick={saveDraft} disabled={isSubmitting} leftIcon={<Save className="h-4 w-4" />}>Save as Draft</Button>}
            {!isEdit && <Button variant="outline" onClick={save("new")} disabled={isSubmitting} leftIcon={<Plus className="h-4 w-4" />}>Save &amp; New</Button>}
            <Button type="submit" loading={isSubmitting} className={cn(isEdit && "min-w-28")} leftIcon={<Save className="h-4 w-4" />}>Save</Button>
          </div>
        </div>
      </form>
    </>
  );
}
