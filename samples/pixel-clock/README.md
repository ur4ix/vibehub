# Pixel Clock

A tiny, dependency-free retro clock widget — open `index.html` and it just runs.
Shows the time + date, has a light/dark theme toggle, and remembers your choice.

This folder doubles as a **test project for Vydex** — small, real, multi-file, with
a `package.json` — perfect for exercising the upload pipeline and the CLI.

## Files
- `index.html` — markup
- `clock.js` — clock logic + theme persistence
- `styles.css` — retro styling
- `package.json` — metadata

## Try it locally
Just open `index.html` in a browser. (Or `npm start` to serve it.)

## Use it to test Vydex

**A) Web upload** — zip this folder and upload it on `/explore/new`. You should see
the file tree, the detected `package.json`, and a draft you can publish.

**B) CLI push** — copy this folder out of the main repo first (so `git archive` only
packs the sample, not all of Vydex), then:

```bash
cp -r samples/pixel-clock ~/pixel-clock   # copy it out
cd ~/pixel-clock
git init && git add -A && git commit -m "init"
npx @vydex/cli login                       # paste a token from Settings → Security
npx @vydex/cli push --title "Pixel Clock"
```

The command prints the draft URL — open it, set a price (or keep it free), and publish.
