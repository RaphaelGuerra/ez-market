import { describe, expect, it } from "vitest";
import { haversineDistanceKm } from "../src/utils/geo.js";

describe("haversineDistanceKm", () => {
  it("returns zero for same coordinates", () => {
    const distance = haversineDistanceKm(
      { lat: 37.7749, lon: -122.4194 },
      { lat: 37.7749, lon: -122.4194 }
    );
    expect(distance).toBeCloseTo(0, 5);
  });

  it("returns a finite distance for antipodal coordinates", () => {
    const distance = haversineDistanceKm(
      { lat: 0, lon: 0 },
      { lat: 0, lon: 180 }
    );

    expect(Number.isFinite(distance)).toBe(true);
    expect(distance).toBeCloseTo(Math.PI * 6371, 5);
  });
});
