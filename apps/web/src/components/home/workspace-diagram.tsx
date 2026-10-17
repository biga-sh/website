"use client";

import { useState } from "react";

import { FileTypeIcon } from "@/components/file-icon";
import { PauseButton } from "@/components/home/pause-button";
import { Circuit } from "@/components/ui/circuit";
import { Typography } from "@/components/ui/typography";
import { cn } from "@/lib/utils";

const CARD =
  "bg-card border-rail relative rounded-xl border transition-[border-color,opacity] duration-300 ease-out data-[circuit-pulse]:border-brand/70 data-[circuit-state=dimmed]:opacity-45";

function Project({ id, dir, title }: { id: string; dir: string; title?: string }) {
  return (
    <div data-circuit={id} className={cn(CARD, "flex items-center gap-2.5 px-3 py-2.5")}>
      <FileTypeIcon name={dir.replace("/", "")} kind="directory" className="size-5" />
      <span translate="no" className="font-mono text-[13px]">
        {dir}
      </span>
      {title ? (
        <Typography variant="label" tone="muted" className="ml-auto">
          {title}
        </Typography>
      ) : null}
    </div>
  );
}

function Link({ id, path }: { id: string; path: string }) {
  return (
    <div data-circuit={id} className={cn(CARD, "flex items-center gap-2.5 px-3 py-2.5")}>
      <span aria-hidden className="bg-brand size-2 shrink-0 rounded-full" />
      <span translate="no" className="truncate font-mono text-[13px]">
        {path}
      </span>
    </div>
  );
}

/**
 * What a `biga.json` does, as a picture: one file in, a folder per project,
 * and a session link out of each. The two project names are the ones the
 * README's example uses. Packets only run while it is playing; the control is
 * for anyone who would rather it sat still.
 */
export function WorkspaceDiagram() {
  const [paused, setPaused] = useState(false);

  return (
    <div className="flex flex-col gap-3">
      <Circuit
        flow="config -> api, web; api -> link-api; web -> link-web"
        autoPlay={!paused}
        interval={3.2}
        speed={150}
        radius={8}
        pinSpacing={8}
        traceClassName="text-foreground/20 dark:text-foreground/20"
        packetClassName="text-brand dark:text-brand"
        className="grid grid-cols-1 gap-y-6 sm:grid-cols-[auto_minmax(0,1fr)_minmax(0,1fr)] sm:grid-rows-2 sm:gap-x-10 sm:gap-y-4"
      >
        <div data-circuit="config" className={cn(CARD, "flex items-center gap-2.5 px-3.5 py-3 sm:row-span-2 sm:self-center")}>
          <FileTypeIcon name="biga.json" kind="file" className="size-5" />
          <span translate="no" className="font-mono text-[13px]">
            biga.json
          </span>
        </div>
        <Project id="api" dir="backend/" title="API" />
        <Link id="link-api" path="/session/k3f9zq2a" />
        <Project id="web" dir="frontend/" />
        <Link id="link-web" path="/session/p7d2mx4c" />
      </Circuit>

      <PauseButton paused={paused} onToggle={() => setPaused((value) => !value)} className="ml-auto" />
    </div>
  );
}
