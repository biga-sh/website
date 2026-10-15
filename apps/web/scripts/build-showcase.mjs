#!/usr/bin/env node
/**
 * Builds `src/lib/showcase/fixture.json`: a snapshot of the real biga CLI
 * repository (the sibling `cli/` checkout) in the shapes the session viewer
 * reads, so the landing page can render the actual viewer components without
 * a server, a stream or Monaco.
 *
 *   node scripts/build-showcase.mjs
 *
 * It records the tracked tree with real sizes and SHA-256 hashes, the text of
 * the few files the page shows (pre-highlighted with Shiki, light and dark,
 * the same two themes the viewer's editor defaults to; only the tokens are
 * kept, the panels are not interactive), and a short run of
 * checkpoints over those files. Commit the output; re-run it when the CLI
 * changes enough that the page should show something else.
 */
import { Buffer } from "node:buffer";
import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, extname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { createHighlighter } from "shiki";

const HERE = dirname(fileURLToPath(import.meta.url));
const CLI = resolve(HERE, "../../../../cli");
const OUT = resolve(HERE, "../src/lib/showcase/fixture.json");

const LIGHT = "github-light";
const DARK = "github-dark";

/** Files the page renders as code, with how many lines of each to keep tokens for. */
const SHOWN = [
  { path: "internal/ignore/filter.go", lines: 72 },
  { path: "internal/config/config.go", lines: 112 },
  { path: "internal/watch/batcher.go", lines: 90 },
  { path: "cmd/biga/main.go", lines: 40 },
  { path: "README.md", lines: 70 },
];

const LANG = { ".go": "go", ".md": "markdown", ".yaml": "yaml", ".yml": "yaml", ".json": "json" };

const sha256 = (buffer) => createHash("sha256").update(buffer).digest("hex");
const isBinary = (buffer) => buffer.subarray(0, 8000).includes(0);

const tracked = execFileSync("git", ["ls-files"], { cwd: CLI, encoding: "utf8" })
  .split("\n")
  .filter(Boolean);

/** @type {Map<string, {size:number, hash:string, binary:boolean, text:string|null}>} */
const files = new Map();
for (const path of tracked) {
  const bytes = readFileSync(resolve(CLI, path));
  const binary = isBinary(bytes);
  files.set(path, { size: bytes.length, hash: sha256(bytes), binary, text: binary ? null : bytes.toString("utf8") });
}

function insert(root, path, file) {
  const parts = path.split("/");
  let node = root;
  for (let i = 0; i < parts.length - 1; i++) {
    const dirPath = parts.slice(0, i + 1).join("/");
    let next = node.children.find((child) => child.type === "directory" && child.name === parts[i]);
    if (!next) {
      next = { type: "directory", name: parts[i], path: dirPath, children: [] };
      node.children.push(next);
    }
    node = next;
  }
  node.children.push({
    type: "file",
    name: parts.at(-1),
    path,
    size: file.size,
    hash: file.hash,
    ...(file.binary ? { binary: true } : {}),
  });
}

const tree = { type: "directory", name: "", path: "", children: [] };
for (const [path, file] of files) insert(tree, path, file);
// `/dist/` is where `make build` and GoReleaser write. The CLI lists such
// folders but never reads inside them, so the viewer shows an empty stub.
tree.children.push({ type: "directory", name: "dist", path: "dist", children: [], ignored: true });

const highlighter = await createHighlighter({ themes: [LIGHT, DARK], langs: ["go", "markdown", "yaml", "json"] });

const shown = SHOWN.map(({ path, lines }) => {
  const file = files.get(path);
  if (!file?.text) throw new Error(`${path} is not a tracked text file in ${CLI}`);
  const lang = LANG[extname(path)] ?? "text";
  const all = file.text.split("\n");
  const clipped = all.slice(0, lines).join("\n");
  const lined = highlighter.codeToTokensWithThemes(clipped, { lang, themes: { light: LIGHT, dark: DARK } });
  const tokens = lined.map((line) =>
    line.map((token) => [token.content, token.variants.light.color ?? "", token.variants.dark.color ?? ""])
  );
  return { path, lang, hash: file.hash, totalLines: all.length, tokens, text: file.text };
});

