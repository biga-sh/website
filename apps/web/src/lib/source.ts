import { loader } from "fumadocs-core/source";
import { applyMdxPreset } from "fumadocs-mdx/config";
import { defineDocs } from "fumadocs-mdx/macro";
import { remarkMdxMermaid } from "fumadocs-mermaid";

/**
 * The documentation: MDX under `content/docs`, served at `/docs`.
 *
 * Giving a collection its own `mdxOptions` replaces Fumadocs' defaults, so the
 * preset is applied by hand with one plugin added: fenced ```mermaid blocks
 * become diagrams (see `components/docs/docs-mermaid.tsx`).
 */
export const docs = defineDocs({
  dir: "content/docs",
  docs: {
    mdxOptions: applyMdxPreset({ remarkPlugins: [remarkMdxMermaid] }),
  },
});

export const source = loader({
  baseUrl: "/docs",
  source: docs.toFumadocsSource(),
});
