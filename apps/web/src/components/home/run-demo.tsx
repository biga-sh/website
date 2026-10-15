"use client";

import { ArrowLeftIcon, ArrowRightIcon, RotateCwIcon } from "lucide-react";
import { type KeyboardEvent, type ReactNode, useCallback, useEffect, useMemo, useState } from "react";

import { Scaled } from "@/components/showcase/scaled";
import { ShowcaseProvider, useShowcase } from "@/components/showcase/showcase-provider";
import { PanelCode, PanelFiles, PanelHeader, PanelTimeline } from "@/components/showcase/viewer-panels";
import { Autopilot, type AutopilotChapter } from "@/components/ui/autopilot";
import { DEMO_FILE, DEMO_LINE } from "@/lib/showcase";
import { humanBytes, SHOWCASE } from "@/lib/showcase/summary";
import { cn } from "@/lib/utils";

/*
 * A working miniature of a biga session, driven by Autopilot. Everything a
 * cursor does goes through the same handlers a visitor's clicks and keys do,
 * so once the cursor steps aside the demo is fully usable:
 *
 *   terminal   type `biga start`; while it runs, c / o / q copy the link,
 *              open it and stop (the real CLI's keys)
 *   editor     change the number on line 80 and press Save (or ⌘S / Ctrl+S)
 *   browser    paste the link in the address bar and press Enter
 *
 * It is this project's own CLI. The editor shows `internal/config/config.go`
 * as it is on disk, the terminal prints what the Go CLI prints (see
 * `cli/internal/ui`), and the browser is the real viewer reading a snapshot of
 * that repository: a save adds a checkpoint to the real timeline and a
 * modified mark to the real file tree.
 *
 * The model follows the CLI's documented behaviour: a save that changes
 * nothing sends nothing, and running `biga start` again rejoins the same
 * session and uploads only what changed while it was stopped.
 */

const SESSION = SHOWCASE.session.id;
const TITLE = SHOWCASE.session.title;
const NAME = `${TITLE} (${SESSION})`;
const FILES = SHOWCASE.stats.files;
const UPLOADED = humanBytes(SHOWCASE.stats.bytes);
const BASE = "120";
/** One changed file, gzipped, as the live panel's "sent" total counts it. */
const SAVE_BYTES = 1126;

/** The editor shows these lines of the file, so line 80 sits in the middle. */
const EDITOR_FIRST = 73;
const EDITOR_LAST = 87;
/** The editor's design size: wide enough for line 80 (63 columns, tabs at two) in full. */
const EDITOR_W = 540;
const EDITOR_H = 15 * 21.25 + 24;

type Status = "idle" | "live" | "stopped";
type Line = { id: number; text: ReactNode; tone?: "muted" | "error" };
type Feed = { id: number; time: string; path: string };

type State = {
  shell: string;
  status: Status;
  history: Line[];
  /** The line under the frame: how this run began. */
  started: string | null;
  feed: Feed[];
  /** Checkpoints sent since `biga start`, and the files and bytes in them. */
  checkpoints: number;
  files: number;
  sentBytes: number;
  /** Checkpoints the viewer shows beyond the recorded session. */
  saves: number;
  value: string;
  saved: string;
  sent: string;
  copied: boolean;
  address: string;
  open: boolean;
  missing: boolean;
};

const INITIAL: State = {
  shell: "",
  status: "idle",
  history: [],
  started: null,
  feed: [],
  checkpoints: 0,
  files: 0,
  sentBytes: 0,
  saves: 0,
  value: BASE,
  saved: BASE,
  sent: BASE,
  copied: false,
  address: "",
  open: false,
  missing: false,
};

let lineId = 0;
const line = (text: ReactNode, tone?: Line["tone"]): Line => ({ id: ++lineId, text, tone });
const prompt = (command: string) => line(<><span className="text-brand-mark">$</span> {command}</>);
const clock = () => new Date().toLocaleTimeString("en-GB");
const feedLine = (): Feed => ({ id: ++lineId, time: clock(), path: DEMO_FILE });

const STARTED = `Started ${NAME} — uploaded ${FILES} files, ${UPLOADED}`;

