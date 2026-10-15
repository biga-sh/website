#!/usr/bin/env node
/*
 * The last release of @zenshilabs/spire. Spire is now biga, a standalone Go
 * binary, so this package no longer broadcasts anything: it says where the
 * real CLI went and exits non-zero, so a script that still calls `spire`
 * fails loudly instead of quietly doing nothing.
 *
 * The rest of src/ is the old implementation, kept only until it is deleted.
 * Nothing imports it, and the bundle contains none of it.
 */

const MESSAGE = `
spire has been replaced by biga.

biga is a single binary with no Node.js requirement. Install the latest
release:

  macOS, Linux, FreeBSD   curl -fsSL https://raw.githubusercontent.com/biga-sh/cli/main/install.sh | sh
  Windows (PowerShell)    irm https://raw.githubusercontent.com/biga-sh/cli/main/install.ps1 | iex
  Go 1.26+                go install github.com/biga-sh/cli/cmd/biga@latest

  Releases             https://github.com/biga-sh/cli/releases/latest
  Server and website   https://github.com/biga-sh/website

Then run \`biga start\` in the same folder. The commands carry over (start,
status, stop), and SPIRE_API_URL is now BIGA_API_URL. biga doesn't read
~/.spire, so the first run creates a new session; pass --session <id> to keep
an existing link.
`;

process.stderr.write(`${MESSAGE.trimStart()}\n`);
process.exit(1);
