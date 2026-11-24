import type { AuthUser } from "@/types/models";
import { getDb, newId, nowISO, persistDb } from "../database/db";
import { bodyOf, MockHttpError, requireFields, validationFailed, type MockRequest, type MockRoute } from "./utils";

function toAuthUser(userId: string): AuthUser {
  const db = getDb();
  const user = db.users.find((item) => item.id === userId);
  if (!user) throw new MockHttpError(401, "Your session has expired. Please sign in again.");
  const role = db.roles.find((item) => item.id === user.roleId);
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    roleId: user.roleId,
    roleName: role?.name ?? "—",
    department: user.department,
    permissions: role?.permissions ?? [],
  };
}

function currentUserId(request: MockRequest) {
  if (!request.userId) throw new MockHttpError(401, "Your session has expired. Please sign in again.");
  return request.userId;
}

export const authRoutes: MockRoute[] = [
  {
    method: "POST",
    pattern: "/auth/login",
    public: true,
    handler: (request) => {
      const body = bodyOf<{ email: string; password: string }>(request);
      requireFields(body, ["email", "password"]);
      const db = getDb();
      const email = body.email.trim().toLowerCase();
      const user = db.users.find((item) => item.email.toLowerCase() === email);
      if (!user || db.credentials[user.email] !== body.password) {
        throw new MockHttpError(401, "Invalid email or password.");
      }
      if (user.status !== "active") throw new MockHttpError(403, "This account has been deactivated.");
      const token = `mock.${newId("token")}`;
      db.sessions[token] = user.id;
      user.lastLoginAt = nowISO();
      persistDb();
      return { token, user: toAuthUser(user.id) };
    },
  },
  {
    method: "POST",
    pattern: "/auth/logout",
    public: true,
    handler: () => ({ message: "Signed out." }),
  },
  { method: "GET", pattern: "/auth/me", handler: (request) => toAuthUser(currentUserId(request)) },
  {
    method: "PUT",
    pattern: "/auth/profile",
    handler: (request) => {
      const body = bodyOf<{ name: string; email: string }>(request);
      requireFields(body, ["name", "email"]);
      const db = getDb();
      const userId = currentUserId(request);
      const clash = db.users.some((item) => item.id !== userId && item.email.toLowerCase() === body.email.toLowerCase());
      if (clash) validationFailed({ email: ["This email is already used by another account."] });
      const user = db.users.find((item) => item.id === userId)!;
      if (user.email !== body.email) {
        db.credentials[body.email] = db.credentials[user.email];
        delete db.credentials[user.email];
      }
      Object.assign(user, { name: body.name, email: body.email, updatedAt: nowISO() });
      persistDb();
      return toAuthUser(userId);
    },
  },
  {
    method: "PUT",
    pattern: "/auth/password",
    handler: (request) => {
      const body = bodyOf<{ currentPassword: string; newPassword: string }>(request);
      const db = getDb();
      const user = db.users.find((item) => item.id === currentUserId(request))!;
      if (db.credentials[user.email] !== body.currentPassword) {
        validationFailed({ currentPassword: ["Current password is incorrect."] });
      }
      db.credentials[user.email] = body.newPassword;
      persistDb();
      return { message: "Password updated." };
    },
  },
  {
    method: "POST",
    pattern: "/auth/forgot-password",
    public: true,
    handler: (request) => {
      const body = bodyOf<{ email: string }>(request);
      requireFields(body, ["email"]);
      const db = getDb();
      const user = db.users.find((item) => item.email.toLowerCase() === body.email.toLowerCase());
      if (user) {
        // In mock mode the reset token is "demo-reset-token" so the reset page can be tried end to end.
        db.resetTokens["demo-reset-token"] = user.email;
        persistDb();
      }
      // Same response whether or not the account exists, to avoid account enumeration.
      return { message: "If an account exists for that email, a reset link has been sent." };
    },
  },
  {
    method: "POST",
    pattern: "/auth/reset-password",
    public: true,
    handler: (request) => {
      const body = bodyOf<{ token: string; password: string }>(request);
      requireFields(body, ["token", "password"]);
      const db = getDb();
      const email = db.resetTokens[body.token];
      if (!email) throw new MockHttpError(400, "This reset link is invalid or has expired.");
      db.credentials[email] = body.password;
      delete db.resetTokens[body.token];
      persistDb();
      return { message: "Your password has been reset. You can now sign in." };
    },
  },
];
