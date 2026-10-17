/**
 * The finished session the landing page embeds as its live preview: this
 * project's own repository, broadcast and stopped.
 *
 * Read on the server only (the landing page is a server component), so it
 * needs no `NEXT_PUBLIC_` prefix. Give the Go server the same
 * `BIGA_DEMO_SESSION_ID` so its retention sweep never deletes it.
 */
export const DEMO_SESSION_ID = process.env.BIGA_DEMO_SESSION_ID ?? "heczlzfa";
