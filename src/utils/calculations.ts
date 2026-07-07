import type { LocationZone } from "@/features/projects";

export const calculateZoneSubtotal = (zone: LocationZone): number => {
  return zone.workItems.reduce(
    (sum, item) => sum + item.quantity * item.unitPrice,
    0,
  );
};

export const calculateTotalAmount = (
  locations: LocationZone[] | undefined | null,
): number => {
  // 🎯 防呆：如果 locations 是空值，就直接給予空陣列 []，避免 reduce 噴錯
  const safeLocations = locations ?? [];

  return safeLocations.reduce(
    (sum, zone) => sum + calculateZoneSubtotal(zone),
    0,
  );
};
