import assert from "node:assert/strict";
import {
  addItemToCollection,
  createCollection,
  directoriesFromRatedItems,
  parseStoredCollections,
  reorderItem,
  removeItemFromCollection,
  resolveCollectionItems,
  type RatedItemRef,
  type RankedCollection,
} from "./collections";

const rated: RatedItemRef[] = [
  {
    itemId: "a",
    itemName: "Alpha",
    itemSlug: "alpha",
    directorySlug: "ai-dev-tools",
    directoryName: "AI Dev Tools",
    yourMean: 4.2,
  },
  {
    itemId: "b",
    itemName: "Beta",
    itemSlug: "beta",
    directorySlug: "ai-dev-tools",
    directoryName: "AI Dev Tools",
    yourMean: 3.8,
  },
  {
    itemId: "c",
    itemName: "Gamma",
    itemSlug: "gamma",
    directorySlug: "databases",
    directoryName: "Databases",
    yourMean: 4.5,
  },
];

const created = createCollection("My stack", "ai-dev-tools", ["b", "a"], []);
assert.equal(created.ok, true);
if (!created.ok) throw new Error("expected collection");

const collection = created.collection;
assert.equal(collection.itemIds.join(","), "b,a");

const movedUp = reorderItem(collection, "a", "up");
assert.equal(movedUp.itemIds.join(","), "a,b");

const movedDown = reorderItem(movedUp, "a", "down");
assert.equal(movedDown.itemIds.join(","), "b,a");

const trimmed = removeItemFromCollection(movedDown, "a");
assert.equal(trimmed, null);

const removed = removeItemFromCollection(
  { ...collection, itemIds: ["b", "a", "extra"] },
  "b",
);
assert.ok(removed);
assert.equal(removed!.itemIds.join(","), "a,extra");

const added = addItemToCollection(collection, "c");
assert.equal(added.ok, true);
if (added.ok) {
  assert.equal(added.collection.itemIds.join(","), "b,a,c");
}

const duplicate = addItemToCollection(collection, "a");
assert.equal(duplicate.ok, false);

const dirs = directoriesFromRatedItems(rated);
assert.equal(dirs.length, 2);
assert.equal(dirs[0].slug, "ai-dev-tools");

const resolved = resolveCollectionItems(collection, rated);
assert.deepEqual(
  resolved.map((row) => row.itemName),
  ["Beta", "Alpha"],
);
assert.deepEqual(
  resolved.map((row) => row.rank),
  [1, 2],
);

const parsed = parseStoredCollections(
  JSON.stringify([
    {
      id: "1",
      name: "Saved",
      directorySlug: "ai-dev-tools",
      itemIds: ["a", "a", "b"],
      updatedAt: "2026-05-24T00:00:00.000Z",
    },
    { bad: true },
  ]),
);
assert.equal(parsed.length, 1);
assert.deepEqual(parsed[0].itemIds, ["a", "b"]);

assert.equal(parseStoredCollections("{not-json").length, 0);
assert.equal(parseStoredCollections(null).length, 0);

const tooFew = createCollection("x", "ai-dev-tools", ["a"], [] as RankedCollection[]);
assert.equal(tooFew.ok, false);
