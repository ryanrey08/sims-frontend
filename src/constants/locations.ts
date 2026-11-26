import type { SelectOption } from "@/components/ui/Select";

/** Address pick-lists for the warehouse form (Region → City / Municipality → Barangay). */
export const PH_LOCATIONS: Record<string, Record<string, string[]>> = {
  "NCR – National Capital Region": {
    "Marikina City": ["Sta. Elena", "Concepcion Uno", "Concepcion Dos", "Fortune", "Industrial Valley", "Malanday", "San Roque"],
    "Quezon City": ["Bagumbayan", "Batasan Hills", "Commonwealth", "Diliman", "Libis"],
    "Pasig City": ["Kapitolyo", "Manggahan", "Rosario", "San Antonio", "Ugong"],
    "City of Manila": ["Ermita", "Malate", "Paco", "Sampaloc", "Tondo"],
  },
  "Region IV-A – CALABARZON": {
    "Antipolo City": ["Dela Paz", "Mayamot", "San Isidro", "San Roque"],
    "Cainta": ["San Andres", "San Isidro", "Sto. Domingo"],
    "Calamba City": ["Canlubang", "Parian", "Real"],
  },
  "Region III – Central Luzon": {
    "City of San Fernando": ["Dolores", "San Agustin", "Sindalan"],
    "Malolos City": ["Bulihan", "Longos", "Sto. Rosario"],
  },
};

export const options = (values: string[]): SelectOption[] => values.map((value) => ({ label: value, value }));
export const REGION_OPTIONS = options(Object.keys(PH_LOCATIONS));
export const cityOptions = (region?: string) => options(Object.keys(PH_LOCATIONS[region ?? ""] ?? {}));
export const barangayOptions = (region?: string, city?: string) => options(PH_LOCATIONS[region ?? ""]?.[city ?? ""] ?? []);
