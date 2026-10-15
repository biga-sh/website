"use client";

import { Scaled } from "@/components/showcase/scaled";
import { ShowcaseProvider } from "@/components/showcase/showcase-provider";
import { PanelTimeline } from "@/components/showcase/viewer-panels";

/**
 * The viewer's own timeline, three rows of it, as the "history" cell's
 * artefact. It reads the same seeded session as the sections above and below.
 */
export function FeatureTimeline() {
  return (
    <ShowcaseProvider>
      <div className="border-rail overflow-hidden rounded-lg border">
        <Scaled width={320} height={188} maxScale={1.15} autoHeight>
          <div style={{ width: 320, height: 188 }}>
            <PanelTimeline />
          </div>
        </Scaled>
      </div>
    </ShowcaseProvider>
  );
}