/* Every chapter starts from a known state, so a jump or a takeover replays cleanly. */
const LIVE: State = { ...INITIAL, status: "live", started: STARTED };
const WATCHING = (url: string): State => ({ ...LIVE, address: url, open: true });
const SAVED = (url: string): State => ({
  ...WATCHING(url),
  value: "150",
  saved: "150",
  sent: "150",
  checkpoints: 1,
  files: 1,
  sentBytes: SAVE_BYTES,
  saves: 1,
  feed: [feedLine()],
});

const plural = (count: number, one: string, many: string) => `${count} ${count === 1 ? one : many}`;

export function RunDemo({ host }: { host: string }) {
  const url = `${host}/session/${SESSION}`;
  const [state, setState] = useState<State>(INITIAL);
  const update = useCallback((patch: Partial<State> | ((current: State) => Partial<State>)) => {
    setState((current) => ({ ...current, ...(typeof patch === "function" ? patch(current) : patch) }));
  }, []);

  /* ── terminal ─────────────────────────────────────────── */

  const start = useCallback(() => {
    update((s) => {
      const history = [...s.history, prompt("biga start")];
      if (s.status === "live") {
        return { history: [...history, line("biga: already broadcasting this folder", "muted")], shell: "" };
      }
      if (s.status === "stopped") {
        const changed = s.saved !== s.sent;
        return {
          history,
          shell: "",
          status: "live",
          copied: false,
          sent: s.saved,
          checkpoints: changed ? 1 : 0,
          files: changed ? 1 : 0,
          sentBytes: changed ? SAVE_BYTES : 0,
          saves: changed ? s.saves + 1 : s.saves,
          feed: changed ? [feedLine()] : [],
          started: changed
            ? `Rejoined ${NAME} — synced 1 changed file, ${humanBytes(SAVE_BYTES)}`
            : `Rejoined ${NAME} — already in sync`,
        };
      }
      return { history, shell: "", status: "live", started: STARTED, feed: [], checkpoints: 0, files: 0, sentBytes: 0 };
    });
  }, [update]);

  const run = useCallback(
    (raw: string) => {
      const command = raw.trim().replace(/\s+/g, " ");
      if (command === "biga start") return start();
      update((s) => {
        if (!command) return { history: [...s.history, prompt("")], shell: "" };
        if (command === "clear") return { history: [], shell: "" };
        return {
          history: [...s.history, prompt(command), line("command not found. Try: biga start", "error")],
          shell: "",
        };
      });
    },
    [start, update]
  );

  const stop = useCallback(() => {
    update((s) => ({
      status: "stopped",
      copied: false,
      history: [
        ...s.history,
        line(
          <>
            <span className="text-brand-mark">◇</span>
            {"  "}Stopped {NAME} · {plural(s.checkpoints, "checkpoint", "checkpoints")}
          </>
        ),
        line("│", "muted"),
        line(
          <>
            └{"  "}Done
          </>,
          "muted"
        ),
      ],
    }));
  }, [update]);

  const onShellKey = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === "Enter") {
      event.preventDefault();
      run(event.currentTarget.value);
    }
  };

  /* ── editor ───────────────────────────────────────────── */

  const save = useCallback(() => {
    update((s) => {
      if (s.status !== "live") return { saved: s.value };
      // Same bytes, same hash: nothing to send.
      if (s.value === s.sent) return { saved: s.value };
      return {
        saved: s.value,
        sent: s.value,
        checkpoints: s.checkpoints + 1,
        files: 1,
        sentBytes: s.sentBytes + SAVE_BYTES,
        saves: s.saves + 1,
        feed: [...s.feed, feedLine()].slice(-3),
      };
    });
  }, [update]);

  const onEditorKey = (event: KeyboardEvent<HTMLInputElement>) => {
    if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "s") {
      event.preventDefault();
      save();
    }
  };

  /* ── browser ──────────────────────────────────────────── */

  const go = useCallback(() => {
    update((s) => {
      const found = s.address.includes(SESSION) && s.status !== "idle";
      return { open: found, missing: !found && s.address.trim() !== "" };
    });
  }, [update]);

  const chapters: AutopilotChapter[] = useMemo(
    () => [
      {
        title: "Start",
        setup: () => setState(INITIAL),
        steps: [
          { move: "shell", say: "Opening a terminal" },
          { type: "biga start{Enter}", into: "shell", say: "One command" },
          { wait: 1500, say: "Live in a second" },
        ],
      },
      {
        title: "Share",
        setup: () => setState(LIVE),
        steps: [
          { click: "key-c", say: "Copying the link" },
          { wait: 900, say: "Sending it to Priya" },
          { cursor: "priya", wait: 1700 },
          { cursor: "priya", click: "address", say: "Pasting the link" },
          { cursor: "priya", do: () => update({ address: url, missing: false }) },
          { cursor: "priya", type: "{Enter}", into: "address" },
          { cursor: "priya", wait: 1300, say: "Watching" },
        ],
      },
      {
        title: "Save",
        setup: () => setState(WATCHING(url)),
        steps: [
          { click: "idle", say: "Changing one number" },
          { type: "{Backspace}{Backspace}50", into: "idle" },
          { click: "save", say: "Saving" },
          { wait: 1500, say: "Checkpoint sent" },
          { cursor: "priya", wait: 2400 },
          { cursor: "priya", move: "viewer-line", at: [0.7, 0.5], say: "There it is" },
          { cursor: "priya", wait: 900 },
        ],
      },
      {
        title: "Rejoin",
        setup: () => setState(SAVED(url)),
        steps: [
          { click: "key-q", say: "Stopping for lunch" },
          { click: "idle", say: "Still editing offline" },
          { type: "{Backspace}{Backspace}80", into: "idle" },
          { click: "save" },
          { type: "biga start{Enter}", into: "shell", say: "Same command again" },
          { wait: 1800, say: "Same link, caught up" },
          { cursor: "priya", wait: 1400 },
          { cursor: "priya", move: "viewer-status", say: "Ended, then live again" },
          { cursor: "priya", wait: 3200 },
          { cursor: "priya", move: "viewer-line", at: [0.7, 0.5], say: "Back with the change" },
        ],
      },
    ],
    [update, url]
  );

  const s = state;
  const dirty = s.value !== s.saved;
  const showcase = useMemo(
    () => ({ status: s.status === "live" ? ("active" as const) : ("ended" as const), saves: s.saves }),
    [s.status, s.saves]
  );

  return (
    <ShowcaseProvider state={showcase}>
      <Autopilot
        cursors={[
          { id: "you", label: "You", color: "oklch(0.5 0.12 155)", home: [0.3, 0.62] },
          { id: "priya", label: "Priya", color: "oklch(0.55 0.14 50)", home: [0.82, 0.28] },
        ]}
        chapters={chapters}
        chapterStrip
        park="bottom-right"
        yieldLabel="Your turn"
        className="text-foreground"
        stageClassName="border-rail bg-muted/40 rounded-2xl border p-1.5 sm:p-2"
      >
        <div className="grid grid-cols-1 gap-1.5 sm:gap-2 md:grid-cols-[minmax(0,1.04fr)_minmax(0,0.96fr)]">
          {/* ── Your machine ─────────────────────────────── */}
          <div className="bg-terminal text-terminal-foreground flex min-w-0 flex-col overflow-hidden rounded-xl border border-white/10">
            <WindowBar title="~/code/biga" dark />

            <div className="flex items-center justify-between border-b border-white/10 pr-1.5 pl-3">
              <span className="flex items-center gap-1.5 border-b border-white/60 py-2 font-mono text-xs">
                config.go
                <span
                  aria-label={dirty ? "Unsaved changes" : undefined}
                  className={cn(
                    "size-1.5 rounded-full bg-white/70 transition-opacity",
                    dirty ? "opacity-100" : "opacity-0"
                  )}
                />
              </span>
              <button
                type="button"
                data-autopilot="save"
                onClick={save}
                className="font-body flex h-7 items-center gap-1.5 rounded-md px-2 text-xs text-white/75 transition-colors hover:bg-white/10 hover:text-white focus-visible:ring-2 focus-visible:ring-white/40 focus-visible:outline-none data-[autopilot-hover]:bg-white/10 data-[autopilot-press]:scale-[0.96]"
              >
                Save
                <kbd className="font-mono text-[11px] text-white/60">⌘S</kbd>
              </button>
            </div>

            <Editor value={s.value} onChange={(value) => update({ value })} onKeyDown={onEditorKey} />

            {/* Terminal: newest output at the bottom, like a real one. */}
            <div className="flex h-64 flex-col justify-end overflow-hidden border-t border-white/10 px-3 py-3 font-mono text-[12.5px] leading-[1.7]">
              {s.history.slice(-5).map((entry) => (
                <p
                  key={entry.id}
                  className={cn(
                    "truncate",
                    entry.tone === "muted" && "text-white/50",
                    entry.tone === "error" && "text-[oklch(0.78_0.14_45)]"
                  )}
                >
                  {entry.text}
                </p>
              ))}

              {s.status === "live" ? (
                <LivePanel
                  url={url}
                  state={s}
                  onCopy={() => update({ copied: true })}
                  onOpen={() => update({ address: url, open: true, missing: false })}
                  onStop={stop}
                />
              ) : (
                <label className="-mx-1 flex items-center gap-2 rounded-sm px-1 has-focus-visible:ring-1 has-focus-visible:ring-white/40">
                  <span aria-hidden className="text-brand-mark">
                    $
                  </span>
                  <span className="sr-only">Terminal command</span>
                  <span className="min-w-0 flex-1 overflow-hidden">
                    <input
                      data-autopilot="shell"
                      value={s.shell}
                      onChange={(event) => update({ shell: event.target.value })}
                      onKeyDown={onShellKey}
                      placeholder={s.status === "idle" ? "biga start" : ""}
                      autoComplete="off"
                      autoCapitalize="off"
                      spellCheck={false}
                      className="biga-shrink block w-full bg-transparent text-[12.5px] text-white caret-[var(--brand-mark)] outline-none [--shrink:0.78] placeholder:text-white/50"
                    />
                  </span>
                </label>
              )}
            </div>
          </div>

          {/* ── Their browser ────────────────────────────── */}
          <div className="bg-background border-rail flex min-h-72 min-w-0 flex-col overflow-hidden rounded-xl border">
            <div className="border-rail flex items-center gap-2 border-b px-2.5 py-2">
              <span aria-hidden className="text-muted-foreground/60 hidden items-center gap-1 sm:flex">
                <ArrowLeftIcon className="size-3.5" strokeWidth={1.75} />
                <ArrowRightIcon className="size-3.5" strokeWidth={1.75} />
                <RotateCwIcon className="size-3.5" strokeWidth={1.75} />
              </span>
              <label className="bg-muted has-focus-visible:ring-ring/50 flex h-8 min-w-0 flex-1 items-center overflow-hidden rounded-full px-3 has-focus-visible:ring-[3px]">
                <span className="sr-only">Address</span>
                <input
                  data-autopilot="address"
                  value={s.address}
                  onChange={(event) => update({ address: event.target.value, missing: false })}
                  onKeyDown={(event) => {
                    if (event.key === "Enter") {
                      event.preventDefault();
                      go();
                    }
                  }}
                  placeholder="Paste a share link"
                  autoComplete="off"
                  autoCapitalize="off"
                  spellCheck={false}
                  className="biga-shrink placeholder:text-muted-foreground block w-full bg-transparent font-mono text-xs outline-none [--shrink:0.75]"
                />
              </label>
            </div>

            {s.open ? (
              <Viewer status={s.status} sent={s.sent} />
            ) : (
              <div className="flex flex-1 flex-col items-center justify-center gap-1.5 px-6 text-center">
                <p className="font-body text-sm font-medium">
                  {s.missing ? "Nothing broadcasting at that link" : "Their browser"}
                </p>
                <p className="font-body text-muted-foreground max-w-[30ch] text-sm">
                  {s.missing
                    ? "Check the link, or start the broadcast first."
                    : "Paste the share link here. No sign-in, nothing to install."}
                </p>
              </div>
            )}
          </div>
        </div>
      </Autopilot>
    </ShowcaseProvider>
  );
}

