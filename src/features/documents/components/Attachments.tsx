"use client";

import { useRef } from "react";
import { Download, FileSpreadsheet, FileText, Image as ImageIcon, Trash2, UploadCloud } from "lucide-react";
import { useToast } from "@/hooks/useToast";
import type { DocumentAttachment } from "@/types/records";

const MAX_BYTES = 10 * 1024 * 1024;
const ACCEPT = ".pdf,.jpg,.jpeg,.png,.xls,.xlsx,.csv";

export function formatBytes(size: number) {
  if (size >= 1024 * 1024) return `${(size / 1024 / 1024).toFixed(1)} MB`;
  return `${Math.max(1, Math.round(size / 1024))} KB`;
}

function FileIcon({ name }: { name: string }) {
  if (/\.(xlsx?|csv)$/i.test(name)) return <FileSpreadsheet className="h-5 w-5 text-[#1f9d55]" />;
  if (/\.(png|jpe?g)$/i.test(name)) return <ImageIcon className="h-5 w-5 text-[#2f6fd6]" />;
  return <FileText className="h-5 w-5 text-brand-600" />;
}

/** Attachment list with the mockup's dashed drop zone. Only file metadata is kept by the mock API. */
export function Attachments({ value, onChange, readOnly }: { value: DocumentAttachment[]; onChange?: (files: DocumentAttachment[]) => void; readOnly?: boolean }) {
  const input = useRef<HTMLInputElement>(null);
  const toast = useToast();

  const add = (files: FileList | null) => {
    if (!files || !onChange) return;
    const accepted: DocumentAttachment[] = [];
    Array.from(files).forEach((file) => {
      if (file.size > MAX_BYTES) toast.error("File too large", `${file.name} is over 10 MB.`);
      else accepted.push({ name: file.name, size: file.size, type: file.type });
    });
    onChange([...value, ...accepted]);
  };

  return (
    <div className="space-y-2">
      {value.map((file, index) => (
        <div key={`${file.name}-${index}`} className="flex items-center gap-3 rounded-lg border border-line bg-white px-3 py-2 text-[13px]">
          <FileIcon name={file.name} />
          <span className="min-w-0 flex-1 truncate font-medium">{file.name}</span>
          <span className="text-xs text-slate-500">{formatBytes(file.size)}</span>
          <button type="button" className="rounded p-1 text-slate-500 hover:bg-slate-100" aria-label={`Download ${file.name}`} title="Download" onClick={() => toast.info("Download", `${file.name}: files are served by the document API (the mock API keeps file names only).`)}>
            <Download className="h-4 w-4" />
          </button>
          {!readOnly && onChange && (
            <button type="button" className="rounded p-1 text-red-600 hover:bg-red-50" aria-label={`Remove ${file.name}`} onClick={() => onChange(value.filter((_, position) => position !== index))}>
              <Trash2 className="h-4 w-4" />
            </button>
          )}
        </div>
      ))}
      {!readOnly && onChange && (
        <button
          type="button"
          onClick={() => input.current?.click()}
          onDragOver={(event) => event.preventDefault()}
          onDrop={(event) => {
            event.preventDefault();
            add(event.dataTransfer.files);
          }}
          className="flex w-full flex-col items-center justify-center gap-1 rounded-lg border-2 border-dashed border-slate-300 bg-slate-50 px-4 py-5 text-[13px] text-slate-600 hover:border-brand-400 hover:bg-brand-50/40"
        >
          <UploadCloud className="h-6 w-6 text-brand-600" />
          <span className="font-semibold text-ink">Click to upload or drag and drop files here</span>
          <span className="text-xs">(Excel, PDF, JPG, PNG – Max 10 MB)</span>
        </button>
      )}
      {readOnly && !value.length && <p className="text-[13px] text-slate-500">No attachments.</p>}
      <input ref={input} type="file" multiple accept={ACCEPT} className="sr-only" tabIndex={-1} onChange={(event) => { add(event.target.files); event.target.value = ""; }} />
    </div>
  );
}
