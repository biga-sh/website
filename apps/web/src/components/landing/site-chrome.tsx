"use client";

import Link from "next/link";
import { useEffect, useRef } from "react";

import { NavAnchor } from "@/components/landing/nav-anchor";
import { GitHubGlyph } from "@/components/landing/primitives";
import { ModeToggle } from "@/components/mode-toggle";
import { SpireMark } from "@/components/spire-mark";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export const GITHUB_URL = "https://github.com/ZenshiLabs/spire";
export const NPM_URL = "https://www.npmjs.com/package/@zenshilabs/spire";

export const CONTAINER = "mx-auto w-full max-w-6xl px-4 sm:px-6";

const SECTION_LINKS = [
  { section: "how", label: "How it works" },
  { section: "viewer", label: "Demo" },
];

/**
 * The nav starts transparent and borderless, so the hero diagram reads as
 * full-bleed underneath it. An IntersectionObserver on a 1px sentinel (not a
 * scroll listener) flips `data-scrolled` once the page has moved, which
 * turns on the glass pill, border and shadow over a 240ms transition.
 */
export function SiteHeader() {
  const pillRef = useRef<HTMLDivElement>(null);
  const sentinelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const pill = pillRef.current;
    const sentinel = sentinelRef.current;
    if (!pill || !sentinel || typeof IntersectionObserver === "undefined") {
      return;
    }
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (!entry) {
          return;
        }
        pill.dataset.scrolled = entry.isIntersecting ? "false" : "true";
      },
      { threshold: 1 }
    );
    observer.observe(sentinel);
    return () => observer.disconnect();
  }, []);

  return (
    <>
      <div ref={sentinelRef} aria-hidden className="pointer-events-none absolute top-0 h-px w-px" />
      <header className="sticky top-2 z-40 sm:top-3">
        <a
          href="#content"
          className="focus:bg-background focus:ring-ring sr-only focus:not-sr-only focus:fixed focus:top-2 focus:left-2 focus:z-50 focus:rounded-full focus:px-4 focus:py-2 focus:text-sm focus:shadow-md focus:ring-2"
        >
          Skip to content
        </a>
        <div className={CONTAINER}>
          <div
            ref={pillRef}
            data-scrolled="false"
            className={cn(
              "flex h-14 items-center gap-2 rounded-full border border-transparent pr-2 pl-4 transition-[background-color,border-color,box-shadow] duration-200 ease-out sm:pl-5",
              "data-[scrolled=true]:spire-glass data-[scrolled=true]:border-border/60 data-[scrolled=true]:shadow-[0_1px_1px_oklch(0_0_0_/_0.03),0_18px_40px_-32px_oklch(0_0_0_/_0.4)]"
            )}
          >
            <Link
              href="/"
              aria-label="Spire home"
              className="focus-visible:ring-ring/50 flex shrink-0 items-center gap-2.5 rounded-full outline-none focus-visible:ring-[3px]"
            >
              <SpireMark size={20} />
              <span translate="no" className="text-[15px] font-semibold tracking-tight">
                Spire
              </span>
            </Link>

            <nav className="ml-4 hidden items-center gap-1 md:flex lg:ml-6">
              {SECTION_LINKS.map((link) => (
                <NavAnchor
                  key={link.section}
                  section={link.section}
                  className="text-muted-foreground hover:text-foreground cursor-pointer rounded-full px-3 py-1.5 text-[13px] transition-colors"
                >
                  {link.label}
                </NavAnchor>
              ))}
              <Link
                href="/docs"
                className="text-muted-foreground hover:text-foreground rounded-full px-3 py-1.5 text-[13px] transition-colors"
              >
                Docs
              </Link>
            </nav>

            <div className="ml-auto flex items-center gap-1 [&_button]:rounded-full">
              {/* Phones get the one link that leaves the page; the section
                  links above are a desktop convenience. */}
              <Link
                href="/docs"
                className="text-muted-foreground hover:text-foreground rounded-full px-3 py-1.5 text-[13px] transition-colors md:hidden"
              >
                Docs
              </Link>
              <Button asChild variant="ghost" size="icon">
                <a href={GITHUB_URL} target="_blank" rel="noreferrer">
                  <GitHubGlyph className="size-4" />
                  <span className="sr-only">Spire on GitHub</span>
                </a>
              </Button>
              <ModeToggle />
              <Button asChild size="sm" className="ml-1 hidden rounded-full sm:inline-flex">
                <Link href="/docs#getting-started">Get started</Link>
              </Button>
            </div>
          </div>
        </div>
      </header>
    </>
  );
}

const FOOTER_PRODUCT_LINKS = [
  { href: "#how", label: "How it works", anchor: "how" },
  { href: "#viewer", label: "Demo", anchor: "viewer" },
  { href: "/docs", label: "Docs" },
] as const;

const FOOTER_SOURCE_LINKS = [
  { href: GITHUB_URL, label: "GitHub" },
  { href: NPM_URL, label: "npm" },
  { href: `${GITHUB_URL}/issues`, label: "Issues" },
] as const;

/**
 * The footer sits below a full-bleed hairline, the ground the closing
 * section's spire stands on. Everything below it is plain: mark, two link
 * groups, a license line.
 */
export function SiteFooter() {
  return (
    <footer className="border-border/70 border-t">
      <div className={cn(CONTAINER, "grid grid-cols-1 gap-8 py-10 sm:grid-cols-[1.2fr_1fr_1fr] sm:py-12")}>
        <div className="flex flex-col gap-2.5">
          <div className="flex items-center gap-2.5">
            <SpireMark size={18} />
            <span translate="no" className="text-foreground font-medium">
              Spire
            </span>
          </div>
          <p className="text-muted-foreground max-w-[34ch] text-sm leading-relaxed">
            Broadcast a directory, share the link, watch it live. No accounts.
          </p>
        </div>

        <nav aria-label="Product" className="flex flex-col gap-2 text-sm">
          <span className="text-foreground/70 text-xs font-medium tracking-wide">Product</span>
          {FOOTER_PRODUCT_LINKS.map((link) =>
            "anchor" in link ? (
              <NavAnchor
                key={link.label}
                section={link.anchor}
                className="text-muted-foreground hover:text-foreground w-fit cursor-pointer transition-colors"
              >
                {link.label}
              </NavAnchor>
            ) : (
              <Link
                key={link.label}
                href={link.href}
                className="text-muted-foreground hover:text-foreground w-fit transition-colors"
              >
                {link.label}
              </Link>
            )
          )}
        </nav>

        <nav aria-label="Source" className="flex flex-col gap-2 text-sm">
          <span className="text-foreground/70 text-xs font-medium tracking-wide">Source</span>
          {FOOTER_SOURCE_LINKS.map((link) => (
            <a
              key={link.label}
              href={link.href}
              target="_blank"
              rel="noreferrer"
              className="text-muted-foreground hover:text-foreground w-fit transition-colors"
            >
              {link.label}
            </a>
          ))}
        </nav>
      </div>

      <div className={cn(CONTAINER, "border-border/60 text-muted-foreground border-t py-5 text-xs")}>
        MIT licensed · © 2026 ZenshiLabs
      </div>
    </footer>
  );
}
