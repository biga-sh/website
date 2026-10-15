"use client";

import { useFileTreeStore } from "@biga/stores/file-tree-store";
import { baseName } from "@biga/types";
import { useEffect, useMemo, useRef } from "react";

import { FileTypeIcon } from "@/components/file-icon";
import {
    CommandDialog,
    CommandEmpty,
    CommandGroup,
    CommandInput,
    CommandItem,
    CommandList,
} from "@/components/ui/command";
import { Kbd } from "@/components/ui/kbd";
import { CHANGE_META, dirName } from "@/lib/change-meta";
import { cn } from "@/lib/utils";

function FileItem({
    path,
    letter,
    letterClass,
    onSelect,
}: {
    path: string;
    letter?: string;
    letterClass?: string;
    onSelect: (path: string) => void;
}) {
    const dir = dirName(path);
    return (
        <CommandItem value={path} onSelect={() => onSelect(path)} className="gap-2.5 py-2">
            <FileTypeIcon kind="file" name={baseName(path)} className="size-4" />
            <span className="shrink-0 text-[13px] font-medium">{baseName(path)}</span>
            {dir && <span className="text-muted-foreground min-w-0 truncate text-xs">{dir}</span>}
            {letter && (
                <span className={cn("ml-auto shrink-0 font-mono text-[11px] font-semibold", letterClass)}>
                    {letter}
                </span>
            )}
        </CommandItem>
    );
}

/**
 * Go to file (⌘P / Ctrl+P). Opens instantly with no animation: it is used
 * many times an hour, and motion would only make it feel slower. Files touched
 * by the latest save are listed first, since that is usually what a viewer
 * is looking for.
 */
export function QuickOpen({
    open,
    onOpenChange,
    onOpenFile,
}: {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onOpenFile: (path: string) => void;
}) {
    const headMeta = useFileTreeStore((state) => state.headMeta);
    const decorations = useFileTreeStore((state) => state.decorations);
    const openRef = useRef(open);
    useEffect(() => {
        openRef.current = open;
    }, [open]);

    useEffect(() => {
        const onKeyDown = (event: KeyboardEvent) => {
            if ((event.metaKey || event.ctrlKey) && !event.shiftKey && event.key.toLowerCase() === "p") {
                event.preventDefault();
                onOpenChange(!openRef.current);
            }
        };
        window.addEventListener("keydown", onKeyDown);
        return () => window.removeEventListener("keydown", onKeyDown);
    }, [onOpenChange]);

    const { changed, rest } = useMemo(() => {
        const all = [...headMeta.keys()].sort();
        const changedPaths = all.filter((path) => {
            const kind = decorations.get(path);
            return kind !== undefined && kind !== "deleted";
        });
        const changedSet = new Set(changedPaths);
        return { changed: changedPaths, rest: all.filter((path) => !changedSet.has(path)) };
    }, [headMeta, decorations]);

    const select = (path: string) => {
        onOpenFile(path);
        onOpenChange(false);
    };

    return (
        <CommandDialog
            open={open}
            onOpenChange={onOpenChange}
            title="Go to file"
            description="Search the session's files by name or path."
            showCloseButton={false}
            className="top-[12vh] translate-y-0 sm:max-w-xl data-[state=closed]:animate-none data-[state=open]:animate-none"
        >
            <CommandInput placeholder="Search files by name or path…" />
            <CommandList className="max-h-[min(420px,60vh)]">
                <CommandEmpty>No files match.</CommandEmpty>
                {changed.length > 0 && (
                    <CommandGroup heading="Changed in the latest save">
                        {changed.map((path) => {
                            const meta = CHANGE_META[decorations.get(path) ?? "modified"];
                            return (
                                <FileItem
                                    key={path}
                                    path={path}
                                    letter={meta.letter}
                                    letterClass={meta.className}
                                    onSelect={select}
                                />
                            );
                        })}
                    </CommandGroup>
                )}
                <CommandGroup heading={changed.length > 0 ? "All files" : undefined}>
                    {rest.map((path) => (
                        <FileItem key={path} path={path} onSelect={select} />
                    ))}
                </CommandGroup>
            </CommandList>
            <div className="text-muted-foreground flex items-center gap-4 border-t px-3 py-2 text-[11px] max-sm:hidden">
                <span className="flex items-center gap-1">
                    <Kbd>↑</Kbd>
                    <Kbd>↓</Kbd>
                    to move
                </span>
                <span className="flex items-center gap-1">
                    <Kbd>↵</Kbd>
                    to open
                </span>
                <span className="flex items-center gap-1">
                    <Kbd>esc</Kbd>
                    to close
                </span>
            </div>
        </CommandDialog>
    );
}
