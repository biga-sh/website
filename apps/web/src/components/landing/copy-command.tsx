"use client";

import { useEffect, useState } from "react";

import { CopyGlyph } from "@/components/copy-glyph";
import { IconWell } from "@/components/landing/primitives";
import { Button } from "@/components/ui/button";
import { installCommand, SHELLS, type Shell } from "@/lib/landing-demo";
import { cn } from "@/lib/utils";

function useCopy(command: string) {
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!copied) {
      return;
    }
    const timer = setTimeout(() => setCopied(false), 1600);
    return () => clearTimeout(timer);
  }, [copied]);

  async function copy() {
    try {
      await navigator.clipboard.writeText(command);
      setCopied(true);
    } catch {
      setCopied(false);
    }
  }

  return { copied, copy };
}

export function CopyCommand({
  command,
  className,
  size = "default",
}: {
  command: string;
  className?: string;
  size?: "default" | "lg";
}) {
  const { copied, copy } = useCopy(command);

  return (
    <>
      <Button
        type="button"
        onClick={copy}
        aria-label={`Copy command: ${command}`}
        className={cn(
          "group border-terminal-foreground/10 bg-terminal text-terminal-foreground flex w-full min-w-0 gap-2.5 rounded-full border py-0 pr-1.5 pl-4 font-mono sm:gap-3",
          size === "lg" ? "h-13 text-[13px] sm:pl-5 sm:text-sm" : "h-12 text-xs sm:pl-5 sm:text-sm",
          "hover:bg-terminal hover:border-terminal-accent/60 hover:text-terminal-foreground",
          "shadow-[0_1px_1px_oklch(0_0_0_/_0.05),0_18px_40px_-28px_oklch(0_0_0_/_0.6)]",
          "focus-visible:ring-terminal-accent/50 focus-visible:ring-[3px]",
          className
        )}
      >
        <span aria-hidden className="text-terminal-accent shrink-0 select-none">
          $
        </span>
        {/* Keyed on the command so switching shell reads as a change, not a
            silent swap. */}
        <span
          key={command}
          translate="no"
          className="motion-safe:animate-in motion-safe:fade-in min-w-0 flex-1 truncate text-left motion-safe:duration-150"
        >
          {command}
        </span>
        <IconWell className="bg-terminal-foreground/10 group-hover:bg-terminal-foreground/15">
          <CopyGlyph copied={copied} checkClassName="text-terminal-accent" />
        </IconWell>
      </Button>
      <span aria-live="polite" className="sr-only">
        {copied ? "Copied" : ""}
      </span>
    </>
  );
}

const TAB_TONE = {
  default: {
    active: "bg-muted text-foreground font-medium",
    idle: "text-muted-foreground hover:text-foreground",
  },
  terminal: {
    active: "bg-terminal-foreground/10 text-terminal-foreground font-medium",
    idle: "text-terminal-foreground/65 hover:text-terminal-foreground",
  },
} as const;

/**
 * The site's primary command: `SPIRE_API_URL=<this site> npx
 * @zenshilabs/spire start`. The CLI defaults to localhost, so the env var
 * is what turns the printed link into one anyone can actually open.
 */
export function InstallCommand({
  siteUrl,
  tone = "default",
  size = "default",
  className,
}: {
  siteUrl: string;
  tone?: keyof typeof TAB_TONE;
  size?: "default" | "lg";
  className?: string;
}) {
  const [active, setActive] = useState<Shell>("bash");

  return (
    <div className={cn("w-full min-w-0", className)}>
      <div role="group" aria-label="Shell" className="mb-2 flex gap-1">
        {SHELLS.map((shell) => (
          <button
            key={shell.id}
            type="button"
            aria-pressed={shell.id === active}
            onClick={() => setActive(shell.id)}
            className={cn(
              "focus-visible:ring-spire/50 rounded-full px-2.5 py-1 text-xs transition-colors outline-none focus-visible:ring-[3px] pointer-coarse:px-3 pointer-coarse:py-1.5",
              shell.id === active ? TAB_TONE[tone].active : TAB_TONE[tone].idle
            )}
          >
            {shell.label}
          </button>
        ))}
      </div>

      <CopyCommand command={installCommand(active, siteUrl)} size={size} />
    </div>
  );
}
