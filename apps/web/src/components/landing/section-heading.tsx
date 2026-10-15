import type { ReactNode } from "react";

import { Reveal } from "@/components/landing/reveal";
import { cn } from "@/lib/utils";

export function SectionHeading({
  eyebrow,
  title,
  lead,
  className,
  align = "start",
}: {
  eyebrow?: string;
  title: ReactNode;
  lead?: ReactNode;
  className?: string;
  align?: "start" | "center";
}) {
  return (
    <Reveal className={cn("max-w-2xl", align === "center" && "mx-auto text-center", className)}>
      {eyebrow && (
        <p className="text-spire mb-3 font-mono text-[11px] tracking-[0.08em] uppercase">{eyebrow}</p>
      )}
      <h2 className="text-title text-balance">{title}</h2>
      {lead && (
        <p className="text-muted-foreground mt-3 max-w-[52ch] text-sm leading-relaxed text-pretty sm:text-[15px]">
          {lead}
        </p>
      )}
    </Reveal>
  );
}