/* ── Parts ──────────────────────────────────────────────── */

function WindowBar({ title, dark = false }: { title: string; dark?: boolean }) {
  return (
    <div className={cn("flex items-center gap-2 border-b px-3 py-2.5", dark ? "border-white/10" : "border-rail")}>
      <span aria-hidden className="flex gap-1.5">
        {[0, 1, 2].map((i) => (
          <span key={i} className={cn("size-2.5 rounded-full", dark ? "bg-white/15" : "bg-foreground/15")} />
        ))}
      </span>
      <span translate="no" className={cn("truncate font-mono text-xs", dark ? "text-white/55" : "text-muted-foreground")}>
        {title}
      </span>
    </div>
  );
}

/**
 * The CLI's live panel, as `biga start` draws it (`cli/internal/ui/live.go`):
 * the frame, how the run began, one block per project, the change feed and the
 * key hints. Glyphs and wording are the CLI's.
 */
function LivePanel({
  url,
  state: s,
  onCopy,
  onOpen,
  onStop,
}: {
  url: string;
  state: State;
  onCopy: () => void;
  onOpen: () => void;
  onStop: () => void;
}) {
  const [notice, setNotice] = useState<string | null>(null);
  useEffect(() => {
    if (!s.copied) return;
    setNotice("Link copied");
    const timer = setTimeout(() => setNotice(null), 2500);
    return () => clearTimeout(timer);
  }, [s.copied]);

  const sentLine =
    s.checkpoints === 0
      ? "live · waiting for changes"
      : `live · ${plural(s.checkpoints, "checkpoint", "checkpoints")} · ${plural(s.files, "file", "files")} · ${humanBytes(s.sentBytes)} sent · last sync just now`;

  return (
    <div className="mt-1 flex flex-col">
      <p className="text-white/50">┌{"  "}biga</p>
      {s.started ? (
        <p className="truncate">
          <span className="text-brand-mark">◇</span>
          {"  "}
          {s.started}
        </p>
      ) : null}
      <p className="text-white/50">│</p>
      <p translate="no" className="truncate">
        <span className="text-brand-mark">●</span>
        {"  "}
        <strong className="font-semibold">{TITLE}</strong>
        {"  "}
        <span className="text-[oklch(0.82_0.1_215)]">{url}</span>
      </p>
      <p className="truncate text-white/60">
        <span className="text-white/50">│</span>
        {"  "}
        {sentLine}
      </p>
      {s.feed.slice(-2).map((entry) => (
        <p key={entry.id} translate="no" className="truncate">
          <span className="text-white/50">│</span>
          {"  "}
          <span className="text-white/50 tabular-nums">{entry.time}</span>
          {"  "}
          <span className="text-[oklch(0.85_0.13_85)]">~</span> {entry.path}
        </p>
      ))}
      <p className="text-white/50">│</p>
      <div className="mt-0.5 flex flex-wrap items-center gap-x-1 gap-y-1.5">
        <TuiKey name="c" target="key-c" onClick={onCopy}>
          copy link
        </TuiKey>
        <TuiKey name="o" target="key-o" onClick={onOpen}>
          open in browser
        </TuiKey>
        <TuiKey name="q" target="key-q" onClick={onStop}>
          stop
        </TuiKey>
        {notice ? <span className="text-brand-mark ml-1">{notice}</span> : null}
      </div>
    </div>
  );
}

