"use client";

import { CheckIcon, CopyIcon } from "lucide-react";
import { useEffect, useState } from "react";

import { cn } from "@/lib/utils";

/**
 * A value that copies itself when pressed (a hex code, a class name), and
 * says so in place. The visible text is the value, so the accessible name is
 * what a screen reader user would expect to be copied.
 */
export function CopyValue({ value, label, className }: { value: string; label?: string; className?: string }) {
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!copied) return;
    const timer = setTimeout(() => setCopied(false), 1400);
    return () => clearTimeout(timer);
  }, [copied]);

  return (
    <button
      type="button"
      aria-label={`Copy ${label ?? value}`}
      onClick={() => {
        void navigator.clipboard?.writeText(value).then(() => setCopied(true));
      }}
      className={cn(
        "group/copy hover:bg-foreground/8 focus-visible:ring-ring/50 inline-flex min-h-8 items-center gap-1.5 rounded-md px-1.5 py-1 font-mono text-xs outline-none transition-colors focus-visible:ring-[3px]",
        className
      )}
    >
      <span translate="no">{value}</span>
      {copied ? (
        <CheckIcon aria-hidden className="size-3 shrink-0" strokeWidth={2} />
      ) : (
        <CopyIcon aria-hidden className="size-3 shrink-0 opacity-50 transition-opacity group-hover/copy:opacity-100" strokeWidth={1.75} />
      )}
      <span role="status" className="sr-only">
        {copied ? "Copied" : ""}
      </span>
    </button>
  );
}
