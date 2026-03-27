export type ModelMap = Record<string, string[]>;
export type VehicleData = Record<string, ModelMap>;

export const MODELS: VehicleData = {
  ford: {
    Ranger: ["Raptor", "Raptor X", "Wildtrak"],
    Falcon: ["XR6", "XR6 Turbo", "XR8"],
    "Falcon Ute": ["XR6", "XR6 Turbo"],
  },
  bmw: {
    "130d": ["xDrive 26d", "xDrive 30d"],
    "240i": ["xDrive 30d", "xDrive 50d"],
    "320e": ["xDrive 75d", "xDrive 80d", "xDrive 85d"],
  },
  tesla: {
    "Model 3": ["Performance", "Long Range", "Dual Motor"],
  },
};

export const MAKES = Object.keys(MODELS);

export function getModels(make: string): string[] {
  const makeKey = make.toLowerCase();
  return MODELS[makeKey] ? Object.keys(MODELS[makeKey]) : [];
}

export function getBadges(make: string, model: string): string[] {
  const makeKey = make.toLowerCase();
  if (!MODELS[makeKey]) return [];
  return MODELS[makeKey][model] ?? [];
}
