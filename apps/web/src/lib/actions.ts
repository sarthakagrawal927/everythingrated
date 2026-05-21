"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import {
  approveDirectorySubmission,
  rejectDirectorySubmission,
  submitDirectorySuggestion,
} from "@/lib/directory-submissions";
import { trackActivated, trackCoreAction } from "@/lib/analytics";
import { getModerationToken } from "@/lib/moderation";
import { countVisitorRatings, rate } from "@/lib/ratings";
import { ensureVisitorId } from "@/lib/visitor";

export async function submitRating(input: {
  directorySlug: string;
  itemSlug: string;
  itemId: string;
  aspectId: string;
  score: number;
}) {
  const visitorId = await ensureVisitorId();

  // Is this the visitor's first-ever rating? If so, the rating below also
  // counts as `activated` (first real product value). Checked before the
  // upsert so a re-rate of the same aspect doesn't re-trigger it.
  const priorRatings = await countVisitorRatings(visitorId);

  await rate({
    itemId: input.itemId,
    aspectId: input.aspectId,
    visitorId,
    score: input.score,
  });

  // Analytics — best-effort, never blocks the action.
  if (priorRatings === 0) {
    trackActivated(visitorId);
  }
  trackCoreAction("rating_submitted", visitorId);

  revalidatePath(`/d/${input.directorySlug}/${input.itemSlug}`);
  revalidatePath(`/d/${input.directorySlug}`);
  revalidatePath("/");
}

export type SubmitDirectoryState = {
  ok: boolean;
  message: string;
};

export async function submitDirectory(
  _prevState: SubmitDirectoryState,
  formData: FormData,
): Promise<SubmitDirectoryState> {
  const aspects = formData
    .getAll("aspectLabels")
    .map((value) => String(value));

  let result;
  try {
    result = await submitDirectorySuggestion({
      name: String(formData.get("name") ?? ""),
      description: String(formData.get("description") ?? ""),
      heroCopy: String(formData.get("heroCopy") ?? ""),
      aspectLabels: aspects,
      submitterName: String(formData.get("submitterName") ?? ""),
      submitterEmail: String(formData.get("submitterEmail") ?? ""),
    });
  } catch (error) {
    // A raw infra failure (e.g. D1 unavailable) — never blank the form.
    console.error("submitDirectory failed", error);
    return {
      ok: false,
      message:
        "Something went wrong saving your submission. Please try again in a moment.",
    };
  }

  if (!result.ok) {
    return { ok: false, message: result.error };
  }

  revalidatePath("/");
  return {
    ok: true,
    message: "Thanks. Your directory is queued for moderation.",
  };
}

export async function moderateDirectorySubmission(formData: FormData): Promise<void> {
  const token = String(formData.get("token") ?? "");
  const id = String(formData.get("id") ?? "");
  const intent = String(formData.get("intent") ?? "");
  const note = String(formData.get("note") ?? "");
  const expectedToken = await getModerationToken();
  const params = new URLSearchParams({ token });

  if (!expectedToken || token !== expectedToken) {
    params.set("error", "invalid-token");
    redirect(`/moderation?${params.toString()}`);
  }

  if (intent !== "approve" && intent !== "reject") {
    params.set("error", "invalid-action");
    redirect(`/moderation?${params.toString()}`);
  }

  const result =
    intent === "approve"
      ? await approveDirectorySubmission(id)
      : await rejectDirectorySubmission(id, note);

  if (result.ok) {
    params.set("moderated", intent === "approve" ? "approved" : "rejected");
    revalidatePath("/");
  } else {
    params.set("error", result.error);
  }

  revalidatePath("/moderation");
  redirect(`/moderation?${params.toString()}`);
}
