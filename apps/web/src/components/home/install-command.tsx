"use client";

import { useEffect, useState } from "react";

import { CopyGlyph } from "@/components/copy-glyph";
import { cn } from "@/lib/utils";

export const INSTALL = {
  unix: {
    label: "macOS / Linux",
    command: "curl -fsSL https://raw.githubusercontent.com/biga-sh/cli/main/install.sh | sh",
  },
  windows: {
    label: "Windows",
    command: "irm https://raw.githubusercontent.com/biga-sh/cli/main/install.ps1 | iex",
  },
  go: {
    label: "Go",
    command: "go install github.com/biga-sh/cli/cmd/biga@latest",
  },
} as const;

export type Platform = keyof typeof INSTALL;

function useCopy(text: string) {
  const [copied, setCopied] = useState(false);
  useEffect(() => {
    if (!copied) return;
    const timer = setTimeout(() => setCopied(false), 1600);
    return () => clearTimeout(timer);
  }, [copied]);
  return {
    copied,
    copy: async () => {
      try {
        await navigator.clipboard.writeText(text);
        setCopied(true);
      } catch {
        setCopied(false);
      }
    },
  };
}

/**
 * A shell command in a dark pill with a copy button. Long commands scroll
 * sideways inside the pill (with a fade at the trailing edge as the cue)
 * rather than truncating, so the whole command is always reachable.
 */
export function CommandLine({ command, className }: { command: string; className?: string }) {
  const { copied, copy } = useCopy(command);
  return (
    <div
      className={cn(
        "bg-terminal text-terminal-foreground flex h-12 min-w-0 items-center gap-1 rounded-full border border-white/10 pr-1.5 pl-4",
        "shadow-[0_1px_1px_oklch(0_0_0_/_0.05),0_18px_40px_-28px_oklch(0_0_0_/_0.6)]",
        className
      )}
    >
      <span aria-hidden className="text-brand-mark shrink-0 font-mono text-sm select-none">
        $
      </span>
      <div
        tabIndex={0}
        role="region"
        aria-label="Command"
        className="focus-visible:ring-brand-mark/50 min-w-0 flex-1 overflow-x-auto rounded-sm px-1 outline-none [scrollbar-width:none] focus-visible:ring-2 [&::-webkit-scrollbar]:hidden"
        style={{ maskImage: "linear-gradient(to right, black calc(100% - 2rem), transparent)" }}
      >
        <code translate="no" className="block pr-8 font-mono text-[13px] whitespace-nowrap sm:text-sm">
          {command}
        </code>
      </div>
      <button
        type="button"
        onClick={copy}
        className="hover:bg-terminal-foreground/15 focus-visible:ring-brand-mark/50 bg-terminal-foreground/10 grid size-9 shrink-0 place-items-center rounded-full outline-none transition-colors focus-visible:ring-[3px] active:scale-[0.96]"
      >
        <CopyGlyph copied={copied} checkClassName="text-brand-mark" />
        <span className="sr-only">{copied ? "Copied" : "Copy command"}</span>
      </button>
      <span aria-live="polite" className="sr-only">
        {copied ? "Copied to clipboard" : ""}
      </span>
    </div>
  );
}

/** Install one-liner with a platform switch above it. */
export function InstallCommand({
  platforms = ["unix", "windows"],
  className,
}: {
  platforms?: Platform[];
  className?: string;
}) {
  const [active, setActive] = useState<Platform>(platforms[0] ?? "unix");

  // Start on the visitor's platform once we can see it.
  useEffect(() => {
    if (platforms.includes("windows") && /Win/i.test(navigator.platform)) {
      setActive("windows");
    }
  }, [platforms]);

  return (
    <div className={cn("flex w-full min-w-0 flex-col gap-2", className)}>
      <div role="group" aria-label="Platform" className="flex gap-1">
        {platforms.map((platform) => (
          <button
            key={platform}
            type="button"
            aria-pressed={platform === active}
            onClick={() => setActive(platform)}
            className={cn(
              "font-body focus-visible:ring-ring/50 rounded-full px-3 py-1.5 text-xs font-medium outline-none transition-colors focus-visible:ring-[3px]",
              platform === active ? "bg-muted text-foreground" : "text-muted-foreground hover:text-foreground"
            )}
          >
            {INSTALL[platform].label}
          </button>
        ))}
      </div>
      <CommandLine command={INSTALL[active].command} />
    </div>
  );
}
