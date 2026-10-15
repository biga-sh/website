/**
 * Carries a value saved under a key from before the rename to its new key,
 * once, so a reader's saved preferences survive. The old key is removed so
 * this has nothing left to do afterwards. Storage can be unavailable (private
 * windows, blocked site data); then there is nothing to carry over.
 */
export function migrateStorageKey(from: string, to: string): void {
    try {
        if (typeof localStorage === "undefined") {
            return;
        }
        const saved = localStorage.getItem(from);
        if (saved === null) {
            return;
        }
        if (localStorage.getItem(to) === null) {
            localStorage.setItem(to, saved);
        }
        localStorage.removeItem(from);
    } catch {
        // Nothing to carry over.
    }
}
