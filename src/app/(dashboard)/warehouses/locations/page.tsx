import { Suspense } from "react";
import type { Metadata } from "next";
import { LocationsView } from "@/features/locations/components/LocationsView";

export const metadata: Metadata = { title: "Warehouse Locations" };

export default function Page() {
  return (
    <Suspense>
      <LocationsView />
    </Suspense>
  );
}
