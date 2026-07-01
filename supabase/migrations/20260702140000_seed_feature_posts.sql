-- Seed three feature-announcement posts (wallet, orders, CLI), authored by the
-- admin account. IDEMPOTENT (unique slug + on conflict do nothing). Normal rows
-- — edit or unpublish from the blog editor any time.

insert into public.posts (slug, title, excerpt, body, category, status, published_at, author_id)
select v.slug, v.title, v.excerpt, v.body, v.category, 'published', v.published_at,
       (select id from auth.users where email = 'admin@vydex.dev' limit 1)
from (values
  (
    'wallet-balance-escrow',
    'Your money now lives on Vydex: wallet, balance & escrow',
    $$Every account now has an internal wallet — top up with crypto, pay in one click, earn from sales and orders, and cash out to your own wallet whenever you want.$$,
    $$Until now, every purchase on Vydex meant a fresh crypto invoice. That worked, but it was slow for buyers and clunky for sellers. So we built a proper **internal wallet**.

## What it does

- **Top up** your balance with crypto once — then buy in one click, no invoice per purchase.
- **Pay with balance** — if your balance covers the price, checkout is instant. Crypto invoices still work if you prefer them.
- **Earn into your balance** — when a sale clears escrow, your net lands on your balance automatically.
- **Withdraw any time** — cash out to the payout wallet you set in Settings → Security (USDT/USDC and more).

## Escrow everywhere

Escrow didn't change — it got stronger. Buyers pay into escrow; sellers are paid when the buyer confirms (or the auto-release window passes). Refunds go straight back to the buyer's balance. Every movement is written to an append-only ledger, and your [wallet page](/wallet) shows the full history.

## The fee story (unchanged, now consistent)

**Early Adopters — the first 100 accounts — pay 0% forever.** Everyone else pays 0% for their first 30 days, then a flat 10%. That applies to marketplace sales *and* order work — the only cost that always exists is the blockchain network fee when crypto actually moves.

Check it out on your [dashboard](/dashboard) → Wallet.$$,
    'Product',
    now() - interval '2 days'
  ),
  (
    'orders-with-escrow',
    'Orders: commission custom builds, protected by escrow',
    $$Post what you need built, pick a bid, and pay into escrow. The developer delivers, you accept or request changes — funds only move when you're happy.$$,
    $$The [Orders board](/orders) is now a full commission workflow — the kind you'd expect from a freelance marketplace, built on the Vydex wallet.

## How it works

1. **Post an order** — what you need, budget range, timeline. Publishing is free.
2. **Developers bid** — you get notified, compare offers, and accept the one you like.
3. **Accepting a bid moves the money into escrow** from your balance. The developer sees the funds are real and starts building.
4. **Delivery → review** — the developer submits the work with a note. You **accept** (funds release to them) or **request a revision** with feedback. Every delivery and revision is kept as a timeline on the order.
5. **Auto-accept** — if you go quiet for 3 days after a delivery, the order completes on its own so nobody's money gets stuck.

## Protections on both sides

- The client can cancel for a full refund any time **before** the work is delivered.
- The developer knows the budget is locked in escrow the moment their bid is accepted.
- Once the work is done, you can even **leave a tip** — 100% of it goes to the developer.

Need something built? [Post an order](/orders/new). Want to earn? [Browse open orders](/orders).$$,
    'Product',
    now() - interval '1 day'
  ),
  (
    'cli-push-announcement',
    'npx @vydex/cli — git push, but for your listings',
    $$Publish straight from the terminal: one command packs your current commit and turns it into a Vydex draft. New versions are one more push.$$,
    $$If you live in the terminal, publishing through a web form feels slow. So we shipped a CLI:

```
npm install -g @vydex/cli

vydex login          # paste a token from Settings → Security
vydex push --title "My project"
```

That's it — `vydex push` packs your **current git commit** (`git archive HEAD`, tracked files only), uploads it, and prints a link to your new draft. Open it, set a price, publish.

## More than the basics

```
# a paid draft, straight from the flag
vydex push --title "Pro UI kit" --paid --price 29

# push a new version of an existing repo
vydex push --repo <id> --message "fix auth, add dark mode"
```

Every push lands as a **draft** — nothing goes live until you say so. Versions stack up with changelogs, and the archive is scanned the same way web uploads are (file tree, AI-tool badges, dependency vulnerabilities).

Tokens are managed in [Settings → Security](/settings/security) — revoke any time. Full guide in [the docs](/docs/cli-push).$$,
    'Product',
    now()
  )
) as v(slug, title, excerpt, body, category, published_at)
where exists (select 1 from auth.users where email = 'admin@vydex.dev')
on conflict (slug) do nothing;
