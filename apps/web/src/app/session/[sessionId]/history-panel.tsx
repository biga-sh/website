"use client";

import { baseName, type CheckpointChange, type CheckpointSummary } from "@spire/types";
import { useFileTreeStore } from "@spire/stores/file-tree-store";
import { useHistoryStore } from "@spire/stores/history-store";
import { ArrowUpIcon, HistoryIcon, Loader2Icon, RotateCwIcon } from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { FileTypeIcon } from "@/components/file-icon";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { EmptyState } from "@/components/viewer/empty-state";
import { PanelHeader } from "@/components/viewer/panel-header";
import {
    CHANGE_META,
    dirName,
    formatDateTime,
    formatRelativeTime,
    pluralize,
} from "@/lib/change-meta";
import { fetchCheckpoint, fetchCheckpoints } from "@/lib/session-api";
import { useNow } from "@/lib/use-now";
import { useRovingTree, type TreeItemMeta } from "@/lib/use-roving-tree";
import { decorationsFromChanges } from "@/lib/use-session-stream";
import { cn } from "@/lib/utils";

const OLDER_PAGE = 100;

/** The change to show first when a checkpoint opens: the first one with a text diff. */
export function firstDiffable(changes: CheckpointChange[]): CheckpointChange | null {
    return changes.find((change) => !change.binary) ?? changes[0] ?? null;
}

function RelativeTime({ iso }: { iso: string }) {
    const now = useNow();
    return (
        <time dateTime={iso} title={formatDateTime(iso)}>
            {formatRelativeTime(iso, now)}
        </time>
    );
}

export function DiffStat({
    additions,
    deletions,
    className,
}: {
    additions: number;
    deletions: number;
    className?: string;
}) {
    if (additions === 0 && deletions === 0) {
        return null;
    }
    return (
        <span className={cn("flex items-center gap-1.5 font-mono tabular-nums", className)}>
            {additions > 0 && (
                <span className="text-success">
                    +{additions.toLocaleString()}
                    <span className="sr-only"> added lines</span>
                </span>
            )}
            {deletions > 0 && (
                <span className="text-destructive">
                    −{deletions.toLocaleString()}
                    <span className="sr-only"> removed lines</span>
                </span>
            )}
        </span>
    );
}

/**
 * The rail beside each checkpoint. The newest checkpoint's marker is Spire
 * blue, the same accent as the top plate of the logo: it is "now".
 */
function RailMarker({ first, last, latest }: { first: boolean; last: boolean; latest: boolean }) {
    return (
        <span aria-hidden className="relative flex w-3 shrink-0 justify-center self-stretch">
            <span
                className={cn(
                    "bg-sidebar-border absolute w-px",
                    first ? "top-[18px]" : "top-0",
                    last ? "h-[18px]" : "bottom-0"
                )}
            />
            <span
                className={cn(
                    "relative mt-[13px] size-[7px] rounded-full",
                    latest
                        ? "bg-spire shadow-[0_0_0_3px_color-mix(in_oklab,var(--spire-accent)_22%,transparent)]"
                        : "bg-muted-foreground/45"
                )}
            />
        </span>
    );
}

type Row =
    | { kind: "checkpoint"; checkpoint: CheckpointSummary; index: number }
    | { kind: "change"; change: CheckpointChange; seq: number };

