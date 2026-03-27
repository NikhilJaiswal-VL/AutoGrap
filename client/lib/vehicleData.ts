export interface QuickSelect {
  label: string;
  icon: string;
  make: string;
  model: string;
  badge: string;
}

export const QUICK_SELECTS: QuickSelect[] = [
  {
    label: "Tesla Model 3 Performance",
    icon: "⚡",
    make: "tesla",
    model: "Model 3",
    badge: "Performance",
  },
  {
    label: "Ford Ranger Raptor",
    icon: "🛻",
    make: "ford",
    model: "Ranger",
    badge: "Raptor",
  },
  {
    label: "BMW 320e xDrive 85d",
    icon: "🏎️",
    make: "bmw",
    model: "320e",
    badge: "xDrive 85d",
  },
  {
    label: "Ford Falcon XR8",
    icon: "🔥",
    make: "ford",
    model: "Falcon",
    badge: "XR8",
  },
];
