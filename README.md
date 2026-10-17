<p align="center">
  <a href="https://website-vw4l.vercel.app/">
    <picture>
      <source media="(prefers-color-scheme: dark)" srcset="https://website-vw4l.vercel.app/brand/biga-logo-light.svg">
      <img src="https://website-vw4l.vercel.app/brand/biga-logo.svg" width="180" alt="biga">
    </picture>
  </a>
</p>

<h1 align="center">The site, viewer and docs for biga</h1>

<p align="center">
  Where shared code shows up: a read-only browser viewer, the landing page and the documentation.
</p>

<p align="center">
  <a href="https://github.com/biga-sh/website/actions/workflows/ci.yml"><img src="https://img.shields.io/github/actions/workflow/status/biga-sh/website/ci.yml?branch=main&style=flat-square&labelColor=0c0d10&label=ci" alt="CI status"></a>
  <a href="package.json"><img src="https://img.shields.io/badge/node-%E2%89%A522-63e197?style=flat-square&labelColor=0c0d10" alt="Node.js 22 or newer"></a>
  <a href="LICENSE"><img src="https://img.shields.io/badge/license-MIT-63e197?style=flat-square&labelColor=0c0d10" alt="MIT license"></a>
</p>

<p align="center">
  <a href="https://website-vw4l.vercel.app/">Website</a> ·
  <a href="https://website-vw4l.vercel.app/docs">Documentation</a> ·
  <a href="https://website-vw4l.vercel.app/brand">Brand</a> ·
  <a href="https://github.com/biga-sh/website/issues">Issues</a>
</p>

---

Viewers open a link and get the shared folder in their browser: a file tree, search, syntax-highlighted code, checkpoints and diffs, all following along live as the owner saves. Nothing to install. The same Next.js app serves the landing page and the documentation, built with React, TypeScript, Fumadocs, Zustand and Zod.

## Get started

You need Node.js 22 or newer and pnpm.

```bash
pnpm install
pnpm dev
```

The site runs at `http://localhost:3000`. API requests are proxied to the [server](https://github.com/biga-sh/server) at `http://localhost:8080`; set `BIGA_SERVER_URL` to point somewhere else. With both running, `biga start` from the [CLI](https://github.com/biga-sh/cli) broadcasts to your local copy with no extra configuration.

## Layout

| Path | What lives there |
| --- | --- |
| `apps/web` | The Next.js app: landing page, viewer and docs (`content/docs`) |
| `apps/cli` | The deprecated `@zenshilabs/spire` npm package, which points users to the Go CLI |
| `packages/stores` | Zustand stores for the viewer |
| `packages/types` | Zod schemas and types for the API, sessions and events |
| `packages/eslint-config` | ESLint configuration |
| `packages/typescript-config` | TypeScript configuration |

## Development

| Command | Purpose |
| --- | --- |
| `pnpm dev` | Start the development server |
| `pnpm build` | Build for production |
| `pnpm check-types` | Check TypeScript types |
| `pnpm lint` | Run ESLint |
| `pnpm format` | Format with Prettier |

## Documentation

- [Viewer](https://website-vw4l.vercel.app/docs/viewer)
- [Architecture](https://website-vw4l.vercel.app/docs/architecture)
- [Self-hosting](https://website-vw4l.vercel.app/docs/self-hosting)
- [Brand](https://website-vw4l.vercel.app/brand)

The documentation source is in [`apps/web/content/docs`](apps/web/content/docs). Fixes to it are welcome here.

## Repositories

| Repository | What it is |
| --- | --- |
| [cli](https://github.com/biga-sh/cli) | The `biga` command. Watches a folder and streams every save. |
| [server](https://github.com/biga-sh/server) | The Go API. Stores sessions and streams updates to viewers. |
| [website](https://github.com/biga-sh/website) | The site, the live viewer and the documentation. |
| [docker](https://github.com/biga-sh/docker) | Self-hosting: the whole stack with Docker Compose. |

## Contributing

Bug reports, focused fixes and pull requests are welcome. Read the [contributing guide](https://github.com/biga-sh/.github/blob/main/CONTRIBUTING.md) before you start, and report vulnerabilities privately as described in the [security policy](https://github.com/biga-sh/website/security/policy), not in a public issue.

## License

biga is [MIT licensed](LICENSE).

---

<p align="center">
  <sub><a href="https://website-vw4l.vercel.app/">biga</a> · Made for people who teach, pair and build in public.</sub>
</p>