function TuiKey({
  name,
  target,
  onClick,
  children,
}: {
  name: string;
  target: string;
  onClick: () => void;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      data-autopilot={target}
      onClick={onClick}
      className="flex h-6 items-center gap-1.5 rounded-md border border-white/12 px-2 text-[12px] transition-[background-color,scale] duration-150 hover:bg-white/10 focus-visible:ring-2 focus-visible:ring-white/40 focus-visible:outline-none active:scale-[0.96] data-[autopilot-hover]:bg-white/10 data-[autopilot-press]:scale-[0.96]"
    >
      <span className="text-brand-mark">{name}</span>
      <span className="text-white/70">{children}</span>
    </button>
  );
}

/**
 * The editor: lines of the real `internal/config/config.go`, highlighted with
 * the viewer's dark theme. Line 80 is the one the demo edits, so the default
 * idle time, `120`, is an input there.
 */
function Editor({
  value,
  onChange,
  onKeyDown,
}: {
  value: string;
  onChange: (value: string) => void;
  onKeyDown: (event: KeyboardEvent<HTMLInputElement>) => void;
}) {
  const fixture = useShowcase();
  const file = fixture?.shown.find((candidate) => candidate.path === DEMO_FILE);

  // Designed at a fixed width so the whole line the demo edits is always in
  // view; narrower panes scale it down like the viewer beside it.
  return (
    <Scaled width={EDITOR_W} height={EDITOR_H} maxScale={1} autoHeight>
    <div
      translate="no"
      style={{ width: EDITOR_W, height: EDITOR_H }}
      className="overflow-hidden px-3 py-3 font-mono text-[12.5px] leading-[1.7] whitespace-pre"
    >
      {file
        ? file.tokens.slice(EDITOR_FIRST - 1, EDITOR_LAST).map((tokens, index) => {
            const number = EDITOR_FIRST + index;
            return (
              <div key={number} className="-mx-3 flex gap-3 px-3">
                <span aria-hidden className="w-6 shrink-0 text-right opacity-35 select-none">
                  {number}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="tab-2">
                  {tokens.map(([text, , dark], i) =>
                    number === DEMO_LINE && text === BASE ? (
                      <input
                        key={i}
                        data-autopilot="idle"
                        aria-label="Idle time in milliseconds, on line 80"
                        value={value}
                        inputMode="numeric"
                        maxLength={4}
                        onChange={(event) => onChange(event.target.value.replace(/\D/g, "").slice(0, 4))}
                        onKeyDown={onKeyDown}
                        style={{ width: `${Math.max(1, value.length) + 0.6}ch`, color: dark }}
                        className="-my-0.5 rounded-sm bg-white/10 px-[0.3ch] text-base outline-none ring-white/30 focus-visible:ring-1 data-[autopilot-focus]:ring-1 sm:text-[12.5px]"
                      />
                    ) : (
                      <span key={i} style={{ color: dark }}>
                        {text}
                      </span>
                    )
                  )}
                  </span>
                </span>
              </div>
            );
          })
        : null}
    </div>
    </Scaled>
  );
}

