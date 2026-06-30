# Launch checklist — verify by hand

Code is green (typecheck, lint, tests, CI). These are the things a human must
confirm before opening the doors — mostly money, secrets, and live integrations
that can't be tested from CI.

## 1. Environment variables (Vercel → Settings → Environment Variables)
Confirm every one is set for **Production** (and Preview where relevant):

- [ ] `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- [ ] `SUPABASE_SERVICE_ROLE_KEY` (secret — server only)
- [ ] `NOWPAYMENTS_API_KEY`, `NOWPAYMENTS_IPN_SECRET`
- [ ] `CRON_SECRET` (used by the cron routes)
- [ ] Payout (only if auto-payout is on): `PAYOUT_AUTO`, `PAYOUT_PROXY_URL`,
      `NOWPAYMENTS_EMAIL`, `NOWPAYMENTS_PASSWORD`, `NOWPAYMENTS_TOTP_SECRET`, `PAYOUT_MAX_USD`
- [ ] `NEXT_PUBLIC_SENTRY_DSN` (optional — there's a fallback, but set it to be explicit)
- [ ] `NEXT_PUBLIC_HCAPTCHA_SITEKEY` (if overriding the default)

## 2. Database migrations
- [ ] All migrations in `supabase/migrations/` are applied (run the latest ones, in order).
- [ ] Spot-check: `select balance_cents from public.users limit 1;` works.
- [ ] Security: this must return **false** —
      `select has_function_privilege('authenticated','public.post_ledger(uuid,integer,text,uuid,text)','execute');`

## 3. Payments — real end-to-end (do this with small amounts)
- [ ] **Buy a paid repo with crypto**: complete a real NOWPayments invoice → the
      purchase flips to `completed`, escrow `held`, download unlocks.
- [ ] Confirm the **IPN webhook** is reachable from NOWPayments (check their IPN log
      and that `NOWPAYMENTS_IPN_SECRET` matches — a mismatch returns 403).
- [ ] **Top up balance**: pay an invoice → balance increases once confirmed.
- [ ] **Pay with balance**: buy a repo from balance → purchase completes, balance drops.
- [ ] **Escrow release**: confirm a purchase (or wait for the 3-day cron) → seller's
      balance is credited net of the fee.
- [ ] **Withdraw**: request a withdrawal → it appears in `/admin/payouts` (and, if
      `PAYOUT_AUTO=1`, actually sends). Test the **Reject** path refunds the balance.
- [ ] **Orders**: accept a bid (debits your balance), deliver, accept → executor is paid.

## 4. Cron jobs (Vercel → Settings → Cron)
- [ ] `/api/cron/release-escrow`, `/api/cron/auto-release-orders`, `/api/cron/payouts`
      are scheduled and return 200 when triggered (they require the `CRON_SECRET` header).

## 5. Sentry
- [ ] Open `/sentry-example-page` on the live site, click the buttons, and confirm
      events show up in Sentry Issues.
- [ ] **Then delete the test routes** `app/sentry-example-page/` and
      `app/api/sentry-example/` (they're public and intentionally error — don't ship them).

## 6. Security spot-checks
- [ ] As a **non-admin** user, `/admin` redirects away (does not render).
- [ ] A buyer can **only** see their own balance/ledger/purchases (not others').
- [ ] A paid repo's file contents stay locked until purchased (a logged-out / non-buyer
      user sees the tree but not the code).
- [ ] Try hitting `/api/balance/withdraw` etc. while logged out → 401.

## 7. Accounts & ops
- [ ] The **admin** role is seeded to your account only (it can't be granted via the app).
- [ ] Payout wallet is set on the account(s) that will receive money.
- [ ] A real "first listing" exists so the catalog isn't empty on day one.

## 8. Nice-to-have before traffic
- [ ] Custom domain + HTTPS verified on Vercel.
- [ ] `robots`/`sitemap` look right; legal pages (terms, privacy) reviewed.
- [ ] Decide the platform fee story is correct (10%, with the early-adopter / first-month waivers).
