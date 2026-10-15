import { baseName } from "@spire/types";
import { useFileTreeStore } from "@spire/stores/file-tree-store";
import { toast } from "sonner";

import { fetchFileContent } from "./session-api";

/** Copy text to the clipboard (best-effort). */
export async function copyText(text: string): Promise<boolean> {
    try {
        await navigator.clipboard.writeText(text);
        return true;
    } catch {
        return false;
    }
}

/** Trigger a browser download of text content as a file. */
export function downloadText(path: string, content: string): void {
    const blob = new Blob([content], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = baseName(path);
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    URL.revokeObjectURL(url);
}

/*
 * The helpers below run from menus, which close before any inline feedback
 * could be seen, so they confirm with a toast instead.
 */

/** Copy text and confirm with a toast; `what` names the thing copied. */
export async function copyWithToast(text: string, what: string): Promise<void> {
    if (await copyText(text)) {
        toast.success(`Copied ${what}`);
    } else {
        toast.error(`Unable to copy ${what}`, {
            description: "The browser blocked clipboard access.",
        });
    }
}

/** Resolve a file's current content (cache-first) for a menu action. */
async function currentContent(sessionId: string, path: string): Promise<string | null> {
    const meta = useFileTreeStore.getState().headMeta.get(path);
    try {
        const result = await fetchFileContent(sessionId, path, meta?.hash ?? "latest");
        return result.content;
    } catch {
        // A live session can delete the file between the click and the fetch.
        toast.error(`Unable to load ${baseName(path)}`, {
            description: "It may have been deleted since the tree last updated.",
        });
        return null;
    }
}

export async function copyFileContent(sessionId: string, path: string): Promise<void> {
    const content = await currentContent(sessionId, path);
    if (content !== null) {
        await copyWithToast(content, `contents of ${baseName(path)}`);
    }
}

export async function downloadFile(sessionId: string, path: string): Promise<void> {
    const content = await currentContent(sessionId, path);
    if (content !== null) {
        downloadText(path, content);
    }
}
