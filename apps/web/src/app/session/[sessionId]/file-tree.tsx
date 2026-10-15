"use client";

import {
    defaultRangeExtractor,
    useVirtualizer,
    type Range,
    type Virtualizer,
} from "@tanstack/react-virtual";
import type { ChangeType, FileNode } from "@biga/types";
import { useEditorStore } from "@biga/stores/editor-store";
import { useFileTreeStore } from "@biga/stores/file-tree-store";
import { useHistoryStore } from "@biga/stores/history-store";
import {
    ChevronRight,
    ClockIcon,
    CopyIcon,
    DownloadIcon,
    FileTextIcon,
    FolderClosedIcon,
    ListCollapseIcon,
    SearchIcon,
} from "lucide-react";
import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";

import { FileTypeIcon } from "@/components/file-icon";
import { useModKey } from "@/components/ui/kbd";
import {
    ContextMenu,
    ContextMenuContent,
    ContextMenuItem,
    ContextMenuSeparator,
    ContextMenuTrigger,
} from "@/components/ui/context-menu";
import { ScrollArea } from "@/components/ui/scroll-area";
import { EmptyState } from "@/components/viewer/empty-state";
import { IconAction } from "@/components/viewer/icon-action";
import { PanelHeader } from "@/components/viewer/panel-header";
import { CHANGE_META } from "@/lib/change-meta";
import { copyFileContent, copyWithToast, downloadFile } from "@/lib/file-actions";
import { prefetchFileContent } from "@/lib/use-file-content";
import { useRovingTree, type TreeItemMeta } from "@/lib/use-roving-tree";
import { cn } from "@/lib/utils";

const INDENT = 12;
const BASE_PAD = 8;

/** Faint vertical guides, one per ancestor level, so deep trees stay legible. */
function IndentGuides({ depth }: { depth: number }) {
    if (depth === 0) {
        return null;
    }
    return (
        <>
            {Array.from({ length: depth }).map((_, level) => (
                <span
                    key={level}
                    aria-hidden
                    className="bg-sidebar-border pointer-events-none absolute inset-y-0 w-px"
                    style={{ left: `${BASE_PAD + level * INDENT + 7}px` }}
                />
            ))}
        </>
    );
}

type RowProps = {
    node: FileNode;
    depth: number;
    expanded: boolean;
    selected: boolean;
    decoration: ChangeType | undefined;
    /** Changes whenever a live save touches this row, restarting its highlight. */
    flashKey: number | null;
    itemProps: ReturnType<ReturnType<typeof useRovingTree>["getItemProps"]>;
    setSize: number;
    posInSet: number;
    onClick: () => void;
};

const ROW_CLASS =
    "group/row relative flex h-full cursor-default items-center gap-1.5 pr-2 text-[13px] outline-none select-none " +
    "hover:bg-sidebar-accent/60 focus-visible:ring-ring/70 focus-visible:ring-2 focus-visible:ring-inset " +
    "aria-selected:bg-sidebar-accent aria-selected:text-sidebar-accent-foreground";

