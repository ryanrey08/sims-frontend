"use client";

import { ShieldCheck as ShieldCheckIcon } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { Lock, Plus, ShieldCheck, Trash2, Users } from "lucide-react";
import { ConfirmDialog } from "@/components/common/ConfirmDialog";
import { PageHeader } from "@/components/common/PageHeader";
import { EmptyState, ErrorState } from "@/components/common/States";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { ButtonLink } from "@/components/ui/ButtonLink";
import { Card } from "@/components/ui/Card";
import { Skeleton } from "@/components/ui/Skeleton";
import { ALL_PERMISSIONS } from "@/constants/permissions";
import { useToast } from "@/hooks/useToast";
import { useDeleteRoleMutation, useGetRolesQuery } from "@/services/api/endpoints/rolesApi";
import type { Role } from "@/types/models";

export function RolesListView() {
  const toast = useToast();
  const { data, isLoading, error, refetch } = useGetRolesQuery();
  const [deleteRole, { isLoading: deleting }] = useDeleteRoleMutation();
  const [toDelete, setToDelete] = useState<Role | null>(null);

  return (
    <>
      <PageHeader
        icon={ShieldCheckIcon}
        title="Roles & permissions"
        description="Roles bundle permissions. Every user has exactly one role."
        actions={<ButtonLink href="/roles/new" leftIcon={<Plus className="h-4 w-4" />}>Add role</ButtonLink>}
      />
      {isLoading ? (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">{Array.from({ length: 3 }, (_, index) => <Skeleton key={index} className="h-40" />)}</div>
      ) : error ? (
        <Card><ErrorState error={error} onRetry={refetch} /></Card>
      ) : !data?.data.length ? (
        <Card><EmptyState title="No roles" /></Card>
      ) : (
        <ul className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {data.data.map((role) => (
            <li key={role.id}>
              <Card className="flex h-full flex-col p-5">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <span className="rounded-xl bg-brand-50 p-2.5 text-brand-900"><ShieldCheck className="h-5 w-5" /></span>
                    <div>
                      <p className="font-semibold">{role.name}</p>
                      {role.isSystem && <Badge tone="neutral" className="mt-1"><Lock className="h-3 w-3" /> System</Badge>}
                    </div>
                  </div>
                  {!role.isSystem && (
                    <Button variant="ghost" size="icon" className="text-red-600 hover:bg-red-50" onClick={() => setToDelete(role)} aria-label={`Delete ${role.name}`}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  )}
                </div>
                <p className="mt-3 flex-1 text-sm text-muted">{role.description || "No description."}</p>
                <div className="mt-4">
                  <div className="mb-1 flex justify-between text-xs text-muted">
                    <span>{role.permissions.length} of {ALL_PERMISSIONS.length} permissions</span>
                    <span className="flex items-center gap-1"><Users className="h-3.5 w-3.5" /> {role.userCount} users</span>
                  </div>
                  <div className="h-1.5 overflow-hidden rounded-full bg-slate-100" aria-hidden>
                    <div className="h-full rounded-full bg-brand-700" style={{ width: `${(role.permissions.length / ALL_PERMISSIONS.length) * 100}%` }} />
                  </div>
                </div>
                <Link href={`/roles/${role.id}`} className="mt-4 text-sm font-medium text-brand-700 hover:underline">Edit permissions →</Link>
              </Card>
            </li>
          ))}
        </ul>
      )}
      <ConfirmDialog
        open={Boolean(toDelete)}
        title="Delete role?"
        description={toDelete && `Delete the ${toDelete.name} role? Roles that still have users cannot be deleted.`}
        confirmLabel="Delete role"
        loading={deleting}
        onConfirm={async () => {
          if (!toDelete) return;
          try {
            await deleteRole(toDelete.id).unwrap();
            toast.success("Role deleted", toDelete.name);
          } catch (deleteError) {
            toast.error("Could not delete role", deleteError);
          }
          setToDelete(null);
        }}
        onClose={() => setToDelete(null)}
      />
    </>
  );
}
