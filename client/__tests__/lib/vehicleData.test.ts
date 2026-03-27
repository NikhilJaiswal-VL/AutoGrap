import { QUICK_SELECTS } from "@/lib/vehicleData";

describe("Quick Selects", () => {
  it("should have at least one quick select option", () => {
    expect(QUICK_SELECTS.length).toBeGreaterThan(0);
  });
});
