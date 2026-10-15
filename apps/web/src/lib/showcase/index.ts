import { useEditorStore } from "@spire/stores/editor-store";
import { useFileTreeStore } from "@spire/stores/file-tree-store";
import { useHistoryStore } from "@spire/stores/history-store";
import { useSessionStore } from "@spire/stores/session-store";
import type { Checkpoint, CheckpointChange, CheckpointSummary, FileNode, SessionResponse } from "@spire/types";

import { decorationsFromChanges } from "@/lib/use-session-stream";

/*
 * The landing page shows the real session viewer, fed from a committed
 * snapshot of this project's own CLI repository (`scripts/build-showcase.mjs`)
 * instead of a server. The viewer's components read the same Zustand stores
 * they always do; this module fills those stores, and empties them again when
 * the landing page goes away so the real viewer never starts from fixture data.
 */

/** One highlighted run of text: content, then its light and dark colours. */
export type ShowcaseToken = [text: string, light: string, dark: string];

export type ShowcaseFile = {
  path: string;
  lang: string;
  hash: string;
  totalLines: number;
  tokens: ShowcaseToken[][];
};

type RawChange = Omit<CheckpointChange, "beforeHash" | "afterHash"> & {
  beforeHash: string | null;
  afterHash: string | null;
};

export type ShowcaseFixture = {
  session: { id: string; title: string };
  stats: { files: number; bytes: number };
  tree: FileNode;
  defaultFile: string;
  shown: ShowcaseFile[];
  checkpoints: {
    seq: number;
    label: string;
    minutesAgo: number;
    filesChanged: number;
    additions: number;
    deletions: number;
    changes: RawChange[];
  }[];
};

let loading: Promise<ShowcaseFixture> | null = null;

/** The fixture, fetched as its own chunk the first time something needs it. */
export function loadShowcase(): Promise<ShowcaseFixture> {
  loading ??= import("./fixture.json").then((module) => module.default as unknown as ShowcaseFixture);
  return loading;
}

/** The file the demo edits, and the line and token the edit lands on. */
export const DEMO_FILE = "internal/config/config.go";
export const DEMO_LINE = 80;

export type ShowcaseState = {
  /** Whether the broadcast is still running. */
  status: "active" | "ended";
  /** How many extra saves, beyond the recorded session, to have landed. */
  saves?: number;
};

const NOW = () => Date.now();

function checkpointOf(fixture: ShowcaseFixture, seq: number, now: number): Checkpoint {
  const raw = fixture.checkpoints.find((checkpoint) => checkpoint.seq === seq);
  if (!raw) throw new Error(`no checkpoint ${seq} in the showcase fixture`);
  return {
    sessionId: fixture.session.id,
    seq: raw.seq,
    label: raw.label,
    createdAt: new Date(now - raw.minutesAgo * 60_000).toISOString(),
    filesChanged: raw.filesChanged,
    additions: raw.additions,
    deletions: raw.deletions,
    changes: raw.changes,
  };
}

function summaryOf(checkpoint: Checkpoint): CheckpointSummary {
  const { sessionId, seq, label, createdAt, filesChanged, additions, deletions } = checkpoint;
  return { sessionId, seq, label, createdAt, filesChanged, additions, deletions };
}

/** A hash-shaped string for a save made on the page: stable, not cryptographic. */
function pseudoHash(seed: string): string {
  let state = 0x811c9dc5;
  let out = "";
  for (let i = 0; out.length < 64; i++) {
    state = Math.imul(state ^ (seed.charCodeAt(i % seed.length) + i), 0x01000193) >>> 0;
    out += state.toString(16).padStart(8, "0");
  }
  return out.slice(0, 64);
}

/** Puts the showcase session into the viewer's stores. Idempotent: it replaces what's there. */
export function seedShowcase(fixture: ShowcaseFixture, { status, saves = 0 }: ShowcaseState): void {
  const now = NOW();
  const session: SessionResponse = {
    id: fixture.session.id,
    title: fixture.session.title,
    description: null,
    status,
    createdAt: new Date(now - 34 * 60_000).toISOString(),
    updatedAt: new Date(now).toISOString(),
    endedAt: status === "ended" ? new Date(now).toISOString() : null,
  };

  const recorded = fixture.checkpoints.map((checkpoint) => checkpointOf(fixture, checkpoint.seq, now));
  const newest = Math.max(...recorded.map((checkpoint) => checkpoint.seq));
  const extra: Checkpoint[] = Array.from({ length: saves }, (_, i) => {
    const seq = newest + 1 + i;
    const before = i === 0 ? fixture.shown.find((file) => file.path === DEMO_FILE)?.hash : null;
    return {
      sessionId: fixture.session.id,
      seq,
      label: "Updated config.go",
      createdAt: new Date(now - (saves - i - 1) * 30_000).toISOString(),
      filesChanged: 1,
      additions: 1,
      deletions: 1,
      changes: [
        {
          path: DEMO_FILE,
          changeType: "modified",
          beforeHash: before ?? pseudoHash(`before:${seq}`),
          afterHash: pseudoHash(`after:${seq}`),
          additions: 1,
          deletions: 1,
        },
      ],
    };
  });
  const all = [...recorded, ...extra];
  const latest = all.reduce((a, b) => (b.seq > a.seq ? b : a));

  useSessionStore.getState().setSession(session);
  useSessionStore.getState().setLoadMode("lazy");

  const history = useHistoryStore.getState();
  history.setInitial(all.map(summaryOf));
  for (const checkpoint of all) history.cacheCheckpoint(checkpoint);
  history.selectSeq(latest.seq);

  const tree = useFileTreeStore.getState();
  tree.setTree(fixture.tree);
  tree.setDecorations(decorationsFromChanges(latest.changes));
  // Two tabs, the one being edited active, as a real session would have them.
  const open = DEMO_FILE;
  tree.expandAncestors(fixture.defaultFile);
  tree.expandAncestors(open);
  tree.setSelectedPath(open);

  const editor = useEditorStore.getState();
  editor.clearAll();
  editor.openFile(fixture.defaultFile);
  editor.openFile(open);
}

/** Empties every store the showcase filled, but only if the showcase still owns them. */
export function clearShowcase(fixture: ShowcaseFixture | null): void {
  if (fixture && useSessionStore.getState().sessionId !== fixture.session.id) return;
  useSessionStore.getState().clearSession();
  useHistoryStore.getState().clear();
  useFileTreeStore.getState().clearTree();
  useEditorStore.getState().clearAll();
}
