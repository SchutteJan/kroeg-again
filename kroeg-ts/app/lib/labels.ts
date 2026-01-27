export const locationLabels = [
  {
    value: "bar",
    label: "Bar",
    description: "Traditional kroeg focus on drinking.",
    tone: "amber",
  },
  {
    value: "wine_bar",
    label: "Wine Bar",
    description: "Wine-first drinking room.",
    tone: "rose",
  },
  {
    value: "coffeeshop_weed",
    label: "Coffeeshop (Weed)",
    description: "Cannabis coffeeshop.",
    tone: "emerald",
  },
  {
    value: "coffeeshop_cafe",
    label: "Coffeeshop (Cafe)",
    description: "Coffee cafe without cannabis.",
    tone: "sky",
  },
  {
    value: "restaurant",
    label: "Restaurant",
    description: "Food-first service.",
    tone: "orange",
  },
  {
    value: "hotel_bar",
    label: "Hotel Bar",
    description: "Bar inside a hotel.",
    tone: "violet",
  },
  {
    value: "event_space",
    label: "Event Space",
    description: "Venue with alcohol license.",
    tone: "fuchsia",
  },
  {
    value: "sportkantine",
    label: "Sportkantine",
    description: "Sports club canteen.",
    tone: "cyan",
  },
  {
    value: "other",
    label: "Other",
    description: "Doesn't fit other categories.",
    tone: "slate",
  },
] as const;

export type LocationLabel = (typeof locationLabels)[number]["value"];

export const labelMap = Object.fromEntries(
  locationLabels.map((item) => [item.value, item]),
);

export const labelValues = locationLabels.map(
  (item) => item.value,
) as LocationLabel[];

export const labelSet = new Set(labelValues);
