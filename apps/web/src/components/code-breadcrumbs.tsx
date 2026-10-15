"use client";

import { ChevronRightIcon } from "lucide-react";
import { Fragment, useLayoutEffect, useRef } from "react";

/**
 * The open file's path. When it doesn't fit, it stays scrolled to the end so
 * the file name, the part that matters, is the part you see.
 */
export function CodeBreadcrumbs({ path }: { path: string }) {
    const segments = path.split("/");
    const scrollRef = useRef<HTMLElement>(null);

    useLayoutEffect(() => {
        const element = scrollRef.current;
        if (element) {
            element.scrollLeft = element.scrollWidth;
        }
    }, [path]);

    return (
        <nav
            ref={scrollRef}
            aria-label="File path"
            className="min-w-0 flex-1 overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
        >
            <ol className="text-muted-foreground flex w-max items-center gap-0.5 px-3 text-xs">
                {segments.map((segment, index) => {
                    const last = index === segments.length - 1;
                    return (
                        <Fragment key={index}>
                            {index > 0 && (
                                <li aria-hidden className="text-muted-foreground/60 flex">
                                    <ChevronRightIcon className="size-3" />
                                </li>
                            )}
                            <li
                                aria-current={last ? "page" : undefined}
                                className={last ? "text-foreground" : undefined}
                            >
                                {segment}
                            </li>
                        </Fragment>
                    );
                })}
            </ol>
        </nav>
    );
}
