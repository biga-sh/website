import { create } from "zustand";
import { persist } from "zustand/middleware";

import { migrateStorageKey } from "./migrate-storage.js";

// Saved under the product's old name before the rename to biga.
migrateStorageKey("spire-viewer-prefs", "biga-viewer-prefs");

export type DiffLayout = "unified" | "split";

/**
 * Viewer preferences that outlive a single session: how diffs are laid out,
 * whether long lines wrap, and whether the editor follows the broadcaster to
 * each file they save. Stored in localStorage under `"biga-viewer-prefs"` so
 * the two diff surfaces (editor compare mode and the timeline) always agree.
 */
interface ViewerPrefsState {
    diffLayout: DiffLayout;
    wordWrap: boolean;
    follow: boolean;
    setDiffLayout: (layout: DiffLayout) => void;
    setWordWrap: (wrap: boolean) => void;
    setFollow: (follow: boolean) => void;
}

export const useViewerPrefsStore = create<ViewerPrefsState>()(
    persist(
        (set) => ({
            diffLayout: "split",
            wordWrap: false,
            follow: true,
            setDiffLayout: (diffLayout) => set({ diffLayout }),
            setWordWrap: (wordWrap) => set({ wordWrap }),
            setFollow: (follow) => set({ follow }),
        }),
        { name: "biga-viewer-prefs" }
    )
);
