import { PrivacyStack } from "@/components/home/privacy-stack";
import { INSET, Section, SectionHeader } from "@/components/site/frame";
import { Typography } from "@/components/ui/typography";
import { cn } from "@/lib/utils";

export function Privacy({ siteUrl }: { siteUrl: string }) {
  return (
    <Section id="privacy" bleed stage>
      <div className={cn(INSET, "pt-16 sm:pt-20 lg:pt-24")}>
        <SectionHeader
          eyebrow="03 / Privacy"
          title={<Typography variant="h2">Your .env stays on your machine.</Typography>}
          lead={
            <Typography variant="lead" tone="muted">
              This is the viewer your link opens, pulled apart. Every panel is built only from files that passed your
              ignore rules, and only the ones that changed travel.
            </Typography>
          }
        />
      </div>
      <div className="pb-10 sm:pb-16">
        <PrivacyStack host={new URL(siteUrl).host} />
      </div>
    </Section>
  );
}