export function HistoryPanel({
    sessionId,
    selectedChange,
    onSelectChange,
    comfortable = false,
    onChangePicked,
}: {
    sessionId: string;
    selectedChange: CheckpointChange | null;
    onSelectChange: (change: CheckpointChange | null) => void;
    comfortable?: boolean;
    /** Called after the reader picks a changed file (not on auto-selection). */
    onChangePicked?: () => void;
}) {
    const checkpoints = useHistoryStore((state) => state.checkpoints);
    const selectedSeq = useHistoryStore((state) => state.selectedSeq);
    const newWhileBrowsing = useHistoryStore((state) => state.newWhileBrowsing);
    const selectedCheckpoint = useHistoryStore((state) =>
        state.selectedSeq !== null ? state.bySeq.get(state.selectedSeq) : undefined
    );
    const [loadFailed, setLoadFailed] = useState(false);
    const [retryNonce, setRetryNonce] = useState(0);
    const [olderState, setOlderState] = useState<"idle" | "loading" | "error">("idle");
    const containerRef = useRef<HTMLDivElement>(null);

    // Checkpoints present when the panel mounted; anything newer arrived live
    // and gets a short entrance so the reader sees where it landed.
    const [baselineSeq] = useState(() => checkpoints[0]?.seq ?? -1);

    // Fetch the full checkpoint whenever the selected seq isn't cached. Selection
    // can come from a row click or from the auto-select on opening the timeline
    // view — the latter has no click handler to fetch for it, so the fetch must
    // key off the selection itself or the change list never loads.
    useEffect(() => {
        if (selectedSeq === null || selectedCheckpoint) {
            return;
        }
        setLoadFailed(false);
        const controller = new AbortController();
        fetchCheckpoint(sessionId, selectedSeq, controller.signal)
            .then((checkpoint) => {
                useHistoryStore.getState().cacheCheckpoint(checkpoint);
                useFileTreeStore
                    .getState()
                    .setDecorations(decorationsFromChanges(checkpoint.changes));
                onSelectChange(firstDiffable(checkpoint.changes));
            })
            .catch(() => {
                if (!controller.signal.aborted) {
                    setLoadFailed(true);
                }
            });
        return () => controller.abort();
    }, [sessionId, selectedSeq, selectedCheckpoint, onSelectChange, retryNonce]);

    const selectCheckpoint = useCallback(
        (seq: number | null) => {
            const history = useHistoryStore.getState();
            history.selectSeq(seq);
            const cached = seq !== null ? history.bySeq.get(seq) : undefined;
            if (cached) {
                useFileTreeStore.getState().setDecorations(decorationsFromChanges(cached.changes));
                onSelectChange(firstDiffable(cached.changes));
            } else {
                if (seq === null) {
                    useFileTreeStore.getState().setDecorations(new Map());
                }
                onSelectChange(null);
            }
        },
        [onSelectChange]
    );

    const jumpToLatest = useCallback(() => {
        const history = useHistoryStore.getState();
        const latest = history.checkpoints[0];
        // Clearing first resets the "new while browsing" counter.
        history.selectSeq(null);
        selectCheckpoint(latest ? latest.seq : null);
        containerRef.current?.querySelector<HTMLElement>('[data-tree-index="0"]')?.focus();
    }, [selectCheckpoint]);

    const loadOlder = useCallback(async () => {
        const oldest = useHistoryStore.getState().checkpoints.at(-1);
        if (!oldest) {
            return;
        }
        setOlderState("loading");
        try {
            const page = await fetchCheckpoints(sessionId, { before: oldest.seq, limit: OLDER_PAGE });
            useHistoryStore.getState().appendOlder(page);
            setOlderState("idle");
        } catch {
            setOlderState("error");
        }
    }, [sessionId]);

    // Flat row model shared by rendering and keyboard navigation.
    const rows = useMemo<Row[]>(() => {
        const result: Row[] = [];
        checkpoints.forEach((checkpoint, index) => {
            result.push({ kind: "checkpoint", checkpoint, index });
            if (checkpoint.seq === selectedSeq && selectedCheckpoint) {
                for (const change of selectedCheckpoint.changes) {
                    result.push({ kind: "change", change, seq: checkpoint.seq });
                }
            }
        });
        return result;
    }, [checkpoints, selectedSeq, selectedCheckpoint]);

    const items = useMemo<TreeItemMeta[]>(
        () =>
            rows.map((row) =>
                row.kind === "checkpoint"
                    ? {
                          key: `c${row.checkpoint.seq}`,
                          level: 1,
                          label: row.checkpoint.label,
                          expandable: true,
                          expanded: row.checkpoint.seq === selectedSeq,
                      }
                    : {
                          key: `f${row.seq}:${row.change.path}`,
                          level: 2,
                          label: baseName(row.change.path),
                          expandable: false,
                          expanded: false,
                      }
            ),
        [rows, selectedSeq]
    );

    const activate = useCallback(
        (index: number) => {
            const row = rows[index];
            if (!row) {
                return;
            }
            if (row.kind === "checkpoint") {
                selectCheckpoint(row.checkpoint.seq === selectedSeq ? null : row.checkpoint.seq);
            } else {
                onSelectChange(row.change);
                onChangePicked?.();
            }
        },
        [rows, selectedSeq, selectCheckpoint, onSelectChange, onChangePicked]
    );

    const toggle = useCallback(
        (index: number, expand: boolean) => {
            const row = rows[index];
            if (row?.kind === "checkpoint") {
                selectCheckpoint(expand ? row.checkpoint.seq : null);
            }
        },
        [rows, selectCheckpoint]
    );

    const selectedKey =
        selectedChange && selectedSeq !== null
            ? `f${selectedSeq}:${selectedChange.path}`
            : selectedSeq !== null
              ? `c${selectedSeq}`
              : null;

    const { getItemProps } = useRovingTree({
        items,
        containerRef,
        selectedKey,
        onToggle: toggle,
        onActivate: activate,
    });

    const oldestSeq = checkpoints.at(-1)?.seq ?? 0;
    const hasOlder = oldestSeq > 0;

    return (
        <div className="flex h-full flex-col overflow-hidden">
            <PanelHeader
                title="Timeline"
                id="timeline-heading"
                meta={checkpoints.length > 0 ? `${checkpoints.length.toLocaleString()}${hasOlder ? "+" : ""}` : undefined}
            />

            {newWhileBrowsing > 0 && (
                <button
                    type="button"
                    onClick={jumpToLatest}
                    className="bg-spire/10 text-spire hover:bg-spire/15 focus-visible:ring-spire/50 motion-safe:animate-in motion-safe:fade-in mx-2 mb-1 flex h-8 shrink-0 items-center justify-center gap-1.5 rounded-md text-xs font-medium transition-colors outline-none focus-visible:ring-2"
                >
                    <ArrowUpIcon className="size-3.5" />
                    {pluralize(newWhileBrowsing, "new checkpoint")}. Jump to latest
                </button>
            )}

            {checkpoints.length === 0 ? (
                <EmptyState
                    icon={HistoryIcon}
                    title="No checkpoints yet"
                    description="Each time the broadcaster saves, the change appears here as a checkpoint you can open."
                />
            ) : (
                <ScrollArea className="h-0 flex-1">
                    <div
                        ref={containerRef}
                        role="tree"
                        aria-labelledby="timeline-heading"
                        className="px-1.5 pb-2"
                    >
                        {rows.map((row, rowIndex) => {
                            const itemProps = getItemProps(rowIndex);
                            if (row.kind === "change") {
                                const { change } = row;
                                const meta = CHANGE_META[change.changeType];
                                const active = selectedChange?.path === change.path;
                                const dir = dirName(change.path);
                                return (
                                    <div
                                        key={`${row.seq}:${change.path}`}
                                        role="treeitem"
                                        aria-level={2}
                                        aria-selected={active}
                                        {...itemProps}
                                        onClick={() => activate(rowIndex)}
                                        className={cn(
                                            "flex cursor-default items-center gap-1.5 rounded-md pr-2 pl-[26px] text-xs outline-none select-none",
                                            "hover:bg-sidebar-accent/60 focus-visible:ring-ring/70 focus-visible:ring-2 focus-visible:ring-inset",
                                            "aria-selected:bg-sidebar-accent aria-selected:text-sidebar-accent-foreground",
                                            comfortable ? "h-9" : "h-7"
                                        )}
                                    >
                                        <FileTypeIcon kind="file" name={baseName(change.path)} className="size-3.5" />
                                        <span
                                            className={cn(
                                                "shrink-0 truncate",
                                                change.changeType === "deleted" && "line-through decoration-1"
                                            )}
                                        >
                                            {baseName(change.path)}
                                        </span>
                                        {dir && (
                                            <span className="text-muted-foreground min-w-0 truncate text-[11px]" title={change.path}>
                                                {dir}
                                            </span>
                                        )}
                                        <span className="ml-auto flex shrink-0 items-center gap-2 pl-1 text-[11px]">
                                            <DiffStat additions={change.additions} deletions={change.deletions} />
                                            <span
                                                className={cn("w-3 text-center font-mono font-semibold", meta.className)}
                                                title={meta.label}
                                            >
                                                {meta.letter}
                                                <span className="sr-only">, {meta.label.toLowerCase()}</span>
                                            </span>
                                        </span>
                                    </div>
                                );
                            }

                            const { checkpoint, index } = row;
                            const selected = selectedSeq === checkpoint.seq;
                            const arrivedLive = checkpoint.seq > baselineSeq;
                            return (
                                <div key={`c${checkpoint.seq}`} role="none">
                                    <div
                                        role="treeitem"
                                        aria-level={1}
                                        aria-expanded={selected}
                                        aria-selected={selected && !selectedChange}
                                        aria-busy={selected && !selectedCheckpoint && !loadFailed}
                                        {...itemProps}
                                        onClick={() => activate(rowIndex)}
                                        className={cn(
                                            "flex cursor-default gap-2.5 rounded-md pr-2 pl-1.5 outline-none select-none",
                                            "hover:bg-sidebar-accent/60 focus-visible:ring-ring/70 focus-visible:ring-2 focus-visible:ring-inset",
                                            selected && "bg-sidebar-accent/70",
                                            arrivedLive &&
                                                "motion-safe:animate-in motion-safe:fade-in motion-safe:slide-in-from-top-1 motion-safe:duration-300"
                                        )}
                                    >
                                        <RailMarker
                                            first={index === 0}
                                            last={index === checkpoints.length - 1 && !hasOlder}
                                            latest={index === 0}
                                        />
                                        <span className={cn("flex min-w-0 flex-1 flex-col gap-0.5", comfortable ? "py-2.5" : "py-[7px]")}>
                                            <span className="flex items-baseline gap-2">
                                                <span className="truncate text-[13px] font-medium">{checkpoint.label}</span>
                                                <span className="text-muted-foreground ml-auto shrink-0 text-[11px] tabular-nums">
                                                    <RelativeTime iso={checkpoint.createdAt} />
                                                </span>
                                            </span>
                                            <span className="text-muted-foreground flex items-center gap-2 text-[11px] tabular-nums">
                                                <span className="font-mono">#{checkpoint.seq}</span>
                                                <span>{pluralize(checkpoint.filesChanged, "file")}</span>
                                                <DiffStat additions={checkpoint.additions} deletions={checkpoint.deletions} />
                                            </span>
                                        </span>
                                    </div>

                                    {selected && !selectedCheckpoint && (
                                        <div className="text-muted-foreground flex h-8 items-center gap-2 pl-[26px] text-xs">
                                            {loadFailed ? (
                                                <>
                                                    Unable to load the changed files.
                                                    <Button
                                                        variant="ghost"
                                                        size="xs"
                                                        className="h-6 px-1.5"
                                                        onClick={() => setRetryNonce((nonce) => nonce + 1)}
                                                    >
                                                        <RotateCwIcon />
                                                        Try again
                                                    </Button>
                                                </>
                                            ) : (
                                                <>
                                                    <Loader2Icon className="size-3.5 animate-spin" />
                                                    Loading changed files…
                                                </>
                                            )}
                                        </div>
                                    )}
                                </div>
                            );
                        })}
                    </div>

                    {hasOlder && (
                        <div className="px-3 pb-3">
                            <Button
                                variant="outline"
                                size="xs"
                                className="w-full"
                                disabled={olderState === "loading"}
                                onClick={() => void loadOlder()}
                            >
                                {olderState === "loading" ? (
                                    <>
                                        <Loader2Icon className="animate-spin" />
                                        Loading older checkpoints…
                                    </>
                                ) : olderState === "error" ? (
                                    <>
                                        <RotateCwIcon />
                                        Unable to load. Try again
                                    </>
                                ) : (
                                    "Load older checkpoints"
                                )}
                            </Button>
                        </div>
                    )}
                </ScrollArea>
            )}
        </div>
    );
}
