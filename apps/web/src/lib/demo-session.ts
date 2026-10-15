import { envString } from "@/server/env";

/**
 * The finished session the landing page embeds as its live preview: this
 * project's own repository, broadcast and stopped.
 *
 * Read on the server only (the landing page is a server component and the cron
 * route is a route handler), so it needs no `NEXT_PUBLIC_` prefix. The retention
 * sweep skips this id, otherwise the homepage's centrepiece would be deleted
 * `BIGA_RETENTION_DAYS` after the broadcast ended. See
 * `apps/web/src/app/api/cron/cleanup/route.ts`.
 */
export const DEMO_SESSION_ID = envString("DEMO_SESSION_ID") ?? "heczlzfa";

/** Sessions the retention sweep must never delete. */
export const PROTECTED_SESSION_IDS: readonly string[] = [DEMO_SESSION_ID];
