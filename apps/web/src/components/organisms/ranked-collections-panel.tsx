"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Card, CardBody } from "@/components/atoms/card";
import {
  addItemToCollection,
  COLLECTIONS_STORAGE_KEY,
  createCollection,
  directoriesFromRatedItems,
  parseStoredCollections,
  ratedItemsForDirectory,
  removeItemFromCollection,
  reorderItem,
  resolveCollectionItems,
  serializeCollections,
  type RatedItemRef,
  type RankedCollection,
} from "@/lib/collections";

type LoadState = "loading" | "ready" | "error";

export function RankedCollectionsPanel({
  ratedItems,
}: {
  ratedItems: RatedItemRef[];
}) {
  const [loadState, setLoadState] = useState<LoadState>("loading");
  const [collections, setCollections] = useState<RankedCollection[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  const [draftName, setDraftName] = useState("");
  const [draftDirectory, setDraftDirectory] = useState("");
  const [draftItemIds, setDraftItemIds] = useState<string[]>([]);

  const directories = useMemo(
    () => directoriesFromRatedItems(ratedItems),
    [ratedItems],
  );

  const directoryItems = useMemo(
    () => (draftDirectory ? ratedItemsForDirectory(ratedItems, draftDirectory) : []),
    [draftDirectory, ratedItems],
  );

  const selected = collections.find((collection) => collection.id === selectedId) ?? null;
  const selectedRows = selected
    ? resolveCollectionItems(selected, ratedItems)
    : [];

  const persist = useCallback((next: RankedCollection[]) => {
    setCollections(next);
    try {
      window.localStorage.setItem(COLLECTIONS_STORAGE_KEY, serializeCollections(next));
      setLoadState("ready");
    } catch {
      setLoadState("error");
    }
  }, []);

  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(COLLECTIONS_STORAGE_KEY);
      const parsed = parseStoredCollections(raw);
      setCollections(parsed);
      setSelectedId(parsed[0]?.id ?? null);
      setLoadState("ready");
    } catch {
      setLoadState("error");
    }
  }, []);

  useEffect(() => {
    if (!draftDirectory && directories.length > 0) {
      setDraftDirectory(directories[0].slug);
    }
  }, [directories, draftDirectory]);

  function toggleDraftItem(itemId: string) {
    setDraftItemIds((current) =>
      current.includes(itemId)
        ? current.filter((id) => id !== itemId)
        : [...current, itemId],
    );
    setFormError(null);
  }

  function handleCreate(event: React.FormEvent) {
    event.preventDefault();
    const result = createCollection(draftName, draftDirectory, draftItemIds, collections);
    if (!result.ok) {
      setFormError(result.error);
      return;
    }
    const next = [result.collection, ...collections];
    persist(next);
    setSelectedId(result.collection.id);
    setCreating(false);
    setDraftName("");
    setDraftItemIds([]);
    setFormError(null);
    setActionError(null);
  }

  function handleReorder(itemId: string, direction: "up" | "down") {
    if (!selected) return;
    const nextCollection = reorderItem(selected, itemId, direction);
    const next = collections.map((collection) =>
      collection.id === selected.id ? nextCollection : collection,
    );
    persist(next);
    setActionError(null);
  }

  function handleRemoveItem(itemId: string) {
    if (!selected) return;
    const nextCollection = removeItemFromCollection(selected, itemId);
    if (!nextCollection) {
      const next = collections.filter((collection) => collection.id !== selected.id);
      persist(next);
      setSelectedId(next[0]?.id ?? null);
      setActionError(null);
      return;
    }
    const next = collections.map((collection) =>
      collection.id === selected.id ? nextCollection : collection,
    );
    persist(next);
    setActionError(null);
  }

  function handleAddRatedItem(itemId: string) {
    if (!selected) return;
    const result = addItemToCollection(selected, itemId);
    if (!result.ok) {
      setActionError(result.error);
      return;
    }
    const next = collections.map((collection) =>
      collection.id === selected.id ? result.collection : collection,
    );
    persist(next);
    setActionError(null);
  }

  function handleDeleteCollection() {
    if (!selected) return;
    const next = collections.filter((collection) => collection.id !== selected.id);
    persist(next);
    setSelectedId(next[0]?.id ?? null);
    setActionError(null);
  }

  if (ratedItems.length < 2) {
    return (
      <Card className="mt-10">
        <CardBody>
          <h2 className="text-[20px] font-semibold tracking-tight">Ranked collections</h2>
          <p className="mt-2 text-sm text-[var(--muted)]">
            Rate at least two items in the same directory to build a ranked list you can
            revisit and reorder.
          </p>
        </CardBody>
      </Card>
    );
  }

  if (loadState === "loading") {
    return (
      <Card className="mt-10">
        <CardBody>
          <h2 className="text-[20px] font-semibold tracking-tight">Ranked collections</h2>
          <p className="mt-2 text-sm text-[var(--muted)]">Loading your saved lists…</p>
        </CardBody>
      </Card>
    );
  }

  if (loadState === "error") {
    return (
      <Card className="mt-10">
        <CardBody>
          <h2 className="text-[20px] font-semibold tracking-tight">Ranked collections</h2>
          <p className="mt-2 text-sm text-[var(--muted)]">
            Could not read saved collections from this browser. Try again after refreshing.
          </p>
        </CardBody>
      </Card>
    );
  }

  const addableItems = selected
    ? ratedItemsForDirectory(ratedItems, selected.directorySlug).filter(
        (item) => !selected.itemIds.includes(item.itemId),
      )
    : [];

  return (
    <section className="mt-10">
      <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="text-[20px] font-semibold tracking-tight">Ranked collections</h2>
          <p className="mt-1 text-[13px] text-[var(--muted)]">
            Save a personal stack, drag-free reorder with up/down, and jump back to rate items.
          </p>
        </div>
        {!creating && (
          <button
            type="button"
            onClick={() => {
              setCreating(true);
              setFormError(null);
              setActionError(null);
            }}
            className="inline-flex h-11 items-center rounded-[var(--radius-sm)] bg-[var(--foreground)] px-4 text-sm font-medium text-[var(--background)] transition-opacity hover:opacity-90"
          >
            New collection
          </button>
        )}
      </div>

      {creating && (
        <Card className="mb-4">
          <CardBody>
            <form onSubmit={handleCreate} className="space-y-4">
              <div>
                <label htmlFor="collection-name" className="block text-[13px] font-semibold">
                  Name
                </label>
                <input
                  id="collection-name"
                  value={draftName}
                  onChange={(event) => {
                    setDraftName(event.target.value);
                    setFormError(null);
                  }}
                  placeholder="My AI editor stack"
                  className="mt-2 w-full rounded-[var(--radius-sm)] border border-[var(--border)] bg-[var(--surface-2)] px-3 py-2 text-sm"
                  maxLength={80}
                />
              </div>

              <div>
                <label htmlFor="collection-directory" className="block text-[13px] font-semibold">
                  Directory
                </label>
                <select
                  id="collection-directory"
                  value={draftDirectory}
                  onChange={(event) => {
                    setDraftDirectory(event.target.value);
                    setDraftItemIds([]);
                    setFormError(null);
                  }}
                  className="mt-2 w-full rounded-[var(--radius-sm)] border border-[var(--border)] bg-[var(--surface-2)] px-3 py-2 text-sm"
                >
                  {directories.map((directory) => (
                    <option key={directory.slug} value={directory.slug}>
                      {directory.name} ({directory.count})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <p className="text-[13px] font-semibold">Items to rank</p>
                <p className="mt-1 text-[12px] text-[var(--muted)]">
                  Pick at least two. Order here becomes your starting rank (#1 first).
                </p>
                <div className="mt-3 space-y-2">
                  {directoryItems.map((item) => (
                    <label
                      key={item.itemId}
                      className="flex min-h-11 items-center gap-3 rounded-[var(--radius-sm)] border border-[var(--border)] px-3 py-2 text-[13px]"
                    >
                      <input
                        type="checkbox"
                        checked={draftItemIds.includes(item.itemId)}
                        onChange={() => toggleDraftItem(item.itemId)}
                      />
                      <span className="flex-1">{item.itemName}</span>
                      <span className="tabular-nums text-[var(--muted)]">
                        {item.yourMean.toFixed(1)}/5
                      </span>
                    </label>
                  ))}
                </div>
              </div>

              {formError && (
                <p className="text-[13px] text-red-600" role="alert">
                  {formError}
                </p>
              )}

              <div className="flex flex-wrap gap-3">
                <button
                  type="submit"
                  className="inline-flex h-11 items-center rounded-[var(--radius-sm)] bg-[var(--foreground)] px-4 text-sm font-medium text-[var(--background)]"
                >
                  Save collection
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setCreating(false);
                    setFormError(null);
                    setDraftName("");
                    setDraftItemIds([]);
                  }}
                  className="inline-flex h-11 items-center rounded-[var(--radius-sm)] border border-[var(--border-strong)] px-4 text-sm font-medium"
                >
                  Cancel
                </button>
              </div>
            </form>
          </CardBody>
        </Card>
      )}

      {collections.length === 0 && !creating ? (
        <Card>
          <CardBody className="text-center">
            <p className="text-[13px] font-medium">No collections yet.</p>
            <p className="mt-1 text-[12px] text-[var(--muted)]">
              Turn your rated items into a ranked list you can revisit.
            </p>
            <button
              type="button"
              onClick={() => setCreating(true)}
              className="mt-4 inline-flex h-11 items-center rounded-[var(--radius-sm)] border border-[var(--border-strong)] px-4 text-sm font-medium"
            >
              Create your first collection
            </button>
          </CardBody>
        </Card>
      ) : (
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-[280px_1fr]">
          <Card>
            <CardBody className="space-y-2">
              <h3 className="text-[13px] font-semibold">Saved lists</h3>
              {collections.map((collection) => {
                const count = collection.itemIds.length;
                const isActive = collection.id === selectedId;
                return (
                  <button
                    key={collection.id}
                    type="button"
                    onClick={() => {
                      setSelectedId(collection.id);
                      setActionError(null);
                    }}
                    className={`w-full rounded-[var(--radius-sm)] border px-3 py-3 text-left text-[13px] transition-colors ${
                      isActive
                        ? "border-[var(--border-strong)] bg-[var(--surface-2)]"
                        : "border-[var(--border)] hover:border-[var(--border-strong)]"
                    }`}
                  >
                    <div className="font-medium">{collection.name}</div>
                    <div className="mt-0.5 text-[12px] text-[var(--muted)]">
                      {count} item{count === 1 ? "" : "s"}
                    </div>
                  </button>
                );
              })}
            </CardBody>
          </Card>

          <Card>
            <CardBody>
              {!selected ? (
                <p className="text-[13px] text-[var(--muted)]">Select a collection to view.</p>
              ) : selectedRows.length === 0 ? (
                <div className="rounded-[var(--radius-sm)] border border-dashed border-[var(--border-strong)] p-6 text-center">
                  <p className="text-[13px] font-medium">No rated items left in this list.</p>
                  <p className="mt-1 text-[12px] text-[var(--muted)]">
                    Items disappear here if you have not rated them on this browser.
                  </p>
                  <button
                    type="button"
                    onClick={handleDeleteCollection}
                    className="mt-4 text-[12px] text-[var(--muted)] underline"
                  >
                    Remove empty collection
                  </button>
                </div>
              ) : (
                <>
                  <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <h3 className="text-[16px] font-semibold">{selected.name}</h3>
                      <p className="mt-1 text-[12px] text-[var(--muted)]">
                        {selectedRows.length} ranked item{selectedRows.length === 1 ? "" : "s"}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={handleDeleteCollection}
                      className="text-[12px] text-[var(--muted)] hover:text-[var(--foreground)]"
                    >
                      Delete
                    </button>
                  </div>

                  <ol className="divide-y divide-[var(--border)]">
                    {selectedRows.map((row, index) => (
                      <li
                        key={row.itemId}
                        className="flex flex-col gap-3 py-3 sm:flex-row sm:items-center"
                      >
                        <div className="flex min-w-0 flex-1 items-start gap-3">
                          <span className="mt-0.5 w-6 shrink-0 text-[12px] font-semibold tabular-nums text-[var(--muted)]">
                            #{row.rank}
                          </span>
                          <div className="min-w-0 flex-1">
                            <Link
                              href={`/d/${row.directorySlug}/${row.itemSlug}`}
                              className="block truncate text-sm font-medium hover:underline"
                            >
                              {row.itemName}
                            </Link>
                            <p className="text-[12px] text-[var(--muted)]">
                              Your avg {row.yourMean.toFixed(1)}/5 ·{" "}
                              <Link
                                href={`/d/${row.directorySlug}/${row.itemSlug}`}
                                className="underline"
                              >
                                Update ratings
                              </Link>
                            </p>
                          </div>
                        </div>
                        <div className="flex shrink-0 items-center gap-2 pl-9 sm:pl-0">
                          <button
                            type="button"
                            aria-label={`Move ${row.itemName} up`}
                            disabled={index === 0}
                            onClick={() => handleReorder(row.itemId, "up")}
                            className="inline-flex h-11 w-11 items-center justify-center rounded-[var(--radius-sm)] border border-[var(--border)] text-sm disabled:opacity-40"
                          >
                            ↑
                          </button>
                          <button
                            type="button"
                            aria-label={`Move ${row.itemName} down`}
                            disabled={index === selectedRows.length - 1}
                            onClick={() => handleReorder(row.itemId, "down")}
                            className="inline-flex h-11 w-11 items-center justify-center rounded-[var(--radius-sm)] border border-[var(--border)] text-sm disabled:opacity-40"
                          >
                            ↓
                          </button>
                          <button
                            type="button"
                            aria-label={`Remove ${row.itemName}`}
                            onClick={() => handleRemoveItem(row.itemId)}
                            className="inline-flex h-11 items-center rounded-[var(--radius-sm)] border border-[var(--border)] px-3 text-[12px]"
                          >
                            Remove
                          </button>
                        </div>
                      </li>
                    ))}
                  </ol>

                  {addableItems.length > 0 && (
                    <div className="mt-6 border-t border-[var(--border)] pt-4">
                      <p className="text-[13px] font-semibold">Add rated item</p>
                      <div className="mt-2 flex flex-wrap gap-2">
                        {addableItems.map((item) => (
                          <button
                            key={item.itemId}
                            type="button"
                            onClick={() => handleAddRatedItem(item.itemId)}
                            className="rounded-full border border-[var(--border)] bg-[var(--surface-2)] px-3 py-2 text-[12px] hover:border-[var(--border-strong)]"
                          >
                            + {item.itemName}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  {actionError && (
                    <p className="mt-4 text-[13px] text-red-600" role="alert">
                      {actionError}
                    </p>
                  )}
                </>
              )}
            </CardBody>
          </Card>
        </div>
      )}
    </section>
  );
}
