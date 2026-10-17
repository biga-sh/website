"use client";

import { useEffect, useState } from "react";

import { CommandLine, INSTALL, PlatformTabs, type Platform } from "@/components/home/install-command";

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

  const startFor = (id: Platform) =>
    !apiUrl
      ? "biga start"
      : id === "windows"
        ? `$env:BIGA_API_URL="${apiUrl}"; biga start`
        : `BIGA_API_URL=${apiUrl} biga start`;

  return (
    <PlatformTabs platforms={PLATFORMS} value={platform} onValueChange={setPlatform} tone="terminal" className="gap-5">
      {(id) => (
        <ol className="flex flex-col gap-5">
          <li className="flex flex-col gap-2">
            <span className="font-pixel text-xs tracking-[0.08em] text-white/60 uppercase">1 Install</span>
            <CommandLine command={INSTALL[id].command} className="border-white/12 bg-white/5" />
          </li>
          <li className="flex flex-col gap-2">
            <span className="font-pixel text-xs tracking-[0.08em] text-white/60 uppercase">2 Start in your project</span>
            <CommandLine command={startFor(id)} className="border-white/12 bg-white/5" />
          </li>
        </ol>
      )}
    </PlatformTabs>
  );
}
