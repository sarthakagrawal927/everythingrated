import { listDirectories } from "@/lib/ratings";

export const dynamic = "force-dynamic";

/** Public JSON listing of all directories + counts. */
export async function GET() {
  let directories: Awaited<ReturnType<typeof listDirectories>> = [];
  try {
    directories = await listDirectories();
  } catch {
    /* DB offline — return empty list. */
  }

  return new Response(
    JSON.stringify({ generatedAt: new Date().toISOString(), directories }),
    {
      status: 200,
      headers: {
        "Content-Type": "application/json; charset=utf-8",
        "Cache-Control": "public, s-maxage=300, stale-while-revalidate=600",
      },
    },
  );
}
