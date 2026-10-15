"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { ChangeType, CheckpointChange, SSEEvent } from "@biga/types";
import { useEditorStore } from "@biga/stores/editor-store";
import { useFileTreeStore } from "@biga/stores/file-tree-store";
import { useHistoryStore } from "@biga/stores/history-store";
import { useSessionStore } from "@biga/stores/session-store";
import { useViewerPrefsStore } from "@biga/stores/viewer-prefs-store";

import { contentCache } from "./content-cache";
import { firstViewableChange, preferredFilePath } from "./reconstruct";
import {
    ApiError,
    fetchCheckpoint,
    fetchSessionState,
    type ApiErrorKind,
    type SessionState,
} from "./session-api";

/**
 * - `connecting`: first load, nothing to show yet.
 * - `live`: hydrated and subscribed.
 * - `reconnecting`: the stream dropped and the browser is retrying on its own.
 * - `offline`: the stream closed for good; the files show the last state seen.
 * - `ended`: the broadcaster stopped; the files are the final state.
 * - `unavailable`: the first load failed, so there is nothing to show.
 */
export type StreamStatus =
    | "connecting"
    | "live"
    | "reconnecting"
    | "offline"
    | "ended"
    | "unavailable";

export const STATUS_LABELS: Record<StreamStatus, string> = {
    connecting: "Connecting",
    live: "Live",
    reconnecting: "Reconnecting",
    offline: "Offline",
    ended: "Ended",
    unavailable: "Unavailable",
};

/** Dot colour per status. Live uses the viewer blue: the one accent means "now". */
export const STATUS_DOT: Record<StreamStatus, string> = {
    connecting: "bg-warning",
    live: "bg-biga",
    reconnecting: "bg-warning",
    offline: "bg-destructive",
    ended: "bg-muted-foreground",
    unavailable: "bg-destructive",
};

export type LoadError = { kind: ApiErrorKind };

type StreamResult = {
    status: StreamStatus;
    /** True once the stores are hydrated and the first file has been chosen. */
    ready: boolean;
    /** Why the first load failed. Only set while `status` is `unavailable`. */
    error: LoadError | null;
    /** Full teardown and reload. For a session that never loaded. */
    retry: () => void;
    /** Re-open the live stream and catch up, keeping open tabs and state. */
    reconnect: () => void;
};

export function decorationsFromChanges(
    changes: CheckpointChange[]
): Map<string, ChangeType> {
    const map = new Map<string, ChangeType>();
    for (const change of changes) {
        map.set(change.path, change.changeType);
    }
    return map;
}

export type EventStores = {
    history: Pick<ReturnType<typeof useHistoryStore.getState>, "addLive" | "selectedSeq">;
    tree: Pick<ReturnType<typeof useFileTreeStore.getState>, "applyChanges" | "setDecorations" | "setTree">;
    session: Pick<ReturnType<typeof useSessionStore.getState>, "setStatus">;
};

/**
 * Applies a single SSE event to the provided stores. Pure function — no React
 * hooks, no I/O. `onSessionEnded` is a callback so the hook can close the
 * EventSource and update React state without coupling this function to either.
 *
 * Extracting this makes the store-mutation logic testable by passing mock
 * stores directly, without mounting a component or mocking EventSource.
 */
export function applySSEEvent(
    event: SSEEvent,
    stores: EventStores,
    onSessionEnded: () => void
): void {
    if (event.type === "checkpoint") {
        const checkpoint = event.payload;
        stores.history.addLive(checkpoint);
        stores.tree.applyChanges(checkpoint.changes);
        if (stores.history.selectedSeq === null) {
            stores.tree.setDecorations(decorationsFromChanges(checkpoint.changes));
        }
        return;
    }

    if (event.type === "snapshot") {
        stores.tree.setTree(event.payload.tree);
        return;
    }

    if (event.type === "session_ended") {
        stores.session.setStatus("ended");
        onSessionEnded();
    }
}

export type HydrateStores = {
    session: Pick<ReturnType<typeof useSessionStore.getState>, "setSession" | "setLoadMode">;
    history: Pick<ReturnType<typeof useHistoryStore.getState>, "setInitial">;
    tree: Pick<ReturnType<typeof useFileTreeStore.getState>, "setTree">;
};

