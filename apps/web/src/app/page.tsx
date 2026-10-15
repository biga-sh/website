import { Checkpoints } from "@/components/landing/checkpoints";
import { ClosingCta } from "@/components/landing/closing-cta";
import { Demo } from "@/components/landing/demo";
import { Hero } from "@/components/landing/hero";
import { HowItWorks } from "@/components/landing/how-it-works";
import { PendingSectionScroll } from "@/components/landing/nav-anchor";
import { Privacy } from "@/components/landing/privacy";
import { Problem } from "@/components/landing/problem";
import { GITHUB_URL, SiteFooter, SiteHeader } from "@/components/landing/site-chrome";
import { UnderTheHood } from "@/components/landing/under-the-hood";
import { Workspaces } from "@/components/landing/workspaces";
import { DEMO_SESSION_ID } from "@/lib/demo-session";

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";

const sessionPath = `/session/${DEMO_SESSION_ID}`;
const shareUrl = `${siteUrl}${sessionPath}`;

const jsonLd = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "SoftwareApplication",
      name: "Spire",
      applicationCategory: "DeveloperApplication",
      operatingSystem: "macOS, Linux, Windows",
      description:
        "Broadcast a local directory so others can watch it live in real time. No accounts; the session ID is the share link.",
      url: siteUrl,
      offers: { "@type": "Offer", price: "0", priceCurrency: "USD" },
      author: { "@type": "Organization", name: "ZenshiLabs" },
    },
    {
      "@type": "Organization",
      name: "ZenshiLabs",
      url: siteUrl,
      sameAs: [GITHUB_URL],
    },
  ],
};

export default function Home() {
  return (
    <div className="relative overflow-x-clip">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      <SiteHeader />
      <PendingSectionScroll />

      <main id="content">
        <Hero siteUrl={siteUrl} />
        <Problem />
        <Checkpoints />
        <HowItWorks />
        <Demo siteUrl={siteUrl} sessionPath={sessionPath} shareUrl={shareUrl} />
        <Privacy />
        <Workspaces siteUrl={siteUrl} />
        <UnderTheHood />
        <ClosingCta siteUrl={siteUrl} />
      </main>

      <SiteFooter />
    </div>
  );
}
