import { ALL_PERMISSIONS, PERMISSION_LABELS, PERMISSIONS } from "@/constants/permissions";
import type { PermissionDefinition, Role, SystemSettings, User } from "@/types/models";
import { getDb, newId, nowISO, persistDb, resetDb } from "../database/db";
import { DEMO_PASSWORD } from "../database/seed";
import { logActivityEntry } from "./activity";
import { enrichRole, enrichUser } from "./relations";
import {
  applyFilters,
  assertUnique,
  bodyOf,
  conflict,
  listResponse,
  matchesSearch,
  MockHttpError,
  notFound,
  requireFields,
  requirePermission,
  validationFailed,
  type MockRoute,
} from "./utils";

function findUser(id: string) {
  return getDb().users.find((item) => item.id === id) ?? notFound("User");
}
function findRole(id: string) {
  return getDb().roles.find((item) => item.id === id) ?? notFound("Role");
}

export const PERMISSION_DEFINITIONS: PermissionDefinition[] = ALL_PERMISSIONS.map((key) => ({
  key,
  module: key.split(".")[0].replace(/^\w/, (char) => char.toUpperCase()),
  label: PERMISSION_LABELS[key],
}));

export const adminRoutes: MockRoute[] = [
  // Users ------------------------------------------------------------------
  {
    method: "GET",
    pattern: "/users",
    handler: ({ query }) => {
      const items = applyFilters(getDb().users, query, ["status", "roleId", "department"])
        .map(enrichUser)
        .filter((user) => matchesSearch(query.search, [user.name, user.email, user.roleName]));
      return listResponse(items, { sortBy: "name", ...query });
    },
  },
  { method: "GET", pattern: "/users/:id", handler: ({ params }) => enrichUser(findUser(params.id)) },
  {
    method: "POST",
    pattern: "/users",
    handler: (request) => {
      requirePermission(request, PERMISSIONS.usersManage);
      const body = bodyOf<Partial<User> & { password?: string }>(request);
      requireFields(body as Record<string, unknown>, ["name", "email", "roleId", "department"]);
      const db = getDb();
      assertUnique(db.users, "email", body.email, undefined, "This email is already used by another account.");
      if (!db.roles.some((role) => role.id === body.roleId)) validationFailed({ roleId: ["Select a valid role."] });
      const timestamp = nowISO();
      const user: User = {
        id: newId("user"),
        name: body.name!,
        email: body.email!,
        roleId: body.roleId!,
        department: body.department!,
        status: body.status ?? "active",
        lastLoginAt: null,
        createdAt: timestamp,
        updatedAt: timestamp,
      };
      db.users.unshift(user);
      db.credentials[user.email] = body.password || DEMO_PASSWORD;
      logActivityEntry(request, "created user account for", user.name, "Users");
      persistDb();
      return enrichUser(user);
    },
  },
  {
    method: "PUT",
    pattern: "/users/:id",
    handler: (request) => {
      requirePermission(request, PERMISSIONS.usersManage);
      const db = getDb();
      const user = findUser(request.params.id);
      const body = bodyOf<Partial<User>>(request);
      requireFields({ ...user, ...body } as unknown as Record<string, unknown>, ["name", "email", "roleId"]);
      assertUnique(db.users, "email", body.email ?? user.email, user.id, "This email is already used by another account.");
      if (body.email && body.email !== user.email) {
        db.credentials[body.email] = db.credentials[user.email];
        delete db.credentials[user.email];
      }
      Object.assign(user, body, { id: user.id, updatedAt: nowISO() });
      logActivityEntry(request, "updated user account for", user.name, "Users");
      persistDb();
      return enrichUser(user);
    },
  },
  {
    method: "PATCH",
    pattern: "/users/:id/status",
    handler: (request) => {
      requirePermission(request, PERMISSIONS.usersManage);
      const user = findUser(request.params.id);
      if (user.id === request.userId) conflict("You cannot deactivate your own account.");
      user.status = bodyOf<{ status: User["status"] }>(request).status;
      user.updatedAt = nowISO();
      logActivityEntry(request, `set account ${user.status} for`, user.name, "Users");
      persistDb();
      return enrichUser(user);
    },
  },
  {
    method: "DELETE",
    pattern: "/users/:id",
    handler: (request) => {
      requirePermission(request, PERMISSIONS.usersManage);
      const db = getDb();
      const user = findUser(request.params.id);
      if (user.id === request.userId) conflict("You cannot delete your own account.");
      db.users = db.users.filter((item) => item.id !== user.id);
      delete db.credentials[user.email];
      logActivityEntry(request, "deleted user account for", user.name, "Users");
      persistDb();
      return { message: "User deleted." };
    },
  },

  // Roles and permissions ------------------------------------------------------
  { method: "GET", pattern: "/permissions", handler: () => PERMISSION_DEFINITIONS },
  {
    method: "GET",
    pattern: "/roles",
    handler: ({ query }) => {
      const items = getDb()
        .roles.map(enrichRole)
        .filter((role) => matchesSearch(query.search, [role.name, role.description]));
      return listResponse(items, { sortBy: "name", pageSize: "100", ...query });
    },
  },
  { method: "GET", pattern: "/roles/:id", handler: ({ params }) => enrichRole(findRole(params.id)) },
  {
    method: "POST",
    pattern: "/roles",
    handler: (request) => {
      requirePermission(request, PERMISSIONS.rolesManage);
      const body = bodyOf<Partial<Role>>(request);
      requireFields(body as Record<string, unknown>, ["name"]);
      assertUnique(getDb().roles, "name", body.name, undefined, "A role with this name already exists.");
      const timestamp = nowISO();
      const role: Role = {
        id: newId("role"),
        name: body.name!,
        description: body.description ?? "",
        permissions: (body.permissions ?? []).filter((key) => ALL_PERMISSIONS.includes(key)),
        isSystem: false,
        createdAt: timestamp,
        updatedAt: timestamp,
      };
      getDb().roles.push(role);
      logActivityEntry(request, "created role", role.name, "Roles");
      persistDb();
      return enrichRole(role);
    },
  },
  {
    method: "PUT",
    pattern: "/roles/:id",
    handler: (request) => {
      requirePermission(request, PERMISSIONS.rolesManage);
      const role = findRole(request.params.id);
      const body = bodyOf<Partial<Role>>(request);
      if (body.name) assertUnique(getDb().roles, "name", body.name, role.id, "A role with this name already exists.");
      if (role.name === "Administrator" && body.permissions && body.permissions.length !== ALL_PERMISSIONS.length) {
        throw new MockHttpError(409, "The Administrator role must keep every permission.");
      }
      Object.assign(role, {
        name: role.isSystem ? role.name : (body.name ?? role.name),
        description: body.description ?? role.description,
        permissions: (body.permissions ?? role.permissions).filter((key) => ALL_PERMISSIONS.includes(key)),
        updatedAt: nowISO(),
      });
      logActivityEntry(request, "updated role permissions for", role.name, "Roles");
      persistDb();
      return enrichRole(role);
    },
  },
  {
    method: "DELETE",
    pattern: "/roles/:id",
    handler: (request) => {
      requirePermission(request, PERMISSIONS.rolesManage);
      const db = getDb();
      const role = findRole(request.params.id);
      if (role.isSystem) conflict("System roles cannot be deleted.");
      if (db.users.some((user) => user.roleId === role.id)) conflict("Reassign the users in this role before deleting it.");
      db.roles = db.roles.filter((item) => item.id !== role.id);
      logActivityEntry(request, "deleted role", role.name, "Roles");
      persistDb();
      return { message: "Role deleted." };
    },
  },

  // Settings --------------------------------------------------------------------
  { method: "GET", pattern: "/settings", handler: () => getDb().settings },
  {
    method: "PUT",
    pattern: "/settings",
    handler: (request) => {
      requirePermission(request, PERMISSIONS.settingsManage);
      const body = bodyOf<Partial<SystemSettings>>(request);
      requireFields(body as Record<string, unknown>, ["organizationName", "currency", "poPrefix", "requisitionPrefix", "defaultWarehouseId"]);
      const db = getDb();
      db.settings = { ...db.settings, ...body, updatedAt: nowISO() };
      logActivityEntry(request, "updated", "system settings", "Settings");
      persistDb();
      return db.settings;
    },
  },
  {
    method: "POST",
    pattern: "/settings/reset-demo-data",
    handler: (request) => {
      requirePermission(request, PERMISSIONS.settingsManage);
      resetDb();
      return { message: "Demo data restored." };
    },
  },

  // Notifications ----------------------------------------------------------------
  {
    method: "GET",
    pattern: "/notifications",
    handler: () => [...getDb().notifications].sort((a, b) => b.createdAt.localeCompare(a.createdAt)),
  },
  {
    method: "PATCH",
    pattern: "/notifications/:id/read",
    handler: ({ params }) => {
      const notification = getDb().notifications.find((item) => item.id === params.id) ?? notFound("Notification");
      notification.read = true;
      persistDb();
      return notification;
    },
  },
  {
    method: "POST",
    pattern: "/notifications/read-all",
    handler: () => {
      getDb().notifications.forEach((item) => {
        item.read = true;
      });
      persistDb();
      return { message: "All notifications marked as read." };
    },
  },
];
