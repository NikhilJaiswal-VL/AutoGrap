import { MAKES, MODELS, getBadges, getModels } from "../vehicleData";

describe("vehicleData helpers", () => {
  it("returns the configured makes", () => {
    expect(MAKES).toEqual(["ford", "bmw", "tesla"]);
  });

  it("returns models for a known make regardless of input casing", () => {
    expect(getModels("Ford")).toEqual(Object.keys(MODELS.ford));
  });

  it("returns an empty array for an unknown make", () => {
    expect(getModels("audi")).toEqual([]);
  });

  it("returns badges for a known make and model", () => {
    expect(getBadges("Tesla", "Model 3")).toEqual(MODELS.tesla["Model 3"]);
  });

  it("returns an empty array for an unknown make", () => {
    expect(getBadges("audi", "RS6")).toEqual([]);
  });

  it("returns an empty array for an unknown model on a known make", () => {
    expect(getBadges("ford", "Territory")).toEqual([]);
  });
});
