"use client";

import { MoreHorizontal } from "lucide-react";
import { Dropdown, DropdownItem } from "@/components/ui/Dropdown";
import { cn } from "@/lib/utils/cn";

export interface RowAction {
  label: string;
  icon?: React.ComponentType<{ className?: string }>;
  onSelect: () => void;
  danger?: boolean;
  hidden?: boolean;
  /** Show as a small square icon button in the row (the mockup pattern) instead of inside the "…" menu. */
  inline?: boolean;
}

const iconButton = "inline-flex h-7 w-7 items-center justify-center rounded-md border border-line bg-white transition-colors hover:bg-slate-50";

/**
 * Row actions as drawn in the mockups: small square outline icon buttons
 * (view / edit / delete) followed by a "…" menu for the rest.
 * Clicks never trigger the row's own click handler.
 */
export function RowActions({ actions, label, maxInline = 2 }: { actions: RowAction[]; label: string; maxInline?: number }) {
  const visible = actions.filter((action) => !action.hidden);
  if (!visible.length) return null;
  const explicit = visible.some((action) => action.inline !== undefined);
  const inline = explicit ? visible.filter((action) => action.inline) : visible.filter((action) => action.icon).slice(0, maxInline);
  const rest = visible.filter((action) => !inline.includes(action));

  return (
    <div onClick={(event) => event.stopPropagation()} className="flex items-center justify-end gap-1.5">
      {inline.map((action) => {
        const Icon = action.icon ?? MoreHorizontal;
        return (
          <button
            key={action.label}
            type="button"
            onClick={action.onSelect}
            title={action.label}
            aria-label={`${action.label}: ${label}`}
            className={cn(iconButton, action.danger ? "text-red-600" : "text-slate-600")}
          >
            <Icon className="h-3.5 w-3.5" />
          </button>
        );
      })}
      {rest.length > 0 && (
        <Dropdown
          trigger={(props) => (
            <button type="button" {...props} aria-label={`More actions for ${label}`} className={cn(iconButton, "text-slate-600")}>
              <MoreHorizontal className="h-3.5 w-3.5" />
            </button>
          )}
        >
          {(close) =>
            rest.map((action) => (
              <DropdownItem
                key={action.label}
                danger={action.danger}
                onClick={() => {
                  close();
                  action.onSelect();
                }}
              >
                {action.icon && <action.icon className="h-4 w-4" />}
                {action.label}
              </DropdownItem>
            ))
          }
        </Dropdown>
      )}
    </div>
  );
}
