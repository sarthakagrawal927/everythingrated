import { sql } from "drizzle-orm";
import {
  integer,
  sqliteTable,
  text,
  uniqueIndex,
} from "drizzle-orm/sqlite-core";

// ─────────────────────────────────────────────
// EverythingRated — multi-axis ratings
// ─────────────────────────────────────────────

/** A directory: a self-contained collection of rateable things with its own aspects. */
export const directories = sqliteTable("directories", {
  id: text("id").primaryKey(),
  slug: text("slug").notNull().unique(),
  name: text("name").notNull(),
  description: text("description").notNull(),
  heroCopy: text("hero_copy").notNull(),
  sortOrder: integer("sort_order").notNull().default(0),
  createdAt: integer("created_at", { mode: "timestamp_ms" })
    .notNull()
    .default(sql`(unixepoch() * 1000)`),
});

/** A rateable thing inside a directory. Slug is unique per directory. */
export const items = sqliteTable(
  "items",
  {
    id: text("id").primaryKey(),
    directoryId: text("directory_id")
      .notNull()
      .references(() => directories.id, { onDelete: "cascade" }),
    slug: text("slug").notNull(),
    name: text("name").notNull(),
    description: text("description").notNull(),
    websiteUrl: text("website_url").notNull(),
    logoUrl: text("logo_url"),
    createdAt: integer("created_at", { mode: "timestamp_ms" })
      .notNull()
      .default(sql`(unixepoch() * 1000)`),
  },
  (t) => ({
    dirSlug: uniqueIndex("items_directory_slug_idx").on(t.directoryId, t.slug),
  }),
);

/** A rating axis scoped to one directory. Key is unique per directory. */
export const aspects = sqliteTable(
  "aspects",
  {
    id: text("id").primaryKey(),
    directoryId: text("directory_id")
      .notNull()
      .references(() => directories.id, { onDelete: "cascade" }),
    key: text("key").notNull(),
    label: text("label").notNull(),
    description: text("description").notNull(),
    sortOrder: integer("sort_order").notNull().default(0),
  },
  (t) => ({
    dirKey: uniqueIndex("aspects_directory_key_idx").on(t.directoryId, t.key),
  }),
);

/**
 * One rating per (item, aspect, visitor). Re-rating upserts.
 * `visitorId` comes from the `er_visitor` cookie (anonymous UUID).
 */
export const ratings = sqliteTable(
  "ratings",
  {
    id: text("id").primaryKey(),
    itemId: text("item_id")
      .notNull()
      .references(() => items.id, { onDelete: "cascade" }),
    aspectId: text("aspect_id")
      .notNull()
      .references(() => aspects.id, { onDelete: "cascade" }),
    visitorId: text("visitor_id").notNull(),
    score: integer("score").notNull(),
    createdAt: integer("created_at", { mode: "timestamp_ms" })
      .notNull()
      .default(sql`(unixepoch() * 1000)`),
  },
  (t) => ({
    uniq: uniqueIndex("ratings_item_aspect_visitor_idx").on(
      t.itemId,
      t.aspectId,
      t.visitorId,
    ),
  }),
);

export type Directory = typeof directories.$inferSelect;
export type Item = typeof items.$inferSelect;
export type Aspect = typeof aspects.$inferSelect;
export type Rating = typeof ratings.$inferSelect;
