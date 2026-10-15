/**
 * Single source of demo data for the landing page. Every value here is
 * either a literal fact about Spire (a real flag, a real default, a real
 * file in this repository) or clearly a representative sample of one. None
 * of it is wired to a live session: the one real thing on the page is the
 * embedded viewer in the demo section, which plays back an actual recorded
 * broadcast of this repository (see `DEMO_SESSION_ID`).
 */

export type Shell = "bash" | "powershell";

export const SHELLS: { id: Shell; label: string }[] = [
  { id: "bash", label: "bash / zsh" },
  { id: "powershell", label: "PowerShell" },
];

/**
 * The CLI defaults to `http://localhost:3000` (`SPIRE_API_URL`, unset).
 * Pointing it at this site is what makes the printed link one anyone can
 * open, so it's part of the primary command rather than a self-hosting
 * footnote.
 */
export function installCommand(shell: Shell, siteUrl: string): string {
  if (shell === "powershell") {
    return `$env:SPIRE_API_URL="${siteUrl}"; npx @zenshilabs/spire start`;
  }
  return `SPIRE_API_URL=${siteUrl} npx @zenshilabs/spire start`;
}

// ---------------------------------------------------------------------------
// Hero flow: files that "save" when a visitor interacts with a file node.

export const HERO_FILES = [
  "checkpoint-batcher.ts",
  "hash-registry.ts",
  "client.ts",
] as const;

// ---------------------------------------------------------------------------
// Demo terminal: a scripted, labelled re-enactment of a real `spire start`
// run, broadcasting this repository. Line text and ordering match the CLI's
// actual `@clack/prompts` output (intro → spinner → Started/Watch/Share →
// spinner-stop → Watching → Synced checkpoint lines → Ctrl+C → stopped →
// outro), not an invented transcript.

export type TermTone = "rail" | "accent" | "foreground" | "muted";
export type TermLine = { glyph: string; tone: TermTone; text: string };

export function demoTypedCommands(siteUrl: string): [string, string] {
  return [`export SPIRE_API_URL=${siteUrl}`, "npx @zenshilabs/spire start ."];
}

/**
 * Verbatim `@clack/prompts` formatting, as a real `spire start` run actually
 * prints it: a blank rail line before every logged line, Started/Watch/Share
 * ahead of the spinner-stop `◇` line, then Watching and the synced-checkpoint
 * lines. Only the directory, session id and file names are this repository's
 * own; the shape and order are the CLI's.
 */
export function demoOutputLines(shareUrl: string): TermLine[] {
  return [
    { glyph: "│", tone: "rail", text: "" },
    { glyph: "◆", tone: "accent", text: "Started heczlzfa." },
    { glyph: "│", tone: "rail", text: "" },
    { glyph: "●", tone: "muted", text: "Watch /Users/you/spire" },
    { glyph: "│", tone: "rail", text: "" },
    { glyph: "●", tone: "muted", text: `Share: ${shareUrl}` },
    { glyph: "◇", tone: "accent", text: `spire → ${shareUrl}` },
    { glyph: "│", tone: "rail", text: "" },
    { glyph: "●", tone: "muted", text: "Watching for changes. Press Ctrl+C to stop." },
    { glyph: "│", tone: "rail", text: "" },
    { glyph: "│", tone: "rail", text: "Synced checkpoint #1 (checkpoint-batcher.ts)" },
    { glyph: "│", tone: "rail", text: "" },
    { glyph: "│", tone: "rail", text: "Synced checkpoint #2 (2 files)" },
  ];
}

export const DEMO_INTRO_LINE: TermLine = { glyph: "┌", tone: "rail", text: "Spire CLI" };

export const DEMO_SHUTDOWN_LINES: TermLine[] = [
  { glyph: "◆", tone: "accent", text: "Session heczlzfa stopped." },
  { glyph: "│", tone: "rail", text: "" },
  { glyph: "└", tone: "rail", text: "Done" },
];

// ---------------------------------------------------------------------------
// Checkpoint explorer: a representative slice of this repository's own
// broadcast history. Hashes are shown git-short-style (7 hex characters),
// the same convention as a commit hash, not a claim of precision.

export type CheckpointChange = {
  path: string;
  kind: "added" | "modified" | "deleted";
  additions: number;
  deletions: number;
  hash: string;
};

export type CheckpointFixture = {
  seq: number;
  live?: boolean;
  createdAgo: string;
  changes: CheckpointChange[];
  unchanged: number;
};

export const CHECKPOINTS: CheckpointFixture[] = [
  {
    seq: 14,
    live: true,
    createdAgo: "now",
    changes: [
      { path: "src/watcher/checkpoint-batcher.ts", kind: "modified", additions: 6, deletions: 2, hash: "a1c7f92" },
    ],
    unchanged: 211,
  },
  {
    seq: 13,
    createdAgo: "4m ago",
    changes: [
      { path: "src/watcher/hash-registry.ts", kind: "modified", additions: 11, deletions: 3, hash: "7e2d410" },
      { path: "src/api/client.ts", kind: "modified", additions: 4, deletions: 4, hash: "0fb6c88" },
    ],
    unchanged: 210,
  },
  {
    seq: 12,
    createdAgo: "9m ago",
    changes: [
      { path: "src/diff/payload-validator.ts", kind: "added", additions: 38, deletions: 0, hash: "5a93de1" },
    ],
    unchanged: 211,
  },
  {
    seq: 11,
    createdAgo: "22m ago",
    changes: [
      { path: "src/session/rejoin.ts", kind: "modified", additions: 2, deletions: 9, hash: "c410b7a" },
    ],
    unchanged: 210,
  },
];

