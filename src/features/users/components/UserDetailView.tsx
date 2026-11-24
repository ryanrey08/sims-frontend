"use client";

import Link from "next/link";
import { Pencil } from "lucide-react";
import { Can } from "@/components/common/Can";
import { DetailList } from "@/components/common/DetailList";
import { ProfileHeader } from "@/components/common/ProfileHeader";
import { QueryBoundary } from "@/components/common/QueryBoundary";
import { StatusBadge } from "@/components/common/StatusBadge";
import { Badge } from "@/components/ui/Badge";
import { ButtonLink } from "@/components/ui/ButtonLink";
import { Card, CardContent, CardHeader } from "@/components/ui/Card";
import { PERMISSION_LABELS, PERMISSIONS } from "@/constants/permissions";
import { useBreadcrumbLabel } from "@/hooks/useBreadcrumbLabel";
import { formatDateTime } from "@/lib/utils/format";
import { useGetRoleQuery } from "@/services/api/endpoints/rolesApi";
import { useGetUserQuery } from "@/services/api/endpoints/usersApi";
import type { User } from "@/types/models";

function UserDetail({ user }: { user: User }) {
  const { data: role } = useGetRoleQuery(user.roleId);
  return (
    <>
      <ProfileHeader
        name={user.name}
        subtitle={user.email}
        badges={<StatusBadge status={user.status} />}
        meta={[
          { label: "Role", value: user.roleName },
          { label: "Department", value: user.department },
          { label: "Last sign-in", value: user.lastLoginAt ? formatDateTime(user.lastLoginAt) : "Never" },
          { label: "Created", value: formatDateTime(user.createdAt) },
        ]}
        actions={
          <Can permission={PERMISSIONS.usersManage}>
            <ButtonLink href={`/users/${user.id}/edit`} variant="secondary" leftIcon={<Pencil className="h-4 w-4" />}>Edit</ButtonLink>
          </Can>
        }
      />
      <Card>
        <CardHeader
          title="Effective permissions"
          description={role ? `Granted by the ${role.name} role.` : undefined}
          actions={
            <Can permission={PERMISSIONS.rolesManage}>
              <Link href={`/roles/${user.roleId}`} className="text-sm font-medium text-brand-700 hover:underline">Manage role</Link>
            </Can>
          }
        />
        <CardContent>
          {role ? (
            <div className="flex flex-wrap gap-2">
              {role.permissions.map((permission) => (
                <Badge key={permission} tone="brand">{PERMISSION_LABELS[permission]}</Badge>
              ))}
            </div>
          ) : (
            <DetailList items={[{ label: "Role", value: user.roleName }]} />
          )}
        </CardContent>
      </Card>
    </>
  );
}

export function UserDetailView({ id }: { id: string }) {
  const query = useGetUserQuery(id);
  useBreadcrumbLabel(id, query.data?.name);
  return <QueryBoundary {...query}>{(user) => <UserDetail user={user} />}</QueryBoundary>;
}
