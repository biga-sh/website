import type { ComponentType, ReactNode } from "react";

import { cn } from "@/lib/utils";

/**
 * The one shape every "nothing here" and "something failed" state takes in the
 * viewer: what this place is or what went wrong, then the next step. Keeping
 * them identical means a reader learns the pattern once.
 */
export function EmptyState({
    icon: Icon,
    title,
    description,
    children,
    tone = "default",
    className,
}: {
    icon?: ComponentType<{ className?: string; strokeWidth?: number }>;
    title: string;
    description?: ReactNode;
    children?: ReactNode;
    tone?: "default" | "error";
    className?: string;
}) {
    return (
        <div
            className={cn(
                "flex h-full flex-col items-center justify-center gap-3 px-6 py-10 text-center",
                className
            )}
        >
            {Icon && (
                <span
                    aria-hidden
                    className={cn(
                        "grid size-10 place-items-center rounded-lg border",
                        tone === "error"
                            ? "border-destructive/25 bg-destructive/8 text-destructive"
                            : "bg-muted/60 text-muted-foreground"
                    )}
                >
                    <Icon className="size-[18px]" strokeWidth={1.75} />
                </span>
            )}
            <div className="max-w-sm space-y-1">
                <p className="text-sm font-medium text-balance">{title}</p>
                {description && (
                    <div className="text-muted-foreground text-[13px] leading-relaxed text-pretty">
                        {description}
                    </div>
                )}
            </div>
            {children && (
                <div className="mt-1 flex flex-wrap items-center justify-center gap-2">
                    {children}
                </div>
            )}
        </div>
    );
}
