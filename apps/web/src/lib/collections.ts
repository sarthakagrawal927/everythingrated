export const COLLECTIONS_STORAGE_KEY = "er:ranked-collections";
export const MAX_COLLECTION_ITEMS = 20;

export type RankedCollection = {
  id: string;
  name: string;
  directorySlug: string;
  /** Item ids in rank order — index 0 is #1. */
  itemIds: string[];
  updatedAt: string;
};

export type RatedItemRef = {
  itemId: string;
  itemName: string;
  itemSlug: string;
  directorySlug: string;
  directoryName: string;
  yourMean: number;
};

export function createCollection(
  name: string,
  directorySlug: string,
  itemIds: string[],
  existing: RankedCollection[],
): { ok: true; collection: RankedCollection } | { ok: false; error: string } {
  const trimmed = name.trim();
  if (!trimmed) return { ok: false, error: "Name your collection first." };
  if (trimmed.length > 80) return { ok: false, error: "Name must be 80 characters or fewer." };
  if (!directorySlug) return { ok: false, error: "Pick a directory." };

  const uniqueIds = dedupeItemIds(itemIds);
  if (uniqueIds.length < 2) {
    return { ok: false, error: "Add at least two items to rank." };
  }
  if (uniqueIds.length > MAX_COLLECTION_ITEMS) {
    return { ok: false, error: `Collections can hold up to ${MAX_COLLECTION_ITEMS} items.` };
  }

  const now = new Date().toISOString();
  const collection: RankedCollection = {
    id: crypto.randomUUID(),
    name: trimmed,
    directorySlug,
    itemIds: uniqueIds,
    updatedAt: now,
  };

  return { ok: true, collection: collection };
}

export function mergeCollections(
  existing: RankedCollection[],
  created: RankedCollection,
): RankedCollection[] {
  return [created, ...existing];
}

export function reorderItem(
  collection: RankedCollection,
  itemId: string,
  direction: "up" | "down",
): RankedCollection {
  const index = collection.itemIds.indexOf(itemId);
  if (index === -1) return collection;

  const target = direction === "up" ? index - 1 : index + 1;
  if (target < 0 || target >= collection.itemIds.length) return collection;

  const nextIds = [...collection.itemIds];
  [nextIds[index], nextIds[target]] = [nextIds[target], nextIds[index]];

  return {
    ...collection,
    itemIds: nextIds,
    updatedAt: new Date().toISOString(),
  };
}

export function removeItemFromCollection(
  collection: RankedCollection,
  itemId: string,
): RankedCollection | null {
  const nextIds = collection.itemIds.filter((id) => id !== itemId);
  if (nextIds.length < 2) return null;
  return {
    ...collection,
    itemIds: nextIds,
    updatedAt: new Date().toISOString(),
  };
}

export function addItemToCollection(
  collection: RankedCollection,
  itemId: string,
): { ok: true; collection: RankedCollection } | { ok: false; error: string } {
  if (collection.itemIds.includes(itemId)) {
    return { ok: false, error: "Item is already in this collection." };
  }
  if (collection.itemIds.length >= MAX_COLLECTION_ITEMS) {
    return { ok: false, error: `Collections can hold up to ${MAX_COLLECTION_ITEMS} items.` };
  }

  return {
    ok: true,
    collection: {
      ...collection,
      itemIds: [...collection.itemIds, itemId],
      updatedAt: new Date().toISOString(),
    },
  };
}

export function renameCollection(
  collection: RankedCollection,
  name: string,
): { ok: true; collection: RankedCollection } | { ok: false; error: string } {
  const trimmed = name.trim();
  if (!trimmed) return { ok: false, error: "Name cannot be empty." };
  if (trimmed.length > 80) return { ok: false, error: "Name must be 80 characters or fewer." };
  return {
    ok: true,
    collection: {
      ...collection,
      name: trimmed,
      updatedAt: new Date().toISOString(),
    },
  };
}

export function resolveCollectionItems(
  collection: RankedCollection,
  ratedItems: RatedItemRef[],
): Array<RatedItemRef & { rank: number }> {
  const byId = new Map(ratedItems.map((item) => [item.itemId, item]));
  const resolved: Array<RatedItemRef & { rank: number }> = [];

  collection.itemIds.forEach((itemId, index) => {
    const item = byId.get(itemId);
    if (item) resolved.push({ ...item, rank: index + 1 });
  });

  return resolved;
}

export function ratedItemsForDirectory(
  ratedItems: RatedItemRef[],
  directorySlug: string,
): RatedItemRef[] {
  return ratedItems.filter((item) => item.directorySlug === directorySlug);
}

export function directoriesFromRatedItems(
  ratedItems: RatedItemRef[],
): Array<{ slug: string; name: string; count: number }> {
  const bySlug = new Map<string, { name: string; count: number }>();
  for (const item of ratedItems) {
    const entry = bySlug.get(item.directorySlug) ?? {
      name: item.directoryName,
      count: 0,
    };
    entry.count += 1;
    bySlug.set(item.directorySlug, entry);
  }
  return [...bySlug.entries()]
    .map(([slug, entry]) => ({ slug, name: entry.name, count: entry.count }))
    .sort((a, b) => a.name.localeCompare(b.name));
}

export function parseStoredCollections(raw: string | null): RankedCollection[] {
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed
      .filter(isRankedCollection)
      .map((collection) => ({
        ...collection,
        itemIds: dedupeItemIds(collection.itemIds).slice(0, MAX_COLLECTION_ITEMS),
      }))
      .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
  } catch {
    return [];
  }
}

export function serializeCollections(collections: RankedCollection[]): string {
  return JSON.stringify(collections);
}

function dedupeItemIds(itemIds: string[]): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const id of itemIds) {
    if (!id || seen.has(id)) continue;
    seen.add(id);
    out.push(id);
  }
  return out;
}

function isRankedCollection(value: unknown): value is RankedCollection {
  if (!value || typeof value !== "object") return false;
  const record = value as Record<string, unknown>;
  return (
    typeof record.id === "string" &&
    typeof record.name === "string" &&
    typeof record.directorySlug === "string" &&
    Array.isArray(record.itemIds) &&
    record.itemIds.every((id) => typeof id === "string") &&
    typeof record.updatedAt === "string"
  );
}
