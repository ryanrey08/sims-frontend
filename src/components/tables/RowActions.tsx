"use client";

import { MoreHorizontal } from "lucide-react";
import { Dropdown, DropdownItem } from "@/components/ui/Dropdown";

export interface RowAction {
  label: string;
  icon?: React.ComponentType<{ className?: string }>;
  onSelect: () => void;
  danger?: boolean;
  hidden?: boolean;
}

/** "More" menu for a table row. Clicks don't trigger the row's own click handler. */
export function RowActions({ actions, label }: { actions: RowAction[]; label: string }) {
  const visible = actions.filter((action) => !action.hidden);
  if (!visible.length) return null;
  return (
    <div onClick={(event) => event.stopPropagation()} className="flex justify-end">
      <Dropdown
        trigger={(props) => (
          <button
            type="button"
            {...props}
            aria-label={`Actions for ${label}`}
            className="rounded-md p-1.5 text-slate-500 hover:bg-slate-100 hover:text-ink"
          >
            <MoreHorizontal className="h-4 w-4" />
          </button>
        )}
      >
        {(close) =>
          visible.map((action) => (
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
    </div>
  );
}
