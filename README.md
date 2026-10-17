<picture>
  <source media="(prefers-color-scheme: dark)" srcset="https://website-vw4l.vercel.app/brand/biga-logo-light.svg">
  <img src="https://website-vw4l.vercel.app/brand/biga-logo.svg" width="180" alt="biga">
</picture>

# The web experience for biga

The website is where shared code comes to life. Explore snapshots in a read-only browser viewer, search through files, inspect changes, and follow live updates without installing the viewer locally.

[Open biga](https://biga.sh) · [Documentation](https://website-vw4l.vercel.app/docs) · [Issues](https://github.com/biga-sh/website/issues)

## What lives here?

- **Web viewer** — browse shared source code in the browser.
- **Product website** — discover biga and how to use it.
- **Documentation** — find usage guides, API references, and technical documentation.

Architecture details and system design documentation are maintained on the website rather than duplicated in this README.

## Tech stack

- Next.js and React
- TypeScript
- pnpm workspace
- Fumadocs for documentation
- Zustand for client-side state
- Zod for schemas and validation

## Local development

**Requirements:** Node.js 22+ and pnpm.

Install dependencies and start the development server:

```bash
pnpm install
pnpm dev
```

The website runs at `http://localhost:3000`.

For API-backed development, run the Go API server and PostgreSQL setup described in the [documentation](https://website-vw4l.vercel.app/docs). The development proxy uses `http://localhost:8080` by default; set `BIGA_SERVER_URL` to change the target.

## Useful commands

| Command | Purpose |
| --- | --- |
| `pnpm dev` | Start the development server |
| `pnpm build` | Build for production |
| `pnpm check-types` | Check TypeScript types |
| `pnpm lint` | Run linting |

## Contributing

Keep changes focused, follow the existing project conventions, and verify your changes before opening a pull request.

- [Documentation](https://website-vw4l.vercel.app/docs)
- [Browse the source](https://github.com/biga-sh/website)
- [Report a bug](https://github.com/biga-sh/website/issues)

---

<p align="center">A clearer way to share your code. <strong>biga</strong></p>
