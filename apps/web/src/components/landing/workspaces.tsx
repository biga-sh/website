import { ArrowRightIcon } from "lucide-react";
import type { ReactNode } from "react";

import { Diagram, DiagramLabel } from "@/components/landing/diagram/canvas";
import { PlateStack } from "@/components/landing/diagram/primitives";
import { Surface } from "@/components/landing/primitives";
import { Reveal } from "@/components/landing/reveal";
import { SectionHeading } from "@/components/landing/section-heading";
import { CONTAINER } from "@/components/landing/site-chrome";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  LIST_OUTPUT,
  STATUS_OUTPUT,
  STOP_OUTPUT,
  WORKSPACE_PROJECTS,
  WORKSPACE_SESSIONS,
} from "@/lib/landing-demo";
import { cn } from "@/lib/utils";

function Key({ children }: { children: ReactNode }) {
  return <span className="text-terminal-foreground/90">{children}</span>;
}
function Str({ children }: { children: ReactNode }) {
  return <span className="text-terminal-accent">{children}</span>;
}
function Punc({ children }: { children: ReactNode }) {
  return <span className="text-terminal-foreground/60">{children}</span>;
}

function ConfigWindow() {
  return (
    <Surface coreClassName="bg-terminal border-terminal-foreground/10">
      <div className="border-terminal-foreground/10 flex items-center gap-2 border-b px-4 py-2.5">
        <span translate="no" className="text-terminal-foreground/60 font-mono text-xs">
          spire.json
        </span>
      </div>
      <pre translate="no" className="overflow-x-auto p-4 font-mono text-[12px] leading-[1.9] sm:p-5 sm:text-[13px]">
        <code>
          <Punc>{"{"}</Punc>
          {"\n  "}
          <Key>&quot;projects&quot;</Key>
          <Punc>: [</Punc>
          {WORKSPACE_PROJECTS.map((project, index) => (
            <span key={project.dir}>
              {"\n    "}
              <Punc>{"{ "}</Punc>
              <Key>&quot;dir&quot;</Key>
              <Punc>: </Punc>
              <Str>&quot;{project.dir}&quot;</Str>
              <Punc>, </Punc>
              <Key>&quot;title&quot;</Key>
              <Punc>: </Punc>
              <Str>&quot;{project.title}&quot;</Str>
              <Punc>{" }"}</Punc>
              {index < WORKSPACE_PROJECTS.length - 1 ? <Punc>,</Punc> : null}
            </span>
          ))}
          {"\n  "}
          <Punc>]</Punc>
          {"\n"}
          <Punc>{"}"}</Punc>
        </code>
      </pre>
    </Surface>
  );
}

const SKYLINE_VB_W = 360;
const SKYLINE_VB_H = 210;
const GROUND_Y = 176;

const SKYLINE_XS: readonly [number, number] = [110, 250];

function Skyline() {
  return (
    <Diagram
      viewBox={`0 0 ${SKYLINE_VB_W} ${SKYLINE_VB_H}`}
      className="aspect-[360/210]"
      overlay={
        <>
          {WORKSPACE_SESSIONS.map((session, i) => (
            <span key={session.slug}>
              <DiagramLabel
                x={(SKYLINE_XS[i]! / SKYLINE_VB_W) * 100}
                y={((GROUND_Y + 22) / SKYLINE_VB_H) * 100}
                className="text-foreground/80"
              >
                {session.title}
              </DiagramLabel>
              <DiagramLabel
                x={(SKYLINE_XS[i]! / SKYLINE_VB_W) * 100}
                y={((GROUND_Y + 38) / SKYLINE_VB_H) * 100}
                className={cn("text-[10px]", session.live ? "text-spire" : "text-muted-foreground")}
              >
                {session.live ? "live" : "ended"}
              </DiagramLabel>
            </span>
          ))}
        </>
      }
    >
      <line x1={20} y1={GROUND_Y} x2={SKYLINE_VB_W - 20} y2={GROUND_Y} stroke="var(--diagram-wire)" strokeWidth={1.25} />
      {WORKSPACE_SESSIONS.map((session, i) => (
        <PlateStack
          key={session.slug}
          cx={SKYLINE_XS[i]!}
          baseY={GROUND_Y - 10}
          count={3}
          gap={14}
          scale={1.1}
          startDelay={i * 150}
          topLive={session.live}
        />
      ))}
    </Diagram>
  );
}

function fill(line: string, siteUrl: string) {
  return line.replaceAll("{url}", siteUrl);
}

function OutputBlock({ lines, siteUrl }: { lines: string[]; siteUrl: string }) {
  return (
    <pre className="bg-terminal border-terminal-foreground/10 text-terminal-foreground overflow-x-auto rounded-xl border p-4 font-mono text-[11.5px] leading-relaxed sm:text-xs">
      <code>
        {lines.map((line, i) => (
          <div key={i} className={cn(!line.trim() ? "h-2" : undefined)}>
            {fill(line, siteUrl)}
          </div>
        ))}
      </code>
    </pre>
  );
}

export function Workspaces({ siteUrl }: { siteUrl: string }) {
  return (
    <section id="workspaces" className={cn(CONTAINER, "py-16 md:py-24")}>
      <SectionHeading
        title="One command, every project."
        lead="Drop a spire.json in a folder, or list several directories on the command line. Each project gets its own session and its own link."
      />

      <div className="mt-10 grid grid-cols-1 items-center gap-6 md:mt-12 lg:grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] lg:gap-8">
        <Reveal>
          <ConfigWindow />
        </Reveal>

        <Reveal delay={60} className="flex justify-center">
          <div className="text-muted-foreground flex flex-col items-center gap-2">
            <span className="border-border/70 bg-background grid size-9 place-items-center rounded-full border shadow-sm">
              <ArrowRightIcon className="size-4 rotate-90 lg:rotate-0" strokeWidth={1.5} />
            </span>
            <span translate="no" className="font-mono text-[11px]">
              spire start
            </span>
          </div>
        </Reveal>

        <Reveal delay={120}>
          <Skyline />
        </Reveal>
      </div>

      <Reveal delay={160} className="mt-12 md:mt-16">
        <Tabs defaultValue="list">
          <TabsList>
            <TabsTrigger value="list">spire list</TabsTrigger>
            <TabsTrigger value="status">spire status</TabsTrigger>
            <TabsTrigger value="stop">spire stop --all</TabsTrigger>
          </TabsList>
          <TabsContent value="list" className="mt-3">
            <OutputBlock lines={LIST_OUTPUT} siteUrl={siteUrl} />
          </TabsContent>
          <TabsContent value="status" className="mt-3">
            <OutputBlock lines={STATUS_OUTPUT} siteUrl={siteUrl} />
          </TabsContent>
          <TabsContent value="stop" className="mt-3">
            <OutputBlock lines={STOP_OUTPUT} siteUrl={siteUrl} />
          </TabsContent>
        </Tabs>
      </Reveal>
    </section>
  );
}