/**
 * Populates all session stores from the initial `/state` payload. Pure
 * function — no React hooks, no network calls. Returns the file to fall back
 * on when no recent change points somewhere better.
 *
 * Testable by passing mock stores and a SessionState fixture without mounting
 * a component or stubbing fetch.
 */
export function hydrateStoresFromState(
    state: SessionState,
    stores: HydrateStores,
    cache: Pick<typeof contentCache, "prefill">
): { fallbackFile: string | undefined } {
    stores.session.setSession(state.session);
    stores.session.setLoadMode(state.mode);
    stores.history.setInitial(state.checkpoints);

    if (state.contents) {
        cache.prefill(state.contents);
    }

    let fallbackFile: string | undefined;
    if (state.snapshot) {
        stores.tree.setTree(state.snapshot.tree);
        fallbackFile = preferredFilePath(state.snapshot.tree);
    }

    return { fallbackFile };
}

/** Open a file in the editor and reveal it in the tree. */
function revealFile(path: string) {
    const tree = useFileTreeStore.getState();
    tree.setSelectedPath(path);
    tree.expandAncestors(path);
    useEditorStore.getState().openFile(path);
}

function toLoadError(caught: unknown): LoadError {
    return { kind: caught instanceof ApiError ? caught.kind : "server" };
}

/**
 * Hydrates all session stores from the `/state` endpoint on mount, then
 * subscribes to the live SSE stream for checkpoint, snapshot, and session-ended
 * events. All session data lives in the shared Zustand stores and the content-
 * addressed cache — this hook only surfaces the connection status and, when the
 * first load fails, why.
 */
