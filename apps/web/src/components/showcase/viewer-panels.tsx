"use client";

import { useEditorStore } from "@biga/stores/editor-store";
import { useFileTreeStore } from "@biga/stores/file-tree-store";
import { useHistoryStore } from "@biga/stores/history-store";
import { useMemo } from "react";

import { ActivityBar } from "@/components/activity-bar";
import { CodeBreadcrumbs } from "@/components/code-breadcrumbs";
import { FileTree } from "@/app/session/[sessionId]/file-tree";
import { HistoryPanel } from "@/app/session/[sessionId]/history-panel";
import { OpenTabs } from "@/app/session/[sessionId]/code-viewer-tab";
import { SessionHeader } from "@/app/session/[sessionId]/session-header";
import { DEMO_FILE, DEMO_LINE } from "@/lib/showcase";
import { cn } from "@/lib/utils";

import { useShowcase } from "./showcase-provider";
import { StaticCode } from "./static-code";

/*
 * The viewer's regions, each one the real component reading the real stores
 * (seeded by `ShowcaseProvider`). Only the pieces that need a network or
 * Monaco are replaced: the code body is `StaticCode`, and every callback is a
 * no-op because the panels are pictures of the product, not controls.
 */

const noop = () => {};

/** Holds a panel's place until the fixture has loaded. */
function Placeholder() {
  return <div className="bg-muted/40 size-full" />;
}

/** Where each file's pane starts, so the lines worth reading are on screen. */
const FIRST_LINE: Record<string, number> = {
  "internal/ignore/filter.go": 27,
  "internal/config/config.go": 66,
  "internal/watch/batcher.go": 1,
  "cmd/biga/main.go": 1,
  "README.md": 1,
};

export function PanelHeader({ live }: { live: boolean }) {
  const fixture = useShowcase();
  if (!fixture) return <Placeholder />;
  return (
    <div className="bg-background size-full">
      <SessionHeader
        sessionId={fixture.session.id}
        status={live ? "live" : "ended"}
        embed
        isMobile={false}
        sidebarCollapsed={false}
        onToggleSidebar={noop}
        onOpenQuickOpen={noop}
      />
    </div>
  );
}

export function PanelFiles({ ended, activity = true }: { ended: boolean; activity?: boolean }) {
  const fixture = useShowcase();
  if (!fixture) return <Placeholder />;
  return (
    <div className="bg-sidebar text-sidebar-foreground flex size-full min-w-0">
      {activity ? <ActivityBar view="explorer" sidebarOpen unseenTimeline={false} onChange={noop} /> : null}
      <aside aria-label="Files" className={cn("min-w-0 flex-1", activity && "border-r")}>
        <FileTree sessionId={fixture.session.id} ended={ended} onOpenTimeline={noop} onOpenQuickOpen={noop} />
      </aside>
    </div>
  );
}

export function PanelTimeline() {
  const fixture = useShowcase();
  if (!fixture) return <Placeholder />;
  return (
    <aside aria-label="Timeline" className="bg-sidebar text-sidebar-foreground size-full min-w-0 border-l">
      <HistoryPanel sessionId={fixture.session.id} selectedChange={null} onSelectChange={noop} />
    </aside>
  );
}

export function PanelCode({
  save,
  firstLine,
  lastLine,
  wrap,
  tabSize,
}: {
  /** An edit landing on the demo line: `from` becomes `to`, drawn under the highlighter, and targetable as `target`. */
  save?: { from: string; to: string; target?: string };
  /** Override where the pane starts and stops, for a short crop of the file. */
  firstLine?: number;
  lastLine?: number;
  wrap?: boolean;
  tabSize?: 2 | 4;
}) {
  const fixture = useShowcase();
  const tabs = useEditorStore((state) => state.tabs);
  const active = useEditorStore((state) => state.activeFilePath);
  const file = useMemo(
    () => fixture?.shown.find((candidate) => candidate.path === active) ?? fixture?.shown[0],
    [fixture, active]
  );
  const tree = useFileTreeStore((state) => state.root);
  if (!fixture || !file || !tree) return <Placeholder />;

  const path = file.path;
  const shownTabs = tabs.length ? tabs : [path];
  const replace = save && path === DEMO_FILE ? { line: DEMO_LINE, mark: true, ...save } : undefined;

  return (
    <div className="bg-background flex size-full min-w-0 flex-col">
      <div className="flex h-10 shrink-0 items-center border-b">
        <OpenTabs tabs={shownTabs} activePath={path} onSelect={noop} onClose={noop} />
      </div>
      <div className="flex h-8 shrink-0 items-center border-b">
        <CodeBreadcrumbs path={path} />
        <span className="text-muted-foreground border-border mr-2 shrink-0 rounded-full border px-2 py-0.5 text-[11px]">
          Read only
        </span>
      </div>
      <div className="min-h-0 flex-1">
        <StaticCode
          file={file}
          firstLine={firstLine ?? FIRST_LINE[path] ?? 1}
          lastLine={lastLine}
          replace={replace}
          wrap={wrap}
          tabSize={tabSize}
        />
      </div>
    </div>
  );
}

/** Reads the head of the history store, for callers that label the latest checkpoint. */
export function useLatestCheckpoint() {
  return useHistoryStore((state) => state.checkpoints[0] ?? null);
}
