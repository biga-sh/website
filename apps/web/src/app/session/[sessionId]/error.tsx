"use client";

import { useParams, useSearchParams } from "next/navigation";
import { useEffect } from "react";

import { SessionUnavailable } from "./session-unavailable";

/**
 * Catches anything the viewer throws while rendering or in an effect (an
 * editor that fails to initialise, a malformed event) so the reader gets the
 * same "try again" screen as a failed load instead of a blank page.
 */
export default function SessionError({
    error,
    reset,
}: {
    error: Error & { digest?: string };
    reset: () => void;
}) {
    const { sessionId } = useParams<{ sessionId: string }>();
    const embed = useSearchParams().get("embed") === "1";

    useEffect(() => {
        console.error(error);
    }, [error]);

    return <SessionUnavailable sessionId={sessionId} error={{ kind: "server" }} embed={embed} onRetry={reset} />;
}
