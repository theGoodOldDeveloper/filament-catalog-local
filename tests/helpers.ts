import type { ProfileValues } from "@/server/profiles";

export const profile = (over: ProfileValues = {}): ProfileValues => ({
  manufacturer: "TestCo", brand: "TestFil", productName: "Test PLA", sku: "T-PLA-BK", materialFamily: "PLA", materialNameRaw: "PLA",
  colorName: "Black", diameterMm: 1.75, netWeightG: 1000, ...over,
});
