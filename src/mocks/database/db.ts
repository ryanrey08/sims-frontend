import { STORAGE_KEYS } from "@/constants/storage";
import { readStorage, writeStorage } from "@/lib/utils/storage";
import { createSeedDatabase } from "./seed";
import type { MockDatabase } from "./types";

let database: MockDatabase | null = null;

function isValid(value: MockDatabase | null): value is MockDatabase {
  return Boolean(value && Array.isArray(value.products) && Array.isArray(value.movements) && Array.isArray(value.documents) && value.masters && value.settings);
}

/** Returns the singleton mock database, loading it from localStorage or seeding it. */
export function getDb(): MockDatabase {
  if (!database) {
    const stored = readStorage<MockDatabase>(STORAGE_KEYS.mockDatabase);
    database = isValid(stored) ? stored : createSeedDatabase();
  }
  return database;
}

/** Saves the mock database so CRUD changes survive a page reload. */
export function persistDb() {
  if (database) writeStorage(STORAGE_KEYS.mockDatabase, database);
}

/** Restores the original demo data. */
export function resetDb() {
  const sessions = database?.sessions ?? {};
  database = createSeedDatabase();
  database.sessions = sessions;
  persistDb();
}

export function newId(prefix: string) {
  return `${prefix}-${Date.now().toString(36)}${Math.random().toString(36).slice(2, 7)}`;
}

export function nowISO() {
  return new Date().toISOString();
}
