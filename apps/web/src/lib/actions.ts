"use server";

import { revalidatePath } from "next/cache";
import { rate } from "@/lib/ratings";
import { ensureVisitorId } from "@/lib/visitor";

export async function submitRating(input: {
  directorySlug: string;
  itemSlug: string;
  itemId: string;
  aspectId: string;
  score: number;
}) {
  const visitorId = await ensureVisitorId();
  await rate({
    itemId: input.itemId,
    aspectId: input.aspectId,
    visitorId,
    score: input.score,
  });
  revalidatePath(`/d/${input.directorySlug}/${input.itemSlug}`);
  revalidatePath(`/d/${input.directorySlug}`);
  revalidatePath("/");
}
