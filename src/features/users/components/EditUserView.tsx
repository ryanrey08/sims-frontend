"use client";

import { QueryBoundary } from "@/components/common/QueryBoundary";
import { useBreadcrumbLabel } from "@/hooks/useBreadcrumbLabel";
import { useGetUserQuery } from "@/services/api/endpoints/usersApi";
import { UserForm } from "./UserForm";

export function EditUserView({ id }: { id: string }) {
  const query = useGetUserQuery(id);
  useBreadcrumbLabel(id, query.data?.name);
  return <QueryBoundary {...query}>{(user) => <UserForm user={user} />}</QueryBoundary>;
}