function TreeRow({
    node,
    depth,
    expanded,
    selected,
    decoration,
    flashKey,
    itemProps,
    setSize,
    posInSet,
    onClick,
}: RowProps) {
    const indent = { paddingLeft: `${BASE_PAD + depth * INDENT}px` };
    const common = {
        role: "treeitem",
        "aria-level": depth + 1,
        "aria-setsize": setSize,
        "aria-posinset": posInSet,
        ...itemProps,
    } as const;

    if (node.type === "directory") {
        if (node.ignored) {
            return (
                <div
                    {...common}
                    aria-disabled
                    className={cn(ROW_CLASS, "text-muted-foreground hover:bg-transparent")}
                    style={indent}
                >
                    <IndentGuides depth={depth} />
                    <span className="size-3.5 shrink-0" />
                    <FileTypeIcon kind="directory" name={node.name} className="size-4 opacity-50" />
                    <span className="truncate">{node.name}</span>
                    <span className="text-muted-foreground/80 ml-auto shrink-0 pl-2 text-[11px]">
                        not shared
                    </span>
                </div>
            );
        }

        return (
            <div
                {...common}
                aria-expanded={expanded}
                aria-selected={false}
                className={ROW_CLASS}
                style={indent}
                onClick={onClick}
            >
                <IndentGuides depth={depth} />
                <ChevronRight
                    aria-hidden
                    className={cn(
                        "text-muted-foreground size-3.5 shrink-0 transition-transform duration-150 ease-out",
                        expanded && "rotate-90"
                    )}
                />
                <FileTypeIcon kind="directory" name={node.name} expanded={expanded} className="size-4" />
                <span className="truncate">{node.name}</span>
            </div>
        );
    }

    const meta = decoration ? CHANGE_META[decoration] : null;

    return (
        <div {...common} aria-selected={selected} className={ROW_CLASS} style={indent} onClick={onClick}>
            {flashKey !== null && (
                <span
                    key={flashKey}
                    aria-hidden
                    className="biga-just-changed pointer-events-none absolute inset-0"
                />
            )}
            <IndentGuides depth={depth} />
            <span className="size-3.5 shrink-0" />
            <FileTypeIcon kind="file" name={node.name} className="size-4" />
            <span className={cn("truncate", meta && decoration !== "modified" && meta.className)}>
                {node.name}
            </span>
            {meta && (
                <span
                    className={cn("ml-auto w-3 shrink-0 text-center font-mono text-[11px] font-semibold", meta.className)}
                    title={meta.label}
                >
                    {meta.letter}
                    <span className="sr-only">, {meta.label.toLowerCase()}</span>
                </span>
            )}
        </div>
    );
}

/**
 * Right-click (or long-press) actions for a file row. The trigger is the row's
 * positioning wrapper; the menu key on a focused row bubbles up to it.
 */
function FileContextMenu({
    sessionId,
    path,
    onRevealInTimeline,
    children,
}: {
    sessionId: string;
    path: string;
    onRevealInTimeline: (path: string) => void;
    children: React.ReactElement;
}) {
    return (
        <ContextMenu>
            <ContextMenuTrigger asChild>{children}</ContextMenuTrigger>
            <ContextMenuContent className="w-52">
                <ContextMenuItem onSelect={() => void copyWithToast(path, "path")}>
                    <CopyIcon />
                    Copy path
                </ContextMenuItem>
                <ContextMenuItem onSelect={() => void copyFileContent(sessionId, path)}>
                    <FileTextIcon />
                    Copy contents
                </ContextMenuItem>
                <ContextMenuItem onSelect={() => void downloadFile(sessionId, path)}>
                    <DownloadIcon />
                    Download
                </ContextMenuItem>
                <ContextMenuSeparator />
                <ContextMenuItem onSelect={() => onRevealInTimeline(path)}>
                    <ClockIcon />
                    Show in timeline
                </ContextMenuItem>
            </ContextMenuContent>
        </ContextMenu>
    );
}

/**
 * The paths touched by the newest checkpoint, but only once it arrived live
 * after this tree mounted. Saves that predate the viewer never flash.
 */
function useLiveFlash(): { seq: number | null; paths: ReadonlySet<string> } {
    const latestSeq = useHistoryStore((state) => state.checkpoints[0]?.seq ?? null);
    const latest = useHistoryStore((state) =>
        latestSeq !== null ? state.bySeq.get(latestSeq) : undefined
    );
    const [baseline] = useState(() => latestSeq);
    return useMemo(() => {
        if (latestSeq === null || !latest || (baseline !== null && latestSeq <= baseline)) {
            return { seq: null, paths: new Set<string>() };
        }
        return { seq: latestSeq, paths: new Set(latest.changes.map((change) => change.path)) };
    }, [latestSeq, latest, baseline]);
}

