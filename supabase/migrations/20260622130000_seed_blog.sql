-- Seed the blog with launch posts, authored by the admin account. IDEMPOTENT
-- (unique slug + on conflict do nothing). Bodies are markdown, rendered by the
-- blog's <Markdown> component. You can edit or unpublish any of these later from
-- the blog editor — they're normal rows.

insert into public.posts (slug, title, excerpt, body, category, status, published_at, author_id)
select v.slug, v.title, v.excerpt, v.body, v.category, 'published', v.published_at,
       (select id from auth.users where email = 'admin@vydex.dev' limit 1)
from (values
  (
    'introducing-vydex',
    'Introducing Vydex',
    $$A marketplace for the apps, components, prompts and templates you build with AI. Sell what you made on vibes, or skip the blank file and start from something that already works.$$,
    $$Vydex is a marketplace for **AI-built code** — the apps, components, prompts and templates you (and thousands of others) are shipping with tools like Claude, Cursor and v0.

If you've ever built something genuinely useful "on vibes" and then watched it sit in a folder, this is where it can earn. And if you're staring at a blank file, it's where you can start from something that already works instead.

## The idea is simple

People are building real software with AI, fast. But there's nowhere built *for* that — somewhere to sell what you made, or buy a head start, with enough signal to actually trust it. So we made one.

## What you can do

- **Sell** your projects — free or paid, your price, paid out in crypto.
- **Buy** with real signals: a live demo, a screenshot gallery, the full file tree and community reviews *before* you spend anything.
- **Hire and get hired** through the Jobs and Orders boards.
- **Find startups** and connect with the people building them.

## A few things we care about

- **Crypto-only payments.** Global from day one, no card middlemen, private by default.
- **Escrow on every paid sale.** Your money is protected until you confirm you got what you paid for.
- **Trust by review, not by marketing.** Listings earn their place through ratings and reputation.

## Come build

Vydex is live and open. [Browse the catalog](/explore), or [publish your first project](/upload) — your first month is on us.

This is just the start. We're building in public and shipping constantly — follow along.$$,
    'Announcement',
    now() - interval '3 days'
  ),
  (
    'building-vydex-in-public',
    'We built a marketplace with zero traditional developers',
    $$Vydex was built entirely with Claude and a lot of prompts — no traditional developers. Here's what that actually looks like, and why we're building it in public.$$,
    $$Here's something a little unusual about Vydex: it was built with **zero traditional developers**. Just Claude and a lot of prompts.

Not "AI-assisted." Not "a dev with Copilot open." The whole thing — the marketplace, listings, payments, escrow, profiles, the design — built by describing what it should do and shipping what came back.

## Why say that out loud

Because Vydex is a marketplace *for* AI-built code, and it would be strange to pretend it wasn't built the same way. The product is its own proof of concept.

It's also just honest. Building in public means showing the real thing — what shipped, what broke, what we changed our minds about — not a highlight reel.

## What's shipped so far

The essential parts are done: you can list a project, browse with real previews and a full file tree, buy with crypto through escrow, and have sellers paid out automatically. Profiles, reviews, reputation, a jobs board, a startups board, messaging — all live.

Plus a lot of invisible work most people never notice: the page transitions, the load times, the way a shared link unfurls cleanly. The difference between "a thing someone hacked together" and "a product."

## The honest part

AI doesn't make hard problems easy — it makes them *fast*. Payments still had to be figured out. Trust still had to be designed. Edge cases still bit. The speed is real, but so is the work.

We'll keep posting build logs here as we go. If you're shipping with AI too, this is your kind of place — [come take a look](/explore).$$,
    'Build log',
    now() - interval '1 day'
  )
) as v(slug, title, excerpt, body, category, published_at)
where exists (select 1 from auth.users where email = 'admin@vydex.dev')
on conflict (slug) do nothing;
