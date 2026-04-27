import {
  items,
  aspects,
  ratings,
  directories,
  type Aspect,
  type Item,
  type Directory,
} from "@everythingrated/db";
import { and, eq } from "drizzle-orm";
import { getDb } from "./db";

export type AspectAverage = {
  aspect: Aspect;
  avg: number; // 0 if no ratings yet
  count: number;
  yourScore: number | null;
};

export type ItemWithAggregate = {
  item: Item;
  aspects: AspectAverage[];
  overall: number; // mean of aspect avgs (excluding aspects with no ratings)
  totalRaters: number; // distinct visitor ids across all aspects for this item
};

export type DirectorySummary = {
  directory: Directory;
  itemCount: number;
  aspectCount: number;
};

/** Load all directories with item + aspect counts. */
export async function listDirectories(): Promise<DirectorySummary[]> {
  const db = await getDb();
  const [allDirs, allItems, allAspects] = await Promise.all([
    db.select().from(directories).orderBy(directories.sortOrder),
    db.select({ directoryId: items.directoryId }).from(items),
    db.select({ directoryId: aspects.directoryId }).from(aspects),
  ]);

  return allDirs.map((directory) => ({
    directory,
    itemCount: allItems.filter((i) => i.directoryId === directory.id).length,
    aspectCount: allAspects.filter((a) => a.directoryId === directory.id).length,
  }));
}

/** Single directory by slug — null if not found. */
export async function getDirectoryBySlug(slug: string): Promise<Directory | null> {
  const db = await getDb();
  const [dir] = await db.select().from(directories).where(eq(directories.slug, slug));
  return dir ?? null;
}

/** Aggregate every item in a directory with per-aspect averages and the visitor's own scores. */
export async function listItemsWithAggregates(
  directoryId: string,
  visitorId: string | null,
): Promise<ItemWithAggregate[]> {
  const db = await getDb();
  const [dirItems, dirAspects] = await Promise.all([
    db.select().from(items).where(eq(items.directoryId, directoryId)).orderBy(items.name),
    db.select().from(aspects).where(eq(aspects.directoryId, directoryId)).orderBy(aspects.sortOrder),
  ]);
  if (dirItems.length === 0) return [];
  const itemIds = new Set(dirItems.map((i) => i.id));
  const allRatings = (await db.select().from(ratings)).filter((r) => itemIds.has(r.itemId));

  return dirItems.map((item) => buildAggregate(item, dirAspects, allRatings, visitorId));
}

/** Single item by directory + slug — null if not found. */
export async function getItemAggregate(
  directorySlug: string,
  itemSlug: string,
  visitorId: string | null,
): Promise<{ directory: Directory; data: ItemWithAggregate } | null> {
  const db = await getDb();
  const dir = await getDirectoryBySlug(directorySlug);
  if (!dir) return null;
  const [item] = await db
    .select()
    .from(items)
    .where(and(eq(items.directoryId, dir.id), eq(items.slug, itemSlug)));
  if (!item) return null;
  const [dirAspects, itemRatings] = await Promise.all([
    db.select().from(aspects).where(eq(aspects.directoryId, dir.id)).orderBy(aspects.sortOrder),
    db.select().from(ratings).where(eq(ratings.itemId, item.id)),
  ]);
  return { directory: dir, data: buildAggregate(item, dirAspects, itemRatings, visitorId) };
}

/** Upsert a rating from the given visitor. Score is clamped to 1..5. */
export async function rate(opts: {
  itemId: string;
  aspectId: string;
  visitorId: string;
  score: number;
}): Promise<void> {
  const score = Math.max(1, Math.min(5, Math.round(opts.score)));
  const db = await getDb();
  await db
    .insert(ratings)
    .values({
      id: crypto.randomUUID(),
      itemId: opts.itemId,
      aspectId: opts.aspectId,
      visitorId: opts.visitorId,
      score,
    })
    .onConflictDoUpdate({
      target: [ratings.itemId, ratings.aspectId, ratings.visitorId],
      set: { score },
    });
}

// ─────────── internal ───────────

function buildAggregate(
  item: Item,
  dirAspects: Aspect[],
  allRatings: { itemId: string; aspectId: string; visitorId: string; score: number }[],
  visitorId: string | null,
): ItemWithAggregate {
  const itemRatings = allRatings.filter((r) => r.itemId === item.id);

  const perAspect: AspectAverage[] = dirAspects.map((aspect) => {
    const rs = itemRatings.filter((r) => r.aspectId === aspect.id);
    const avg = rs.length ? rs.reduce((s, r) => s + r.score, 0) / rs.length : 0;
    const yourScore =
      visitorId !== null
        ? (rs.find((r) => r.visitorId === visitorId)?.score ?? null)
        : null;
    return { aspect, avg, count: rs.length, yourScore };
  });

  const rated = perAspect.filter((a) => a.count > 0);
  const overall = rated.length
    ? rated.reduce((s, a) => s + a.avg, 0) / rated.length
    : 0;

  const totalRaters = new Set(itemRatings.map((r) => r.visitorId)).size;

  return { item, aspects: perAspect, overall, totalRaters };
}
