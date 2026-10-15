"use client";

import { useEffect, useState } from "react";

import { CommandLine, INSTALL, type Platform } from "@/components/home/install-command";
import { cn } from "@/lib/utils";

const PLATFORMS: Platform[] = ["unix", "windows", "go"];

/**
 * The two commands, install then start, under one platform switch so the
 * start line matches the shell the install line was written for. The CLI
 * talks to localhost:3000 unless BIGA_API_URL says otherwise, so on any
 * other host the start line points it here.
 */
export function StartSteps({ apiUrl }: { apiUrl: string | null }) {
  const [platform, setPlatform] = useState<Platform>("unix");

  useEffect(() => {
    if (/Win/i.test(navigator.platform)) setPlatform("windows");
  }, []);

  const start = !apiUrl
    ? "biga start"
    : platform === "windows"
      ? `$env:BIGA_API_URL="${apiUrl}"; biga start`
      : `BIGA_API_URL=${apiUrl} biga start`;

  return (
    <div className="flex flex-col gap-5">
      <div role="group" aria-label="Platform" className="flex flex-wrap gap-1">
        {PLATFORMS.map((id) => (
          <button
            key={id}
            type="button"
            aria-pressed={id === platform}
            onClick={() => setPlatform(id)}
            className={cn(
              "font-body rounded-full px-3 py-1.5 text-xs font-medium outline-none transition-colors focus-visible:ring-[3px] focus-visible:ring-white/30",
              id === platform ? "bg-white/12 text-white" : "text-white/60 hover:text-white"
            )}
          >
            {INSTALL[id].label}
          </button>
        ))}
      </div>

      <ol className="flex flex-col gap-5">
        <li className="flex flex-col gap-2">
          <span className="font-pixel text-xs tracking-[0.08em] text-white/60 uppercase">1 Install</span>
          <CommandLine command={INSTALL[platform].command} className="border-white/12 bg-white/5" />
        </li>
        <li className="flex flex-col gap-2">
          <span className="font-pixel text-xs tracking-[0.08em] text-white/60 uppercase">2 Start in your project</span>
          <CommandLine command={start} className="border-white/12 bg-white/5" />
        </li>
      </ol>
    </div>
  );
}