const fakeHash = (seed) => sha256(Buffer.from(seed));
const head = (path) => files.get(path).hash;

/** A short working session on the watcher and the config that feeds it. Newest first. */
const checkpoints = [
  {
    seq: 4,
    minutesAgo: 2,
    changes: [{ path: "README.md", changeType: "modified", additions: 9, deletions: 3 }],
  },
  {
    seq: 3,
    minutesAgo: 11,
    changes: [
      { path: "internal/ignore/filter.go", changeType: "modified", additions: 6, deletions: 2 },
      { path: "internal/ignore/ignore_test.go", changeType: "modified", additions: 14, deletions: 0 },
    ],
  },
  {
    seq: 2,
    minutesAgo: 19,
    changes: [
      { path: "internal/config/config.go", changeType: "modified", additions: 3, deletions: 1 },
      { path: "internal/config/config_test.go", changeType: "modified", additions: 8, deletions: 2 },
      { path: "internal/watch/batcher.go", changeType: "modified", additions: 5, deletions: 5 },
    ],
  },
  {
    seq: 1,
    minutesAgo: 27,
    changes: [{ path: "internal/watch/batcher.go", changeType: "modified", additions: 18, deletions: 4 }],
  },
].map((checkpoint) => ({
  ...checkpoint,
  changes: checkpoint.changes.map((change) => ({
    ...change,
    beforeHash: fakeHash(`${checkpoint.seq}:${change.path}:before`),
    afterHash: head(change.path),
  })),
}));

const initial = {
  seq: 0,
  minutesAgo: 34,
  label: "Initial snapshot",
  changes: [...files.keys()].map((path) => ({
    path,
    changeType: "added",
    additions: files.get(path).text ? files.get(path).text.split("\n").length : 0,
    deletions: 0,
    beforeHash: null,
    afterHash: head(path),
    ...(files.get(path).binary ? { binary: true } : {}),
  })),
};

const VERB = { added: "Added", modified: "Updated", deleted: "Deleted", renamed: "Renamed" };
const labelOf = (changes) => {
  const first = changes[0];
  const name = first.path.split("/").at(-1);
  return changes.length === 1 ? `${VERB[first.changeType]} ${name}` : `${VERB[first.changeType]} ${name} +${changes.length - 1} more`;
};

const all = [...checkpoints.map((c) => ({ ...c, label: labelOf(c.changes) })), initial].map((c) => ({
  seq: c.seq,
  label: c.label,
  minutesAgo: c.minutesAgo,
  filesChanged: c.changes.length,
  additions: c.changes.reduce((sum, change) => sum + change.additions, 0),
  deletions: c.changes.reduce((sum, change) => sum + change.deletions, 0),
  // The initial snapshot lists 60-odd files; the viewer never opens it.
  changes: c.seq === 0 ? [] : c.changes,
}));

const fixture = {
  generated: "build-showcase.mjs",
  session: { id: "k3f9zq2a", title: "biga" },
  stats: { files: files.size, bytes: [...files.values()].reduce((sum, file) => sum + file.size, 0) },
  tree,
  defaultFile: "internal/ignore/filter.go",
  shown: shown.map(({ path, lang, hash, totalLines, tokens }) => ({ path, lang, hash, totalLines, tokens })),
  checkpoints: all,
};

mkdirSync(dirname(OUT), { recursive: true });
writeFileSync(OUT, `${JSON.stringify(fixture)}\n`);
// The few numbers the server-rendered page needs, without the fixture's weight.
writeFileSync(
  resolve(dirname(OUT), "summary.json"),
  `${JSON.stringify({ session: fixture.session, stats: fixture.stats, defaultFile: fixture.defaultFile }, null, 2)}\n`
);
const kb = (Buffer.byteLength(JSON.stringify(fixture)) / 1024).toFixed(1);
console.log(`showcase fixture: ${files.size} files, ${shown.length} shown, ${all.length} checkpoints, ${kb} KB -> ${OUT}`);