export function FileTree({
    sessionId,
    ended,
    comfortable = false,
    onOpenTimeline,
    onOpenQuickOpen,
    onFileOpened,
}: {
    sessionId: string;
    ended: boolean;
    /** Taller rows for touch, used in the mobile drawer. */
    comfortable?: boolean;
    onOpenTimeline: (path: string) => void;
    onOpenQuickOpen: () => void;
    /** Called after the reader opens a file from the tree (not when follow mode does). */
    onFileOpened?: () => void;
}) {
    const flattened = useFileTreeStore((state) => state.flattened);
    const selectedPath = useFileTreeStore((state) => state.selectedPath);
    const expandedPaths = useFileTreeStore((state) => state.expandedPaths);
    const decorations = useFileTreeStore((state) => state.decorations);
    const fileCount = useFileTreeStore((state) => state.headMeta.size);
    const hasRoot = useFileTreeStore((state) => state.root !== null);
    const mod = useModKey();
    const flash = useLiveFlash();

    const rowHeight = comfortable ? 36 : 26;
    const parentRef = useRef<HTMLDivElement>(null);

    const openFile = useCallback(
        (path: string) => {
            useEditorStore.getState().openFile(path);
            useFileTreeStore.getState().setSelectedPath(path);
            onFileOpened?.();
        },
        [onFileOpened]
    );

    const items = useMemo<TreeItemMeta[]>(
        () =>
            flattened.map(({ node, depth }) => ({
                key: node.path,
                level: depth + 1,
                label: node.name,
                expandable: node.type === "directory" && !node.ignored,
                expanded: node.type === "directory" && expandedPaths.has(node.path),
            })),
        [flattened, expandedPaths]
    );

    // aria-setsize / aria-posinset: position among siblings, computed in one pass.
    const positions = useMemo(() => {
        const result: { setSize: number; posInSet: number }[] = new Array(flattened.length);
        const groups = new Map<string, number[]>();
        const parents: number[] = [];
        flattened.forEach(({ depth }, index) => {
            parents.length = depth;
            const groupKey = `${depth}:${parents[depth - 1] ?? -1}`;
            const group = groups.get(groupKey) ?? [];
            group.push(index);
            groups.set(groupKey, group);
            parents[depth] = index;
        });
        for (const group of groups.values()) {
            group.forEach((index, position) => {
                result[index] = { setSize: group.length, posInSet: position + 1 };
            });
        }
        return result;
    }, [flattened]);

    // The roving tree needs to scroll the virtualizer, and the virtualizer needs
    // the roving tree's active row; a ref breaks the cycle.
    const virtualizerRef = useRef<Virtualizer<HTMLDivElement, Element> | null>(null);
    const scrollToIndex = useCallback((index: number) => {
        virtualizerRef.current?.scrollToIndex(index, { align: "auto" });
    }, []);

    const onToggle = useCallback(
        (index: number, expand: boolean) => {
            const item = flattened[index];
            if (item) {
                useFileTreeStore.getState().setExpanded(item.node.path, expand);
            }
        },
        [flattened]
    );

    const onActivate = useCallback(
        (index: number) => {
            const item = flattened[index];
            if (!item) {
                return;
            }
            if (item.node.type === "directory") {
                if (!item.node.ignored) {
                    useFileTreeStore.getState().toggleExpanded(item.node.path);
                }
            } else {
                openFile(item.node.path);
            }
        },
        [flattened, openFile]
    );

    const { activeIndex, getItemProps } = useRovingTree({
        items,
        containerRef: parentRef,
        selectedKey: selectedPath,
        onToggle,
        onActivate,
        scrollToIndex,
    });

    // Keep the focusable row mounted even when scrolled out of view, so Tab
    // always has somewhere to land.
    const rangeExtractor = useCallback(
        (range: Range) => {
            const indexes = defaultRangeExtractor(range);
            if (activeIndex >= 0 && !indexes.includes(activeIndex)) {
                indexes.push(activeIndex);
                indexes.sort((a, b) => a - b);
            }
            return indexes;
        },
        [activeIndex]
    );

    const virtualizer = useVirtualizer({
        count: flattened.length,
        getScrollElement: () => parentRef.current,
        estimateSize: () => rowHeight,
        overscan: 16,
        rangeExtractor,
    });
    useLayoutEffect(() => {
        virtualizerRef.current = virtualizer;
    });

    useEffect(() => {
        virtualizer.measure();
    }, [rowHeight, virtualizer]);

    // Reveal the selected file when it changes from outside the tree (follow
    // mode, Go to file, a tab click).
    const lastRevealed = useRef<string | null>(null);
    useEffect(() => {
        if (!selectedPath || selectedPath === lastRevealed.current) {
            return;
        }
        const index = flattened.findIndex((item) => item.node.path === selectedPath);
        if (index >= 0) {
            lastRevealed.current = selectedPath;
            virtualizer.scrollToIndex(index, { align: "auto" });
        }
    }, [selectedPath, flattened, virtualizer]);

    const header = (
        <PanelHeader
            title="Files"
            id="files-heading"
            meta={fileCount > 0 ? fileCount.toLocaleString() : undefined}
            actions={
                <>
                    <IconAction label="Go to file" shortcut={[mod, "P"]} onClick={onOpenQuickOpen}>
                        <SearchIcon />
                    </IconAction>
                    <IconAction
                        label="Collapse all folders"
                        disabled={expandedPaths.size === 0}
                        onClick={() => useFileTreeStore.getState().collapseAll()}
                    >
                        <ListCollapseIcon />
                    </IconAction>
                </>
            }
        />
    );

    if (flattened.length === 0) {
        return (
            <div className="flex h-full flex-col">
                {header}
                <EmptyState
                    icon={FolderClosedIcon}
                    title={ended || hasRoot ? "No files shared" : "Waiting for files"}
                    description={
                        ended || hasRoot
                            ? "This session didn't include any files."
                            : "Files appear here as soon as the broadcaster's first snapshot uploads."
                    }
                />
            </div>
        );
    }

    return (
        <div className="flex h-full flex-col">
            {header}
            <ScrollArea className="min-h-0 flex-1" viewportRef={parentRef}>
                <div
                    role="tree"
                    aria-labelledby="files-heading"
                    className="relative w-full pb-2"
                    style={{ height: `${virtualizer.getTotalSize()}px` }}
                >
                    {virtualizer.getVirtualItems().map((virtualRow) => {
                        const item = flattened[virtualRow.index];
                        if (!item) {
                            return null;
                        }
                        const { node, depth } = item;
                        const position = positions[virtualRow.index] ?? { setSize: 1, posInSet: 1 };
                        const isFile = node.type === "file";
                        const row = (
                            <TreeRow
                                node={node}
                                depth={depth}
                                expanded={expandedPaths.has(node.path)}
                                selected={isFile && selectedPath === node.path}
                                decoration={isFile ? decorations.get(node.path) : undefined}
                                flashKey={isFile && flash.paths.has(node.path) ? flash.seq : null}
                                itemProps={getItemProps(virtualRow.index)}
                                setSize={position.setSize}
                                posInSet={position.posInSet}
                                onClick={() => onActivate(virtualRow.index)}
                            />
                        );
                        const wrapper = (
                            <div
                                key={node.path}
                                className="absolute top-0 left-0 w-full"
                                style={{
                                    height: `${virtualRow.size}px`,
                                    transform: `translateY(${virtualRow.start}px)`,
                                }}
                                onMouseEnter={
                                    node.type === "file" && node.hash
                                        ? () => prefetchFileContent(sessionId, node.path, node.hash)
                                        : undefined
                                }
                            >
                                {row}
                            </div>
                        );
                        return isFile ? (
                            <FileContextMenu
                                key={node.path}
                                sessionId={sessionId}
                                path={node.path}
                                onRevealInTimeline={onOpenTimeline}
                            >
                                {wrapper}
                            </FileContextMenu>
                        ) : (
                            wrapper
                        );
                    })}
                </div>
            </ScrollArea>
        </div>
    );
}
