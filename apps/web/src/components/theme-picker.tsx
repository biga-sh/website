"use client";

import { useThemeStore } from "@spire/stores/theme-store";
import { CheckIcon, PaletteIcon } from "lucide-react";
import { useTheme } from "next-themes";
import { useEffect, useState } from "react";

import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import {
    Command,
    CommandEmpty,
    CommandGroup,
    CommandInput,
    CommandItem,
    CommandList,
} from "@/components/ui/command";
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from "@/components/ui/popover";
import { EDITOR_THEMES } from "@/lib/shiki";
import { cn } from "@/lib/utils";

const LIGHT_THEMES = EDITOR_THEMES.filter((theme) => theme.kind === "light");
const DARK_THEMES = EDITOR_THEMES.filter((theme) => theme.kind === "dark");

export function ThemePicker() {
    const [open, setOpen] = useState(false);
    const [mounted, setMounted] = useState(false);
    const { setTheme } = useTheme();
    const editorTheme = useThemeStore((state) => state.editorTheme);
    const setEditorTheme = useThemeStore((state) => state.setEditorTheme);

    /**
     * Defers theme label rendering until after client hydration. The persisted
     * editor theme is read from localStorage and is not available during SSR,
     * so rendering before mount would produce a hydration mismatch.
     */
    useEffect(() => setMounted(true), []);

    const select = (id: string, mode: "light" | "dark" | "system") => {
        setEditorTheme(id);
        setTheme(mode);
        setOpen(false);
    };

    const current = EDITOR_THEMES.find((theme) => theme.id === editorTheme);
    const label = !mounted
        ? "Editor theme"
        : editorTheme === "auto"
          ? "Editor theme: match system"
          : `Editor theme: ${current?.label ?? editorTheme}`;

    const renderItem = (id: string, name: string, mode: "light" | "dark" | "system") => (
        <CommandItem key={id} value={`${name} ${id}`} onSelect={() => select(id, mode)}>
            <CheckIcon
                className={cn(
                    "size-4",
                    editorTheme === id ? "opacity-100" : "opacity-0"
                )}
            />
            {name}
        </CommandItem>
    );

    return (
        <Popover open={open} onOpenChange={setOpen}>
            <Tooltip>
                <TooltipTrigger asChild>
                    <PopoverTrigger asChild>
                        <Button
                            variant="ghost"
                            size="icon-sm"
                            aria-label={label}
                            className="text-muted-foreground hover:text-foreground"
                        >
                            <PaletteIcon className="size-4" />
                        </Button>
                    </PopoverTrigger>
                </TooltipTrigger>
                <TooltipContent>{label}</TooltipContent>
            </Tooltip>
            <PopoverContent align="end" className="w-60 p-0">
                <Command>
                    <CommandInput placeholder="Search themes…" aria-label="Search editor themes" />
                    <CommandList>
                        <CommandEmpty>No themes match.</CommandEmpty>
                        <CommandGroup heading="System">
                            {renderItem("auto", "Match system", "system")}
                        </CommandGroup>
                        <CommandGroup heading="Light">
                            {LIGHT_THEMES.map((theme) =>
                                renderItem(theme.id, theme.label, "light")
                            )}
                        </CommandGroup>
                        <CommandGroup heading="Dark">
                            {DARK_THEMES.map((theme) =>
                                renderItem(theme.id, theme.label, "dark")
                            )}
                        </CommandGroup>
                    </CommandList>
                </Command>
            </PopoverContent>
        </Popover>
    );
}