// ---------------------------------------------------------------------------
// Boundary diagram: what crosses the line between "your machine" and the
// link, for files actually present in this repository.

export type BoundaryState = "sent" | "ignored" | "listed" | "oversize";

export const BOUNDARY_ROWS: { path: string; state: BoundaryState; note: string }[] = [
  { path: "src/watcher/checkpoint-batcher.ts", state: "sent", note: "text, hashed and sent" },
  { path: ".env", state: "ignored", note: "ignored by default" },
  { path: ".env.local", state: "ignored", note: "ignored by default" },
  { path: "node_modules/", state: "ignored", note: "ignored by default" },
  { path: "dist/", state: "listed", note: "listed, contents skipped" },
  { path: "spire-mark.svg", state: "listed", note: "listed, bytes stay local" },
  { path: "dump.sql", state: "oversize", note: "3.4 MB, over the 2 MB limit" },
];

// ---------------------------------------------------------------------------
// Workspaces: a real spire.json shape, and what `spire start` does with it.

export const WORKSPACE_CONFIG = {
  projects: [
    { dir: "./apps/api", title: "API" },
    { dir: "./apps/web", title: "Web" },
  ],
} as const;

export const WORKSPACE_PROJECTS = WORKSPACE_CONFIG.projects;

export function workspaceShareUrl(siteUrl: string, slug: string) {
  return `${siteUrl}/session/${slug}`;
}

/** Each workspace project starts its own session with its own sticky id;
    these slugs match the `list` / `status` sample output below. */
export const WORKSPACE_SESSIONS = [
  { title: "API", slug: "9f1k3lam", live: true },
  { title: "Web", slug: "7bq2wted", live: false },
] as const;

export const LIST_OUTPUT = [
  "2 sessions:",
  "● live  API",
  "        ./apps/api",
  "        {url}/session/9f1k3lam",
  "○ dead  Web",
  "        ./apps/web",
  "        {url}/session/7bq2wted",
];

export const STATUS_OUTPUT = [
  "Session: 9f1k3lam",
  "Title: API",
  "Root: ./apps/api",
  "Status: live",
  "Share URL: {url}/session/9f1k3lam",
  "Checkpoints synced: 14",
  "Started at: 2026-10-01T09:14:02.000Z",
];

export const STOP_OUTPUT = ["Stopping API (9f1k3lam)…", "Stopped API.", "Stopping Web (7bq2wted)…", "Stopped Web."];

// ---------------------------------------------------------------------------
// Under-the-hood: real timing, limits and runtime facts, each with the env
// var that controls it where one exists.

export const SPEC_GROUPS: {
  title: string;
  specs: { label: string; value: string; note: string }[];
}[] = [
  {
    title: "Batching",
    specs: [
      { label: "Idle flush", value: "120 ms", note: "SPIRE_IDLE_MS" },
      { label: "Max wait", value: "1000 ms", note: "SPIRE_MAX_WAIT_MS" },
      { label: "Write stability", value: "75 ms", note: "SPIRE_STABILITY_MS" },
    ],
  },
  {
    title: "Storage",
    specs: [
      { label: "Hash", value: "SHA-256", note: "per file, deduplicated per session" },
      { label: "At rest", value: "Brotli, q5", note: "kept only if smaller than raw" },
      { label: "File size limit", value: "2 MB", note: "larger files are listed, not read" },
    ],
  },
  {
    title: "Runtime",
    specs: [
      { label: "CLI dependencies", value: "3", note: "@clack/prompts, chokidar, ignore" },
      { label: "Node", value: ">= 22", note: "active LTS" },
      { label: "Heartbeat", value: "10 s", note: "SPIRE_HEARTBEAT_MS" },
    ],
  },
];

// ---------------------------------------------------------------------------
// Architecture diagram: the real request path, from the README's own
// architecture diagram.

export type ArchNodeId =
  | "cli"
  | "api"
  | "postgres"
  | "redis"
  | "viewer";

export type ArchNode = {
  id: ArchNodeId;
  label: string;
  sublabel: string;
  description: string;
  x: number;
  y: number;
};

export const ARCH_NODES: ArchNode[] = [
  {
    id: "cli",
    label: "CLI",
    sublabel: "@zenshilabs/spire",
    description: "Watches your directory and posts snapshots and checkpoints.",
    x: 8,
    y: 50,
  },
  {
    id: "api",
    label: "API",
    sublabel: "Next.js route handlers",
    description: "Validates, rate-limits and stores each upload, then fans it out over SSE.",
    x: 38,
    y: 50,
  },
  {
    id: "postgres",
    label: "Postgres",
    sublabel: "required",
    description: "Sessions, checkpoints and content-addressed blobs.",
    x: 64,
    y: 22,
  },
  {
    id: "redis",
    label: "Redis",
    sublabel: "optional",
    description: "Cross-instance pub/sub, a read-through cache, and the checkpoint sequence counter.",
    x: 64,
    y: 78,
  },
  {
    id: "viewer",
    label: "Viewer",
    sublabel: "browser, read-only",
    description: "Opens /session/:id, hydrates from a REST call, then stays live over SSE.",
    x: 92,
    y: 50,
  },
];

export const ARCH_EDGES: [ArchNodeId, ArchNodeId][] = [
  ["cli", "api"],
  ["api", "postgres"],
  ["api", "redis"],
  ["postgres", "viewer"],
  ["redis", "viewer"],
  ["api", "viewer"],
];
