import {
  aspects,
  directories,
  directorySubmissions,
  type DirectorySubmission,
} from "@everythingrated/db";
import { and, desc, eq, ne } from "drizzle-orm";
import { getDb } from "./db";

const MAX_TEXT_LENGTH = 500;
const MAX_ASPECTS = 8;
const MIN_ASPECTS = 3;
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export type DirectorySubmissionStatus = "pending" | "approved" | "rejected";

export type DirectorySubmissionInput = {
  name: string;
  description: string;
  heroCopy: string;
  aspectLabels: string[];
  submitterName?: string;
  submitterEmail?: string;
};

export type DirectorySubmissionResult =
  | { ok: true; id: string }
  | { ok: false; error: string };

type DirectorySubmissionValidation =
  | { ok: true }
  | { ok: false; error: string };

export function slugifyDirectoryName(name: string): string {
  return name
    .trim()
    .toLowerCase()
    .replace(/['"]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60);
}

export function normalizeAspectLabels(labels: string[]): string[] {
  const seen = new Set<string>();
  return labels
    .map((label) => label.trim().replace(/\s+/g, " "))
    .filter((label) => {
      const key = label.toLowerCase();
      if (!label || seen.has(key)) return false;
      seen.add(key);
      return true;
    })
    .slice(0, MAX_ASPECTS);
}

export function validateDirectorySubmission(
  input: DirectorySubmissionInput,
): DirectorySubmissionValidation {
  const name = input.name.trim();
  const description = input.description.trim();
  const heroCopy = input.heroCopy.trim();
  const aspectLabels = normalizeAspectLabels(input.aspectLabels);

  if (name.length < 3) {
    return { ok: false, error: "Directory name must be at least 3 characters." };
  }
  if (description.length < 20) {
    return { ok: false, error: "Description must be at least 20 characters." };
  }
  if (heroCopy.length < 20) {
    return { ok: false, error: "Hero copy must be at least 20 characters." };
  }
  if ([name, description, heroCopy, ...aspectLabels].some((value) => value.length > MAX_TEXT_LENGTH)) {
    return { ok: false, error: "Keep each field under 500 characters." };
  }
  if (aspectLabels.length < MIN_ASPECTS) {
    return { ok: false, error: "Suggest at least 3 distinct rating aspects." };
  }

  const submitterEmail = input.submitterEmail?.trim();
  if (submitterEmail && !EMAIL_PATTERN.test(submitterEmail)) {
    return { ok: false, error: "Submitter email looks malformed." };
  }

  return { ok: true };
}

export async function submitDirectorySuggestion(
  input: DirectorySubmissionInput,
): Promise<DirectorySubmissionResult> {
  const validation = validateDirectorySubmission(input);
  if (!validation.ok) return validation;

  const db = await getDb();
  const name = input.name.trim();
  const slug = slugifyDirectoryName(name);
  if (!slug) {
    return { ok: false, error: "Directory name needs letters or numbers." };
  }

  const [existingDirectory] = await db
    .select({ id: directories.id })
    .from(directories)
    .where(eq(directories.slug, slug));
  if (existingDirectory) {
    return { ok: false, error: "That directory already exists." };
  }

  const [existingPending] = await db
    .select({ id: directorySubmissions.id })
    .from(directorySubmissions)
    .where(
      and(
        eq(directorySubmissions.slug, slug),
        ne(directorySubmissions.status, "rejected"),
      ),
    );
  if (existingPending) {
    return { ok: false, error: "That directory is already in the moderation queue." };
  }

  const id = crypto.randomUUID();
  await db.insert(directorySubmissions).values({
    id,
    slug,
    name,
    description: input.description.trim(),
    heroCopy: input.heroCopy.trim(),
    aspectLabels: JSON.stringify(normalizeAspectLabels(input.aspectLabels)),
    submitterName: input.submitterName?.trim() || null,
    submitterEmail: input.submitterEmail?.trim() || null,
    status: "pending",
  });

  return { ok: true, id };
}

export async function listDirectorySubmissions(
  status?: DirectorySubmissionStatus,
): Promise<DirectorySubmission[]> {
  const db = await getDb();
  const query = db
    .select()
    .from(directorySubmissions)
    .orderBy(desc(directorySubmissions.createdAt));

  if (!status) return query;
  return db
    .select()
    .from(directorySubmissions)
    .where(eq(directorySubmissions.status, status))
    .orderBy(desc(directorySubmissions.createdAt));
}

export function parseAspectLabels(submission: DirectorySubmission): string[] {
  try {
    const parsed = JSON.parse(submission.aspectLabels);
    if (!Array.isArray(parsed)) return [];
    return normalizeAspectLabels(parsed.filter((value) => typeof value === "string"));
  } catch {
    return [];
  }
}

export async function approveDirectorySubmission(
  id: string,
): Promise<DirectorySubmissionResult> {
  const db = await getDb();
  const [submission] = await db
    .select()
    .from(directorySubmissions)
    .where(eq(directorySubmissions.id, id));

  if (!submission) return { ok: false, error: "Submission not found." };
  if (submission.status !== "pending") {
    return { ok: false, error: "Only pending submissions can be approved." };
  }

  const aspectLabels = parseAspectLabels(submission);
  if (aspectLabels.length < MIN_ASPECTS) {
    return { ok: false, error: "Submission does not have enough valid aspects." };
  }

  const [existingDirectory] = await db
    .select({ id: directories.id })
    .from(directories)
    .where(eq(directories.slug, submission.slug));
  if (existingDirectory) {
    return { ok: false, error: "A directory with this slug already exists." };
  }

  const allDirectories = await db.select({ sortOrder: directories.sortOrder }).from(directories);
  const sortOrder =
    allDirectories.length === 0
      ? 0
      : Math.max(...allDirectories.map((directory) => directory.sortOrder)) + 1;
  const directoryId = crypto.randomUUID();
  const now = new Date();

  await db.insert(directories).values({
    id: directoryId,
    slug: submission.slug,
    name: submission.name,
    description: submission.description,
    heroCopy: submission.heroCopy,
    sortOrder,
  });

  const usedAspectKeys = new Set<string>();
  await db.insert(aspects).values(
    aspectLabels.map((label, index) => ({
      id: crypto.randomUUID(),
      directoryId,
      key: buildAspectKey(label, usedAspectKeys),
      label,
      description: `${label} score for ${submission.name}.`,
      sortOrder: index,
    })),
  );

  await db
    .update(directorySubmissions)
    .set({
      status: "approved",
      moderatorNote: "Approved into public directories.",
      moderatedAt: now,
    })
    .where(eq(directorySubmissions.id, id));

  return { ok: true, id: directoryId };
}

export async function rejectDirectorySubmission(
  id: string,
  note: string,
): Promise<DirectorySubmissionResult> {
  const db = await getDb();
  const [submission] = await db
    .select({ id: directorySubmissions.id, status: directorySubmissions.status })
    .from(directorySubmissions)
    .where(eq(directorySubmissions.id, id));

  if (!submission) return { ok: false, error: "Submission not found." };
  if (submission.status !== "pending") {
    return { ok: false, error: "Only pending submissions can be rejected." };
  }

  await db
    .update(directorySubmissions)
    .set({
      status: "rejected",
      moderatorNote: note.trim() || "Rejected by moderator.",
      moderatedAt: new Date(),
    })
    .where(eq(directorySubmissions.id, id));

  return { ok: true, id };
}

function buildAspectKey(label: string, usedKeys: Set<string>): string {
  const baseKey = slugifyDirectoryName(label).replace(/-/g, "_") || "aspect";
  let key = baseKey;
  let suffix = 2;

  while (usedKeys.has(key)) {
    key = `${baseKey}_${suffix}`;
    suffix += 1;
  }

  usedKeys.add(key);
  return key;
}
