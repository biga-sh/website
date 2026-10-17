/**
 * The origin of the biga API server, when it is not this site's own origin.
 *
 * Unset (the default), the viewer calls `/api/sessions/...` on this origin,
 * which a reverse proxy or the Next rewrite in `next.config.js` forwards to
 * the Go server. Set it to talk to the server directly instead, e.g. when the
 * site is on Vercel and the server elsewhere, so live streams don't pass
 * through a serverless proxy. The server must then list this site in its
 * `BIGA_CORS_ORIGINS`.
 */
const API_ORIGIN = (process.env.NEXT_PUBLIC_BIGA_API_URL ?? "").replace(/\/+$/, "");

/** Absolute or same-origin URL for an API path such as `/api/sessions/x`. */
export function apiUrl(path: string): string {
    return API_ORIGIN + path;
}
