"use client";

import { ArrowRightIcon, Loader2Icon } from "lucide-react";
import { useRouter } from "next/navigation";
import { type FormEvent, useId, useRef, useState, useTransition } from "react";

import { IconWell } from "@/components/landing/primitives";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

const SESSION_ID_RE = /^[A-Za-z0-9_-]{1,64}$/;

/**
 * Accepts what people actually paste: a bare id, or the whole share link
 * (with or without a protocol, query string or trailing slash).
 */
export function parseSessionInput(raw: string): string | null {
    const value = raw.trim();
    if (!value) {
        return null;
    }
    const fromUrl = /\/session\/([^/?#\s]+)/.exec(value)?.[1];
    const candidate = fromUrl ? decodeURIComponent(fromUrl) : value;
    return SESSION_ID_RE.test(candidate) ? candidate : null;
}

const TONE = {
    terminal: {
        label: "text-terminal-foreground/70",
        input: "border-terminal-foreground/20 bg-terminal-foreground/5 text-terminal-foreground placeholder:text-terminal-foreground/60 focus-visible:border-terminal-accent focus-visible:ring-terminal-accent/40",
        hint: "text-terminal-foreground/60",
        error: "text-[oklch(0.78_0.15_25)]",
    },
    default: {
        label: "text-foreground",
        input: "",
        hint: "text-muted-foreground",
        error: "text-destructive",
    },
} as const;

export function JoinForm({
    tone = "terminal",
    className,
    buttonClassName,
}: {
    tone?: keyof typeof TONE;
    className?: string;
    /** Overrides the submit button's fill, for surfaces with their own accent. */
    buttonClassName?: string;
}) {
    const router = useRouter();
    const id = useId();
    const inputRef = useRef<HTMLInputElement>(null);
    const [value, setValue] = useState("");
    const [error, setError] = useState<string | null>(null);
    const [pending, startTransition] = useTransition();
    const styles = TONE[tone];

    function onSubmit(event: FormEvent) {
        event.preventDefault();
        const sessionId = parseSessionInput(value);
        if (!sessionId) {
            setError(
                value.trim()
                    ? "Use a share link or a session ID made of letters and numbers, like k3f9zq2a."
                    : "Enter a session ID or paste a share link."
            );
            inputRef.current?.focus();
            return;
        }
        setError(null);
        startTransition(() => router.push(`/session/${encodeURIComponent(sessionId)}`));
    }

    const hintId = `${id}-hint`;
    const errorId = `${id}-error`;

    return (
        <form onSubmit={onSubmit} noValidate className={cn("flex flex-col gap-2", className)}>
            <Label htmlFor={id} className={cn("text-xs font-medium", styles.label)}>
                Session ID or share link
            </Label>

            <div className="flex flex-col gap-2 sm:flex-row">
                <Input
                    ref={inputRef}
                    id={id}
                    name="session"
                    value={value}
                    onChange={(event) => {
                        setValue(event.target.value);
                        if (error) {
                            setError(null);
                        }
                    }}
                    placeholder="k3f9zq2a"
                    autoComplete="off"
                    autoCapitalize="off"
                    spellCheck={false}
                    aria-invalid={error ? true : undefined}
                    aria-describedby={error ? errorId : hintId}
                    className={cn("h-12 w-full rounded-full px-5 font-mono text-sm", styles.input)}
                />

                <Button
                    type="submit"
                    disabled={pending}
                    className={cn(
                        "group bg-biga-solid text-biga-foreground hover:bg-biga-solid/90 h-12 shrink-0 gap-2 rounded-full py-0 pr-1.5 pl-5 text-sm font-medium",
                        buttonClassName
                    )}
                >
                    {pending ? "Opening…" : "Open session"}
                    <IconWell className="bg-biga-foreground/15">
                        {pending ? (
                            <Loader2Icon className="size-4 animate-spin" strokeWidth={1.5} />
                        ) : (
                            <ArrowRightIcon className="size-4" strokeWidth={1.5} />
                        )}
                    </IconWell>
                </Button>
            </div>

            {error ? (
                <p id={errorId} className={cn("text-xs", styles.error)}>
                    {error}
                </p>
            ) : (
                <p id={hintId} className={cn("text-xs", styles.hint)}>
                    Viewers are read-only. Nothing is installed, and no account is created.
                </p>
            )}
        </form>
    );
}
