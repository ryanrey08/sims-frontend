import { adminRoutes } from "./admin";
import { authRoutes } from "./auth";
import { catalogRoutes } from "./catalog";
import { formRoutes } from "./forms";
import { recordRoutes } from "./records";
import { insightRoutes } from "./insights";
import { inventoryRoutes } from "./inventory";
import { procurementRoutes } from "./procurement";
import type { MockRoute } from "./utils";

interface CompiledRoute extends MockRoute {
  regex: RegExp;
  keys: string[];
}

function compile(route: MockRoute): CompiledRoute {
  const keys: string[] = [];
  const source = route.pattern.replace(/:([A-Za-z]+)/g, (_match, key: string) => {
    keys.push(key);
    return "([^/]+)";
  });
  return { ...route, regex: new RegExp(`^${source}/?$`), keys };
}

/** Static segments are listed before ":id" routes in each module, so first match wins. */
const routes: CompiledRoute[] = [
  ...authRoutes,
  ...formRoutes,
  ...recordRoutes,
  ...insightRoutes,
  ...inventoryRoutes,
  ...catalogRoutes,
  ...procurementRoutes,
  ...adminRoutes,
].map(compile);

export function matchRoute(method: string, path: string) {
  for (const route of routes) {
    if (route.method !== method) continue;
    const match = route.regex.exec(path);
    if (match) {
      const params = Object.fromEntries(route.keys.map((key, index) => [key, decodeURIComponent(match[index + 1])]));
      return { route, params };
    }
  }
  return null;
}
