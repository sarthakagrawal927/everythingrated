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

/**
 * Top items across the whole catalogue ranked by the visitor count + mean
 * score of a specific aspect-key match. The same aspect key (e.g.
 * "performance") can exist across multiple directories — items show up
 * with their directory label so users can disambiguate.
 */
export async function topItemsByAspectKey(
  aspectKey: string,
  limit = 50,
): Promise<Array<{
  item: Item;
  directory: Directory;
  aspectId: string;
  avg: number;
  raters: number;
}>> {
  const db = await getDb();
  const [matchingAspects, allItems, allDirs, allRatings] = await Promise.all([
    db.select().from(aspects).where(eq(aspects.key, aspectKey)),
    db.select().from(items),
    db.select().from(directories),
    db.select().from(ratings),
  ]);

  if (matchingAspects.length === 0) return [];
  const itemById = new Map(allItems.map((i) => [i.id, i]));
  const dirById = new Map(allDirs.map((d) => [d.id, d]));

  const out: Array<{
    item: Item;
    directory: Directory;
    aspectId: string;
    avg: number;
    raters: number;
  }> = [];

  for (const aspect of matchingAspects) {
    const dir = dirById.get(aspect.directoryId);
    if (!dir) continue;
    const dirItems = allItems.filter((i) => i.directoryId === aspect.directoryId);
    for (const item of dirItems) {
      const rs = allRatings.filter(
        (r) => r.itemId === item.id && r.aspectId === aspect.id,
      );
      if (rs.length === 0) continue;
      const visitors = new Set(rs.map((r) => r.visitorId));
      const sum = rs.reduce((s, r) => s + r.score, 0);
      out.push({
        item,
        directory: dir,
        aspectId: aspect.id,
        avg: sum / rs.length,
        raters: visitors.size,
      });
    }
  }

  out.sort((a, b) =>
    b.raters !== a.raters ? b.raters - a.raters : b.avg - a.avg,
  );
  return out.slice(0, limit);
}

/**
 * Every distinct aspect key in the catalogue with a count of directories it
 * appears in and a sample label.
 */
export async function listAspectKeys(): Promise<Array<{
  key: string;
  label: string;
  directories: number;
}>> {
  const db = await getDb();
  const allAspects = await db.select().from(aspects);
  const byKey = new Map<string, { label: string; directories: Set<string> }>();
  for (const a of allAspects) {
    const entry = byKey.get(a.key) ?? { label: a.label, directories: new Set<string>() };
    entry.directories.add(a.directoryId);
    byKey.set(a.key, entry);
  }
  return [...byKey.entries()]
    .map(([key, entry]) => ({
      key,
      label: entry.label,
      directories: entry.directories.size,
    }))
    .sort((a, b) => b.directories - a.directories);
}

/**
 * Items the given visitor has rated, with the visitor's mean score per item
 * and the directory it lives in. Newest rating first.
 */
export async function listItemsRatedByVisitor(
  visitorId: string,
): Promise<Array<{
  item: Item;
  directory: Directory;
  yourMean: number;
  ratedAspects: number;
  lastRatedAt: Date;
}>> {
  const db = await getDb();
  const [myRatings, allItems, allDirs] = await Promise.all([
    db.select().from(ratings).where(eq(ratings.visitorId, visitorId)),
    db.select().from(items),
    db.select().from(directories),
  ]);
  const itemById = new Map(allItems.map((i) => [i.id, i]));
  const dirById = new Map(allDirs.map((d) => [d.id, d]));

  const byItem = new Map<
    string,
    { sum: number; count: number; latest: number }
  >();
  for (const r of myRatings) {
    const e = byItem.get(r.itemId) ?? { sum: 0, count: 0, latest: 0 };
    e.sum += r.score;
    e.count += 1;
    const t = r.createdAt instanceof Date ? r.createdAt.getTime() : Number(r.createdAt);
    if (t > e.latest) e.latest = t;
    byItem.set(r.itemId, e);
  }

  const out: Array<{
    item: Item;
    directory: Directory;
    yourMean: number;
    ratedAspects: number;
    lastRatedAt: Date;
  }> = [];
  for (const [itemId, e] of byItem) {
    const item = itemById.get(itemId);
    if (!item) continue;
    const dir = dirById.get(item.directoryId);
    if (!dir) continue;
    out.push({
      item,
      directory: dir,
      yourMean: e.sum / e.count,
      ratedAspects: e.count,
      lastRatedAt: new Date(e.latest),
    });
  }
  out.sort((a, b) => b.lastRatedAt.getTime() - a.lastRatedAt.getTime());
  return out;
}

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

/**
 * Count how many ratings the given visitor has already submitted. Used by the
 * analytics layer to decide whether a rating is the visitor's first (and so
 * should also emit the `activated` event).
 */
export async function countVisitorRatings(visitorId: string): Promise<number> {
  const db = await getDb();
  const rows = await db
    .select({ id: ratings.id })
    .from(ratings)
    .where(eq(ratings.visitorId, visitorId));
  return rows.length;
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
