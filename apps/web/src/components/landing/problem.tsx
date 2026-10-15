import { codeToHtml } from "shiki";

import { CompareSlider } from "@/components/landing/compare-slider";
import { SectionHeading } from "@/components/landing/section-heading";
import { CONTAINER } from "@/components/landing/site-chrome";
import { cn } from "@/lib/utils";

/** The real merge logic from `checkpoint-batcher.ts`, the function that
    decides what a burst of save events becomes. Highlighted once on the
    server, so both panels are real, selectable text and ship no code. */
const SAMPLE = `function mergeKind(
  prev: ChangeKind | undefined,
  next: ChangeKind
): ChangeKind | null {
  if (!prev) return next;
  if (next === "deleted") {
    return prev === "added" ? null : "deleted";
  }
  if (next === "added") {
    return prev === "deleted" ? "modified" : prev;
  }
  return prev === "added" ? "added" : "modified";
}`;

export async function Problem() {
  const html = (
    await codeToHtml(SAMPLE, {
      lang: "ts",
      themes: { light: "github-light", dark: "github-dark" },
      defaultColor: "light",
    })
  ).replace(' tabindex="0"', "");

  return (
    <section id="why" className={cn(CONTAINER, "py-16 md:py-24")}>
      <SectionHeading
        title="A screen share sends pixels. Spire sends files."
        lead="Drag the line. The code on both sides is identical, real source from this repository."
      />

      <div className="mt-10 md:mt-12">
        <CompareSlider html={html} />
      </div>
    </section>
  );
}
