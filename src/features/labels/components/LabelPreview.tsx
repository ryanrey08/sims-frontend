"use client";

import { Barcode, QrImage } from "@/components/labels/Codes";
import { cn } from "@/lib/utils/cn";
import type { Product } from "@/types/models";

export interface LabelOptions {
  includeLogo: boolean;
  includeDetails: boolean;
  includeBarcode: boolean;
  includeQr: boolean;
}

/** One printed label as drawn in the mockup preview: logo, item code, name, barcode and QR code. */
export function LabelPreview({ product, options, codes, className }: { product: Pick<Product, "sku" | "name" | "unit" | "categoryName" | "totalStock">; options: LabelOptions; codes?: { barcode?: string; qr?: string }; className?: string }) {
  return (
    <div className={cn("break-inside-avoid rounded-lg border border-slate-300 bg-white p-3 text-ink", className)}>
      {options.includeLogo && (
        <div className="mb-2 flex items-center gap-2 border-b border-slate-200 pb-2">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/logo/logo.svg" alt="" className="h-6 w-6" />
          <div className="leading-tight">
            <p className="text-[11px] font-bold">SIMS</p>
            <p className="text-[9px] text-slate-600">Supply &amp; Inventory Management System</p>
          </div>
        </div>
      )}
      <div className="flex items-start gap-3">
        <div className="min-w-0 flex-1">
          <p className="text-sm font-bold">{product.sku}</p>
          {options.includeDetails && (
            <>
              <p className="line-clamp-2 text-[11px] font-medium">{product.name}</p>
              <p className="text-[10px] text-slate-600">{product.categoryName} · {product.unit}</p>
            </>
          )}
          {options.includeBarcode && (
            <div className="mt-1.5">
              <Barcode value={codes?.barcode ?? product.sku} className="h-10 w-full" />
              <p className="text-center font-mono text-[10px] tracking-widest">{codes?.barcode ?? product.sku}</p>
            </div>
          )}
        </div>
        {options.includeQr && <QrImage value={codes?.qr ?? product.sku} size={72} />}
      </div>
    </div>
  );
}
