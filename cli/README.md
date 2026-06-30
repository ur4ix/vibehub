# vydex CLI

Push a repository (or a new version) straight into your Vydex **drafts** from the
terminal — like `git push`, but into your Vydex account. From a draft you set a
price and publish on the site.

Requires **Node 18+** and **git** on your PATH.

## Install

You can use it two ways — pick whichever you prefer.

### Option A — install globally (short `vydex` command)
```bash
npm install -g @vydex/cli
vydex --help
```
Then use the bare `vydex` command everywhere: `vydex login`, `vydex push …`.

### Option B — run on demand with npx (no install)
```bash
npx @vydex/cli --help
```
Use the full name each time: `npx @vydex/cli login`, `npx @vydex/cli push …`.

> The examples below use the global `vydex` command. If you prefer npx, just put
> `npx @vydex/cli` wherever you see `vydex` (e.g. `npx @vydex/cli push …`).

## 1. Get a token

On the site: **Settings → Security → CLI access tokens → Generate**. Copy the
`vdx_…` token (shown once).

```bash
vydex login                 # paste the token when prompted
# or:  vydex login vdx_xxxxxxxx
# npx: npx @vydex/cli login
```

The token is saved to `~/.vydex.json` (you can also pass `VYDEX_TOKEN=…`).

## 2. Push

Run inside a git repo with at least one commit. It uploads `git archive HEAD`
(your tracked files at the current commit).

```bash
# create a new draft
vydex push --title "Analytics dashboard"

# create a paid draft
vydex push --title "Pro UI kit" --paid --price 29

# push a new version to an existing repo
vydex push --repo <repository-id> --message "fix auth bug"

# same commands via npx:
npx @vydex/cli push --title "Analytics dashboard"
```

Options: `--title`, `--paid`, `--price <usd>`, `--repo <id>`, `--message "<changelog>"`,
`--url <https://…>` (defaults to https://vydex.dev; override for local dev with `VYDEX_URL`).

The command prints the listing URL — open it to set a price and publish.

## Running from a clone of the Vydex repo (no install)
```bash
node cli/vydex.js <command>
```
