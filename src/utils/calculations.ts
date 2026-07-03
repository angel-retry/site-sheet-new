import type { LocationZone } from "@/features/projects";

export const calculateZoneSubtotal = (zone: LocationZone): number => {
  return zone.workItems.reduce(
    (sum, item) => sum + item.quantity * item.unitPrice,
    0,
  );
};
