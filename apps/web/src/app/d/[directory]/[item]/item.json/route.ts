import { NextResponse } from "next/server";

import { getItemAggregate } from "@/lib/ratings";

export const dynamic = "force-dynamic";

/**
 * Public JSON for a single item — directory + item slug + every aspect's
 * average score and rater count. Lets external tools embed an item's
 * radar in their own UI without scraping the HTML page.
 */
export async function GET(
  _req: Request,
  ctx: { params: Promise<{ directory: string; item: string }> },
) {
  const { directory, item } = await ctx.params;
  const result = await getItemAggregate(directory, item, null);
  if (!result) return NextResponse.json({ error: "not_found" }, { status: 404 });

  return NextResponse.json(
    {
      directory: {
        slug: result.directory.slug,
        name: result.directory.name,
      },
      item: {
        slug: result.data.item.slug,
        name: result.data.item.name,
        description: result.data.item.description,
        websiteUrl: result.data.item.websiteUrl,
      },
      overall: result.data.overall,
      totalRaters: result.data.totalRaters,
      aspects: result.data.aspects.map((a) => ({
        key: a.aspect.key,
        label: a.aspect.label,
        avg: a.avg,
        count: a.count,
      })),
      generatedAt: new Date().toISOString(),
    },
    {
      headers: {
        "Cache-Control": "public, s-maxage=300, stale-while-revalidate=1200",
      },
    },
  );
}
