# @zenshilabs/spire — deprecated

> **This package is deprecated and no longer maintained.**
> Spire is now **biga**, and the CLI is a single Go binary with no Node.js
> requirement. Install the latest release from GitHub.

```sh
# macOS, Linux, FreeBSD
curl -fsSL https://raw.githubusercontent.com/biga-sh/cli/main/install.sh | sh

# Windows (PowerShell)
irm https://raw.githubusercontent.com/biga-sh/cli/main/install.ps1 | iex
```

- **Latest release:** <https://github.com/biga-sh/cli/releases/latest>
- **Source and docs:** <https://github.com/biga-sh/cli>
- **Server and website:** <https://github.com/biga-sh/website>

## Moving over

| Spire (this package) | biga |
| --- | --- |
| `npx @zenshilabs/spire start` | `biga start` |
| `spire status`, `spire stop` | `biga status`, `biga stop` (and `biga list`, `biga open`) |
| `SPIRE_API_URL` | `BIGA_API_URL` |
| `spire.json` | `biga.json` |
| `~/.spire/sessions.json` | `~/.biga/sessions.json` |

Existing session links keep working with the server; only the CLI changed. The
new CLI doesn't read `~/.spire`, so the first `biga start` in a folder creates
a new session rather than rejoining an old one. Pass `--session <id>` to reuse
an existing link.

0.5.0 is the final release: its `spire` command prints this notice and exits
with status 1, so scripts that still call it fail loudly instead of quietly
doing nothing. Nothing further will be published.
