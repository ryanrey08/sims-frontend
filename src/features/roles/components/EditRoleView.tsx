"use client";

import { QueryBoundary } from "@/components/common/QueryBoundary";
import { useBreadcrumbLabel } from "@/hooks/useBreadcrumbLabel";
import { useGetRoleQuery } from "@/services/api/endpoints/rolesApi";
import { RoleForm } from "./RoleForm";

export function EditRoleView({ id }: { id: string }) {
  const query = useGetRoleQuery(id);
  useBreadcrumbLabel(id, query.data?.name);
  return <QueryBoundary {...query}>{(role) => <RoleForm role={role} />}</QueryBoundary>;
}
