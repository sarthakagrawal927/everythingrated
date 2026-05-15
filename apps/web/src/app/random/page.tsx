"use client";

import { useEffect, useState } from "react";

interface DirectoryEntry {
  directory: { slug: string };
}

/**
 * /random — bounces to a random item from a random directory. Uses the
 * public /directories.json + /d/[slug]/items.json endpoints so there's no
 * server-side coupling.
 */
export default function RandomItemAcrossDirectories() {
  const [msg, setMsg] = useState("Picking a random item…");

  useEffect(() => {
    let aborted = false;
    fetch("/directories.json", { cache: "no-store" })
      .then((r) => (r.ok ? r.json() : Promise.reject(r.status)))
      .then(async (data: unknown) => {
        if (aborted) return;
        const dirs =
          data && typeof data === "object" && "directories" in data &&
          Array.isArray((data as { directories: unknown }).directories)
            ? ((data as { directories: DirectoryEntry[] }).directories)
            : [];
        if (dirs.length === 0) {
          setMsg("No directories yet.");
          return;
        }
        const pickedDir = dirs[Math.floor(Math.random() * dirs.length)]!;
        const slug = pickedDir.directory.slug;
        const itemsRes = await fetch(`/d/${slug}/items.json`, { cache: "no-store" });
        if (!itemsRes.ok) {
          setMsg("Could not load directory items.");
          return;
        }
        const itemsData: unknown = await itemsRes.json();
        const items =
          itemsData && typeof itemsData === "object" && "items" in itemsData &&
          Array.isArray((itemsData as { items: unknown }).items)
            ? ((itemsData as { items: Array<{ item: { slug: string } }> }).items)
            : [];
        if (items.length === 0) {
          // Try a different directory if this one is empty.
          window.location.replace("/");
          return;
        }
        const pickedItem = items[Math.floor(Math.random() * items.length)]!;
        window.location.replace(`/d/${slug}/${pickedItem.item.slug}`);
      })
      .catch(() => {
        if (!aborted) setMsg("Could not reach the catalog.");
      });
    return () => {
      aborted = true;
    };
  }, []);

  return (
    <main className="mx-auto max-w-md px-6 py-24 text-center">
      <p className="text-sm text-[var(--muted)]">{msg}</p>
    </main>
  );
}
