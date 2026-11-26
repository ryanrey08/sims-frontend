"use client";

import { Check } from "lucide-react";
import { Modal } from "@/components/ui/Modal";

/** "X Saved Successfully" dialog from the mockups: big green check, message, key details and actions. */
export function SuccessDialog({
  open,
  title,
  message,
  details,
  actions,
  onClose,
}: {
  open: boolean;
  title: string;
  message: React.ReactNode;
  details?: { label: string; value: React.ReactNode }[];
  actions: React.ReactNode;
  onClose: () => void;
}) {
  return (
    <Modal open={open} onClose={onClose} title={<span className="sr-only">{title}</span>} size="sm">
      <div className="flex flex-col items-center text-center">
        <span className="flex h-16 w-16 items-center justify-center rounded-full bg-[#1f9d55] text-white shadow-[0_0_0_8px_#e3f5e9]">
          <Check className="h-9 w-9" strokeWidth={3} />
        </span>
        <p className="mt-4 text-lg font-bold text-ink">{title}</p>
        <p className="mt-1 text-[13px] text-slate-600">{message}</p>
        {details && (
          <dl className="mt-4 w-full space-y-1.5 rounded-lg bg-slate-50 p-3 text-left text-[13px]">
            {details.map((item) => (
              <div key={item.label} className="flex gap-2">
                <dt className="w-28 shrink-0 text-slate-600">{item.label}</dt>
                <dd className="font-semibold">: {item.value}</dd>
              </div>
            ))}
          </dl>
        )}
        <div className="mt-5 flex flex-wrap justify-center gap-2">{actions}</div>
      </div>
    </Modal>
  );
}

/** Small round icon used before modal titles (green check for approvals, etc.). */
export function ModalIcon({ tone = "green", children }: { tone?: "green" | "red" | "blue"; children: React.ReactNode }) {
  const tones = { green: "bg-[#1f9d55]", red: "bg-brand-600", blue: "bg-[#2f6fd6]" };
  return <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-white ${tones[tone]}`}>{children}</span>;
}