export function useSessionStream(sessionId: string): StreamResult {
    const [status, setStatus] = useState<StreamStatus>("connecting");
    const [error, setError] = useState<LoadError | null>(null);
    const [ready, setReady] = useState(false);
    // Bumping this re-runs the effect below: full teardown + re-hydrate + resubscribe.
    const [retryNonce, setRetryNonce] = useState(0);
    // Set by the effect so the manual "Reconnect" action can reach its closure.
    const reconnectRef = useRef<() => void>(() => {});

    useEffect(() => {
        let eventSource: EventSource | null = null;
        const abortController = new AbortController();
        let cancelled = false;
        // True once the stream has dropped, so the next open knows to catch up.
        let interrupted = false;
        let ended = false;

        const markEnded = () => {
            ended = true;
            setStatus("ended");
            eventSource?.close();
        };

        const handleEvent = (event: SSEEvent) => {
            applySSEEvent(
                event,
                {
                    history: useHistoryStore.getState(),
                    tree: useFileTreeStore.getState(),
                    session: useSessionStore.getState(),
                },
                markEnded
            );

            // Follow mode: bring the file the broadcaster just saved to the
            // front, unless the viewer is busy browsing an older checkpoint.
            if (
                event.type === "checkpoint" &&
                useViewerPrefsStore.getState().follow &&
                useHistoryStore.getState().selectedSeq === null
            ) {
                const path = firstViewableChange(event.payload.changes);
                if (path) {
                    revealFile(path);
                }
            }
        };

        /**
         * Catch up after the stream was interrupted. Events published while the
         * browser was reconnecting were never delivered, so re-read the current
         * state and merge it in without disturbing open tabs or the selection.
         */
        const resync = async () => {
            try {
                const state = await fetchSessionState(sessionId, abortController.signal);
                if (cancelled) {
                    return;
                }
                if (state.contents) {
                    contentCache.prefill(state.contents);
                }
                if (state.snapshot) {
                    useFileTreeStore.getState().setTree(state.snapshot.tree);
                }
                useHistoryStore.getState().mergeNewer(state.checkpoints);
                useSessionStore.getState().setSession(state.session);
                if (state.session.status !== "active") {
                    markEnded();
                }
            } catch {
                // Best effort: the stream is back, and the next save will
                // bring the tree up to date regardless.
            }
        };

        const connect = () => {
            eventSource?.close();
            const source = new EventSource(`/api/sessions/${sessionId}/stream`);
            eventSource = source;

            const forward = (raw: MessageEvent<string>) => {
                let event: SSEEvent;
                try {
                    event = JSON.parse(raw.data) as SSEEvent;
                } catch {
                    /**
                     * Malformed or non-JSON frames (such as SSE keepalive comments) are
                     * silently discarded — they do not represent application events.
                     * Only parsing is guarded: a bug while applying an event should
                     * surface, not vanish.
                     */
                    return;
                }
                handleEvent(event);
            };

            const onOpen = () => {
                if (ended) {
                    return;
                }
                setStatus("live");
                if (interrupted) {
                    interrupted = false;
                    void resync();
                }
            };

            source.addEventListener("checkpoint", forward);
            source.addEventListener("snapshot", forward);
            source.addEventListener("session_ended", forward);
            source.addEventListener("connected", onOpen);
            source.onopen = onOpen;
            source.onerror = () => {
                if (ended) {
                    return;
                }
                interrupted = true;
                // CONNECTING means the browser is already retrying; CLOSED
                // means it gave up (e.g. the server answered with an error).
                setStatus(source.readyState === EventSource.CLOSED ? "offline" : "reconnecting");
            };
        };

        reconnectRef.current = () => {
            if (ended || cancelled) {
                return;
            }
            interrupted = true;
            setStatus("reconnecting");
            connect();
        };

        /**
         * Open the most recently changed file so a new viewer lands where the
         * action is, with the tree marking what that save touched. Falls back
         * to the README or first file when there is no change to point at.
         */
        const openInitialFile = async (state: SessionState, fallbackFile: string | undefined) => {
            const latest = state.checkpoints.reduce<SessionState["checkpoints"][number] | undefined>(
                (best, checkpoint) => (!best || checkpoint.seq > best.seq ? checkpoint : best),
                undefined
            );
            if (latest && latest.seq > 0) {
                try {
                    const checkpoint = await fetchCheckpoint(sessionId, latest.seq, abortController.signal);
                    if (cancelled) {
                        return;
                    }
                    useHistoryStore.getState().cacheCheckpoint(checkpoint);
                    useFileTreeStore
                        .getState()
                        .setDecorations(decorationsFromChanges(checkpoint.changes));
                    const path = firstViewableChange(checkpoint.changes);
                    if (path && useFileTreeStore.getState().headMeta.has(path)) {
                        revealFile(path);
                        return;
                    }
                } catch {
                    if (cancelled) {
                        return;
                    }
                }
            }
            if (fallbackFile) {
                revealFile(fallbackFile);
            }
        };

        const hydrate = async () => {
            try {
                const state = await fetchSessionState(sessionId, abortController.signal);
                if (cancelled) {
                    return;
                }

                const { fallbackFile } = hydrateStoresFromState(
                    state,
                    {
                        session: useSessionStore.getState(),
                        history: useHistoryStore.getState(),
                        tree: useFileTreeStore.getState(),
                    },
                    contentCache
                );
                await openInitialFile(state, fallbackFile);
                if (cancelled) {
                    return;
                }
                setReady(true);

                if (state.session.status !== "active") {
                    ended = true;
                    setStatus("ended");
                    return;
                }

                connect();
            } catch (caught) {
                if (cancelled || abortController.signal.aborted) {
                    return;
                }
                setError(toLoadError(caught));
                setStatus("unavailable");
            }
        };

        void hydrate();

        return () => {
            cancelled = true;
            reconnectRef.current = () => {};
            abortController.abort();
            eventSource?.close();
            useEditorStore.getState().clearAll();
            useFileTreeStore.getState().clearTree();
            useHistoryStore.getState().clear();
            useSessionStore.getState().clearSession();
            contentCache.clear();
        };
    }, [sessionId, retryNonce]);

    const retry = useCallback(() => {
        setError(null);
        setReady(false);
        setStatus("connecting");
        setRetryNonce((nonce) => nonce + 1);
    }, []);

    const reconnect = useCallback(() => reconnectRef.current(), []);

    return { status, ready, error, retry, reconnect };
}