/** Design size of the viewer in the demo: the real regions, at the real proportions. */
const VIEW_W = 820;
const VIEW_H = 860;
const HEAD = 48;
const FILES_W = 210;
const TIMELINE_W = 280;

/**
 * The real viewer, scaled into the pane: header, file tree, code and timeline,
 * each the viewer's own component reading the seeded stores. A save lands in
 * them through `ShowcaseProvider`, so the timeline gains a checkpoint and the
 * file a modified mark exactly as it would live.
 */
function Viewer({ status, sent }: { status: Status; sent: string }) {
  return (
    <div className="relative flex-1" style={{ aspectRatio: `${VIEW_W} / ${VIEW_H}` }}>
      <Scaled width={VIEW_W} height={VIEW_H}>
        <div className="bg-background flex flex-col" style={{ width: VIEW_W, height: VIEW_H }}>
          <div className="shrink-0" style={{ height: HEAD }}>
            <PanelHeader live={status === "live"} />
          </div>
          <div className="flex min-h-0 flex-1">
            <div className="shrink-0" style={{ width: FILES_W }}>
              <PanelFiles ended={status !== "live"} activity={false} />
            </div>
            <div className="min-w-0 flex-1">
              <PanelCode save={sent !== BASE ? { from: BASE, to: sent } : undefined} />
            </div>
            <div className="shrink-0" style={{ width: TIMELINE_W }}>
              <PanelTimeline />
            </div>
          </div>
        </div>
      </Scaled>

      {/* Places for the cursor to point at; the viewer's own markup can't carry them. */}
      <span
        data-autopilot="viewer-status"
        aria-hidden
        className="pointer-events-none absolute"
        style={{ left: "17%", top: "1.2%", width: "9%", height: "3.2%" }}
      />
      <span
        data-autopilot="viewer-line"
        aria-hidden
        className="pointer-events-none absolute"
        style={{ left: "27%", top: "37%", width: "28%", height: "2.4%" }}
      />
    </div>
  );
}
