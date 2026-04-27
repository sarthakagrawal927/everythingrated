#!/usr/bin/env tsx
/**
 * Seed D1 — multi-directory.
 *
 * Generates a SQL file and executes it via wrangler.
 *
 *   pnpm tsx scripts/seed-d1.ts --local
 *   pnpm tsx scripts/seed-d1.ts --remote
 */

import { spawn } from "node:child_process";
import { writeFileSync, mkdirSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { randomUUID } from "node:crypto";

const __root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const TMP_DIR = resolve(__root, ".tmp");
const TMP_SQL = resolve(TMP_DIR, "seed.sql");
const flag = process.argv.includes("--remote") ? "--remote" : "--local";

const SEED_VISITOR = "seed-owner";

type Aspect = { key: string; label: string; description: string };
type Item = {
  slug: string;
  name: string;
  description: string;
  websiteUrl: string;
  scores: Record<string, number>;
};
type Directory = {
  slug: string;
  name: string;
  description: string;
  heroCopy: string;
  aspects: Aspect[];
  items: Item[];
};

const DIRECTORIES: Directory[] = [
  {
    slug: "ai-dev-tools",
    name: "AI dev tools",
    description: "Editors, agents, and assistants devs reach for daily.",
    heroCopy:
      "Speed, accuracy, cost, ergonomics, integration depth — see the trade-offs.",
    aspects: [
      { key: "speed", label: "Speed", description: "Latency and how fast it responds." },
      { key: "accuracy", label: "Accuracy", description: "Quality and correctness of suggestions." },
      { key: "cost", label: "Cost", description: "Value relative to price (5 = great deal)." },
      { key: "ergonomics", label: "Ergonomics", description: "How nice it feels to use day-to-day." },
      { key: "integration_depth", label: "Integration depth", description: "Editor, CLI, and tooling reach." },
    ],
    items: [
      {
        slug: "cursor",
        name: "Cursor",
        description: "AI-first fork of VS Code with composer-style edits and agent mode.",
        websiteUrl: "https://cursor.com",
        scores: { speed: 4, accuracy: 4, cost: 3, ergonomics: 5, integration_depth: 5 },
      },
      {
        slug: "claude-code",
        name: "Claude Code",
        description: "Anthropic's terminal-native coding agent with strong long-context reasoning.",
        websiteUrl: "https://claude.com/claude-code",
        scores: { speed: 4, accuracy: 5, cost: 3, ergonomics: 5, integration_depth: 4 },
      },
      {
        slug: "windsurf",
        name: "Windsurf",
        description: "Codeium's AI editor with Cascade agent and flow awareness.",
        websiteUrl: "https://windsurf.com",
        scores: { speed: 4, accuracy: 4, cost: 4, ergonomics: 4, integration_depth: 4 },
      },
      {
        slug: "github-copilot",
        name: "GitHub Copilot",
        description: "The original inline AI completion, now with chat and agent modes.",
        websiteUrl: "https://github.com/features/copilot",
        scores: { speed: 5, accuracy: 3, cost: 5, ergonomics: 4, integration_depth: 5 },
      },
      {
        slug: "aider",
        name: "Aider",
        description: "Open-source AI pair programmer in your terminal with git-aware edits.",
        websiteUrl: "https://aider.chat",
        scores: { speed: 4, accuracy: 4, cost: 4, ergonomics: 3, integration_depth: 3 },
      },
      {
        slug: "cline",
        name: "Cline",
        description: "Autonomous coding agent for VS Code with planning and approval flows.",
        websiteUrl: "https://cline.bot",
        scores: { speed: 3, accuracy: 4, cost: 3, ergonomics: 4, integration_depth: 3 },
      },
      {
        slug: "continue",
        name: "Continue",
        description:
          "Open-source AI coding assistant for VS Code and JetBrains; bring-your-own-model.",
        websiteUrl: "https://continue.dev",
        scores: { speed: 4, accuracy: 3, cost: 5, ergonomics: 4, integration_depth: 4 },
      },
      {
        slug: "codeium",
        name: "Codeium",
        description: "Free-tier AI completion + chat across 70+ languages and many editors.",
        websiteUrl: "https://codeium.com",
        scores: { speed: 5, accuracy: 3, cost: 5, ergonomics: 4, integration_depth: 5 },
      },
      {
        slug: "tabnine",
        name: "Tabnine",
        description: "Privacy-focused AI completion with local and self-hosted models.",
        websiteUrl: "https://tabnine.com",
        scores: { speed: 4, accuracy: 3, cost: 4, ergonomics: 3, integration_depth: 4 },
      },
      {
        slug: "sourcegraph-cody",
        name: "Sourcegraph Cody",
        description: "Codebase-aware AI assistant grounded in Sourcegraph's code graph.",
        websiteUrl: "https://sourcegraph.com/cody",
        scores: { speed: 3, accuracy: 4, cost: 3, ergonomics: 3, integration_depth: 4 },
      },
    ],
  },
  {
    slug: "databases",
    name: "Databases",
    description: "Managed and serverless data stores for app builders.",
    heroCopy: "Latency, durability, cost, DX, ecosystem — pick what fits the workload.",
    aspects: [
      { key: "latency", label: "Latency", description: "P50 read/write performance under typical load." },
      { key: "durability", label: "Durability", description: "Data integrity guarantees and replication strength." },
      { key: "cost", label: "Cost", description: "Pricing relative to what you get (5 = great deal)." },
      { key: "dx", label: "Developer experience", description: "Schema, migrations, tooling, debuggability." },
      { key: "ecosystem", label: "Ecosystem", description: "Drivers, ORMs, framework integrations." },
    ],
    items: [
      {
        slug: "turso",
        name: "Turso",
        description: "Edge-replicated SQLite (libSQL) with embedded replicas.",
        websiteUrl: "https://turso.tech",
        scores: { latency: 5, durability: 4, cost: 5, dx: 4, ecosystem: 3 },
      },
      {
        slug: "cloudflare-d1",
        name: "Cloudflare D1",
        description: "Serverless SQLite native to Cloudflare Workers.",
        websiteUrl: "https://developers.cloudflare.com/d1",
        scores: { latency: 4, durability: 4, cost: 5, dx: 4, ecosystem: 4 },
      },
      {
        slug: "neon",
        name: "Neon",
        description: "Serverless Postgres with branching and scale-to-zero.",
        websiteUrl: "https://neon.tech",
        scores: { latency: 4, durability: 5, cost: 4, dx: 5, ecosystem: 5 },
      },
      {
        slug: "planetscale",
        name: "PlanetScale",
        description: "MySQL-compatible Vitess platform with safe schema changes.",
        websiteUrl: "https://planetscale.com",
        scores: { latency: 4, durability: 5, cost: 3, dx: 4, ecosystem: 5 },
      },
      {
        slug: "fauna",
        name: "Fauna",
        description: "Distributed transactional document-relational DB.",
        websiteUrl: "https://fauna.com",
        scores: { latency: 3, durability: 5, cost: 3, dx: 3, ecosystem: 3 },
      },
    ],
  },
  {
    slug: "hosting",
    name: "Hosting",
    description: "Edge and serverless platforms for shipping apps.",
    heroCopy: "Cold start, cost, DX, regions, free-tier — what'll actually serve your users?",
    aspects: [
      { key: "cold_start", label: "Cold start", description: "Time-to-first-byte on a fresh request." },
      { key: "cost", label: "Cost", description: "Pricing relative to what you get." },
      { key: "dx", label: "Developer experience", description: "CLI, dashboards, deploy ergonomics." },
      { key: "regions", label: "Regions", description: "Geographic reach and edge presence." },
      { key: "free_tier", label: "Free tier", description: "What you can ship without a credit card." },
    ],
    items: [
      {
        slug: "cloudflare-workers",
        name: "Cloudflare Workers",
        description: "V8 isolates at the edge across 300+ cities.",
        websiteUrl: "https://workers.cloudflare.com",
        scores: { cold_start: 5, cost: 5, dx: 4, regions: 5, free_tier: 5 },
      },
      {
        slug: "vercel",
        name: "Vercel",
        description: "Frontend cloud built around Next.js.",
        websiteUrl: "https://vercel.com",
        scores: { cold_start: 4, cost: 3, dx: 5, regions: 5, free_tier: 4 },
      },
      {
        slug: "netlify",
        name: "Netlify",
        description: "Static + functions platform with strong git workflows.",
        websiteUrl: "https://netlify.com",
        scores: { cold_start: 4, cost: 3, dx: 4, regions: 4, free_tier: 4 },
      },
      {
        slug: "fly-io",
        name: "Fly.io",
        description: "Run full apps in micro-VMs near users.",
        websiteUrl: "https://fly.io",
        scores: { cold_start: 3, cost: 4, dx: 4, regions: 5, free_tier: 3 },
      },
      {
        slug: "railway",
        name: "Railway",
        description: "Heroku-like platform with great DX for full-stack apps.",
        websiteUrl: "https://railway.app",
        scores: { cold_start: 3, cost: 3, dx: 5, regions: 3, free_tier: 2 },
      },
    ],
  },
];

function esc(s: string): string {
  return `'${s.replace(/'/g, "''")}'`;
}

function buildSql(): string {
  const out: string[] = [];
  const now = Date.now();

  DIRECTORIES.forEach((dir, dirIdx) => {
    const dirId = randomUUID();
    out.push(
      `INSERT INTO directories (id, slug, name, description, hero_copy, sort_order, created_at) VALUES (${esc(dirId)}, ${esc(dir.slug)}, ${esc(dir.name)}, ${esc(dir.description)}, ${esc(dir.heroCopy)}, ${dirIdx}, ${now}) ON CONFLICT(slug) DO UPDATE SET name=excluded.name, description=excluded.description, hero_copy=excluded.hero_copy, sort_order=excluded.sort_order;`,
    );

    // Aspects scoped to directory
    dir.aspects.forEach((a, i) => {
      const aspectId = randomUUID();
      out.push(
        `INSERT INTO aspects (id, directory_id, key, label, description, sort_order) SELECT ${esc(aspectId)}, directories.id, ${esc(a.key)}, ${esc(a.label)}, ${esc(a.description)}, ${i} FROM directories WHERE directories.slug = ${esc(dir.slug)} ON CONFLICT(directory_id, key) DO UPDATE SET label=excluded.label, description=excluded.description, sort_order=excluded.sort_order;`,
      );
    });

    // Items + ratings
    for (const it of dir.items) {
      const itemId = randomUUID();
      out.push(
        `INSERT INTO items (id, directory_id, slug, name, description, website_url, logo_url, created_at) SELECT ${esc(itemId)}, directories.id, ${esc(it.slug)}, ${esc(it.name)}, ${esc(it.description)}, ${esc(it.websiteUrl)}, NULL, ${now} FROM directories WHERE directories.slug = ${esc(dir.slug)} ON CONFLICT(directory_id, slug) DO UPDATE SET name=excluded.name, description=excluded.description, website_url=excluded.website_url;`,
      );

      for (const [key, score] of Object.entries(it.scores)) {
        const ratingId = randomUUID();
        out.push(
          `INSERT INTO ratings (id, item_id, aspect_id, visitor_id, score, created_at) SELECT ${esc(ratingId)}, items.id, aspects.id, ${esc(SEED_VISITOR)}, ${score}, ${now} FROM items, aspects, directories WHERE directories.slug = ${esc(dir.slug)} AND items.slug = ${esc(it.slug)} AND items.directory_id = directories.id AND aspects.key = ${esc(key)} AND aspects.directory_id = directories.id ON CONFLICT(item_id, aspect_id, visitor_id) DO UPDATE SET score=excluded.score;`,
        );
      }
    }
  });

  return out.join("\n") + "\n";
}

function run() {
  const sql = buildSql();
  mkdirSync(TMP_DIR, { recursive: true });
  writeFileSync(TMP_SQL, sql);
  console.log(`[seed] wrote ${TMP_SQL} (${sql.split("\n").length - 1} statements)`);

  const args = [
    "d1",
    "execute",
    "everythingrated-db",
    flag,
    `--file=${TMP_SQL}`,
    "--config=apps/web/wrangler.toml",
  ];
  console.log(`[seed] wrangler ${args.join(" ")}`);
  const proc = spawn("wrangler", args, { stdio: "inherit", cwd: __root });
  proc.on("close", (code) => process.exit(code ?? 0));
}

run();
