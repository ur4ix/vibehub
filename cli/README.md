# vydex CLI

Push a repository (or a new version) straight into your Vydex **drafts** from the
terminal — like `git push`, but into your Vydex account. From a draft you set a
price and publish on the site.

## Install / run

Requires **Node 18+** and **git** on your PATH.

```bash
# from this repo, without publishing:
node cli/vydex.mjs <command>

# or once published to npm:
npx vydex <command>
```

## 1. Get a token

On the site: **Settings → Security → CLI access tokens → Generate**. Copy the
`vdx_…` token (shown once).

```bash
vydex login            # paste the token when prompted
# or
vydex login vdx_xxxxxxxx
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
```

Options: `--title`, `--paid`, `--price <usd>`, `--repo <id>`, `--message "<changelog>"`,
`--url <https://…>` (defaults to https://vydex.dev; override for local dev with `VYDEX_URL`).

The command prints the listing URL — open it to set a price and publish.
