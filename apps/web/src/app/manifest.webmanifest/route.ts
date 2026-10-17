import type { MetadataRoute } from "next";

export const dynamic = "force-static";

const manifest: MetadataRoute.Manifest = {
  name: "biga",
  short_name: "biga",
  description: "Stream your saves, not your screen. Broadcast a folder as a live, read-only link.",
  start_url: "/",
  display: "standalone",
  background_color: "#0b0c0e",
  theme_color: "#0b0c0e",
  icons: [
    { src: "/icon.svg", sizes: "any", type: "image/svg+xml" },
    { src: "/apple-icon", sizes: "180x180", type: "image/png" },
  ],
};

/**
 * Served from a route instead of the `manifest.ts` file convention so the
 * layout can declare the `<link>` itself. Next only adds
 * `crossorigin="use-credentials"` on preview deployments, but Vercel's
 * Deployment Protection also guards the unique URL of a production deployment.
 * A credential-less manifest request is then redirected to vercel.com's SSO,
 * which the browser blocks as a CORS failure. Sending credentials fixes that
 * and changes nothing on a public domain, where the request is same-origin.
 */
export function GET() {
  return Response.json(manifest, {
    headers: { "Content-Type": "application/manifest+json" },
  });
}
