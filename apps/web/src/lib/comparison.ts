import type { AspectAverage, ItemWithAggregate } from "./ratings";

export type WeightMap = Record<string, number>;

export const MAX_COMPARE_ITEMS = 4;

export type WeightedComparisonRow = {
  item: ItemWithAggregate["item"];
  total: number;
  tradeoffs: { aspect: AspectAverage["aspect"]; weighted: number; raw: number; weight: number }[];
};

export function parseCompareState(searchParams: URLSearchParams): {
  selectedIds: string[];
  weights: WeightMap;
} {
  const selectedIds = (searchParams.get("compare") ?? "")
    .split(",")
    .map((value) => value.trim())
    .filter(Boolean)
    .slice(0, MAX_COMPARE_ITEMS);

  const weights: WeightMap = {};
  for (const part of (searchParams.get("w") ?? "").split(",")) {
    const [key, rawValue] = part.split(":");
    const value = Number(rawValue);
    if (key && Number.isFinite(value)) weights[key] = clampWeight(value);
  }

  return { selectedIds, weights };
}

export function encodeCompareState(selectedIds: string[], weights: WeightMap): string {
  const params = new URLSearchParams();
  if (selectedIds.length > 0) {
    params.set("compare", selectedIds.slice(0, MAX_COMPARE_ITEMS).join(","));
  }
  const encodedWeights = Object.entries(weights)
    .filter(([, value]) => value !== 1)
    .map(([key, value]) => `${key}:${clampWeight(value)}`)
    .join(",");
  if (encodedWeights) params.set("w", encodedWeights);
  return params.toString();
}

export function compareItems(items: ItemWithAggregate[], selectedIds: string[], weights: WeightMap): WeightedComparisonRow[] {
  const selected = new Set(selectedIds);
  return items
    .filter((item) => selected.has(item.item.id))
    .map((item) => {
      const tradeoffs = item.aspects.map((aspect) => {
        const weight = clampWeight(weights[aspect.aspect.key] ?? 1);
        return {
          aspect: aspect.aspect,
          raw: aspect.avg,
          weight,
          weighted: aspect.avg * weight,
        };
      });
      const totalWeight = tradeoffs.reduce((sum, aspect) => sum + aspect.weight, 0) || 1;
      const total = tradeoffs.reduce((sum, aspect) => sum + aspect.weighted, 0) / totalWeight;
      return { item: item.item, total, tradeoffs };
    })
    .sort((a, b) => b.total - a.total || a.item.name.localeCompare(b.item.name));
}

function clampWeight(value: number): number {
  return Math.max(0, Math.min(5, Math.round(value * 10) / 10));
}
