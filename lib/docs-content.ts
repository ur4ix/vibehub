// Documentation content, keyed by slug. Rendered as markdown on /docs/[slug].
// Keep it accurate to how the platform actually works.

export interface DocArticle {
  title: string
  body: string
}

export const DOCS: Record<string, DocArticle> = {
  // ─── Getting started ───────────────────────────────────────────────────────
  'what-is-vydex': {
    title: 'What is Vydex?',
    body: `Vydex is a marketplace for **AI-built code** — the apps, components, prompts and templates you and others build with tools like Claude, Cursor, v0 and Windsurf.

If you built something good "on vibes," Vydex is where you can sell it. If you need a head start, it's where you can buy a project that already works instead of starting from a blank file.

## What you can do here

- **Sell** your projects — set them free or paid, and get paid in crypto.
- **Buy** ready-made code with real signals: live demos, screenshots, a full file tree and community reviews before you spend a cent.
- **Hire & get hired** through the Jobs and Orders boards.
- **Discover startups** and connect with founders and investors.

## What makes it different

- **Crypto-only payments** — global from day one, no card middlemen, private by default.
- **Escrow on every paid sale** — your money is protected until you confirm you got what you paid for.
- **Community review** — listings earn trust through ratings and reputation, not marketing.

New here? Start with [Creating your account](/docs/create-account).`,
  },

  'create-account': {
    title: 'Creating your account',
    body: `You can sign up in under a minute, two ways:

## With GitHub
Click **Continue with GitHub** on the [sign-in page](/auth). No password to manage — you're in instantly.

## With email
Enter your email and a password (8+ characters), pick a username, and complete the captcha. We'll send a confirmation link — click it to activate your account.

## Your username
Your username is your public handle and the address of your profile (\`vydex.dev/u/your-name\`). Use 3–30 characters: lowercase letters, digits and underscores.

Once you're in, head to [Publishing your first project](/docs/first-project).`,
  },

  'first-project': {
    title: 'Publishing your first project',
    body: `Going from a folder on your machine to a live listing takes a few minutes.

## 1. Pack your code
Zip your project into a single \`.zip\` file. See [Uploading a ZIP archive](/docs/zip-upload) for what to include and exclude.

## 2. Add the details
On the [upload page](/upload), fill in:
- **Title & description** — what it is and what it does.
- **Category & tags** — so buyers can find it.
- **Preview** — a screenshot gallery and a live demo link go a long way.

## 3. Set a price
Free or paid — you decide. See [Pricing your repository](/docs/pricing).

## 4. Publish
Hit publish and your listing is live immediately — no review queue. You can edit or upload new versions any time.`,
  },

  'zip-upload': {
    title: 'Uploading a ZIP archive',
    body: `Your project is uploaded as a single \`.zip\` archive. When you upload, Vydex reads the archive to build a richer listing automatically.

## What we read from the ZIP
- **File tree** — buyers see the full structure of your project (contents stay locked on paid repos until purchase).
- **AI-tool footprints** — markers from Cursor, Claude, v0, Windsurf and others, so the listing is honestly badged as AI-built.
- **Preview images** you add, plus your live demo link.

## What to include
- Your full source, a clear \`README\`, and anything needed to run it.

## What to leave out
- \`node_modules\` and build output — they bloat the archive; buyers will reinstall.
- **Secrets** — \`.env\` files, API keys, private keys. Never ship credentials in your ZIP.

## Versions
Uploading a new ZIP creates a new version with its own changelog, like a commit — buyers always get the latest.`,
  },

  // ─── Selling ─────────────────────────────────────────────────────────────────
  'pricing': {
    title: 'Pricing your repository',
    body: `You set the price. There's no "right" number — but here's how to think about it.

## Free or paid
- **Free** lets anyone signed in download it. Great for building reputation and an audience.
- **Paid** locks the contents until purchase. You're paid in crypto when a sale clears escrow.

## Set a fair floor
Because every crypto transfer carries a small fixed network fee, very small prices don't make sense — a few dollars is a sensible minimum for a paid project.

## Fees
Your first **30 days are 0% fee**. After that the platform fee is a flat **10%** — you keep ~90% of every sale. See [Platform fees](/docs/fees).`,
  },

  'free-vs-paid': {
    title: 'Free vs. paid listings',
    body: `Every repository is either free or paid. The difference is what a visitor can access.

## Free
- Anyone signed in can **browse the full source** with syntax highlighting and download it.
- Best for portfolio pieces, lead magnets and building reputation.

## Paid
- The **file tree and previews are public**, so buyers see what they're getting.
- The **actual file contents are locked** until purchase — and this is enforced at the database level, not just hidden in the UI.
- Payment runs through **escrow** so the buyer is protected.

You can switch a listing between free and paid by editing it, and price it however you like.`,
  },

  'categories-tags': {
    title: 'Categories and tags',
    body: `Categories and tags are how buyers find your work in [Explore](/explore).

## Category
Pick the one category that best fits — Apps, UI Components, Prompts, Templates, and so on. It powers the top-level filters.

## Tags
Add a handful of specific tags: the framework, language or use case (\`nextjs\`, \`tailwind\`, \`rag\`, \`discord-bot\`). They make your listing show up in search and related results.

## Tips
- Be accurate, not broad — relevant tags beat a long list of loose ones.
- Match the words a buyer would actually search for.`,
  },

  'first-sale': {
    title: 'Getting your first sale',
    body: `A great listing sells itself. A few things move the needle most:

## Show, don't tell
- Add a **live demo link** and a **screenshot gallery**. Buyers trust what they can see running.
- Write a clear **README** — setup steps, what's included, what's not.

## Earn trust
- Reviews and reputation surface the best work. Free downloads and honest descriptions build it fast.

## Share your link
Every listing has its own page with a **branded preview card**. Drop the link on X or Discord and it unfurls cleanly with your title and price — that's free distribution.

## Price it right
See [Pricing your repository](/docs/pricing). A fair price with a strong preview beats a cheap price with none.`,
  },

  // ─── Buying ──────────────────────────────────────────────────────────────────
  'browsing': {
    title: 'Browsing the catalog',
    body: `You don't need an account to look around — browse freely, sign in only to buy.

## Explore
[Explore](/explore) is the main catalog. You can:
- **Search** by title and description.
- **Filter** by category and by free vs. paid.
- **Sort** by newest or most popular.

## On a listing
Each repository page shows the description, a screenshot gallery, a live demo (if provided), the full **file tree**, reviews, and how many times it's sold.

When you find something you want, see [Purchasing a repository](/docs/purchasing).`,
  },

  'purchasing': {
    title: 'Purchasing a repository',
    body: `Buying is quick and protected by escrow.

## How it works
1. On the listing, click **Buy**.
2. Pay in crypto through our checkout — see [Paying with crypto](/docs/paying-with-crypto).
3. Once your payment confirms, **access unlocks** and the repo appears in your library.

## Escrow protects you
Your payment goes into **escrow**. The seller isn't paid out until you **confirm** you got what you paid for (or an auto-release window passes). If something's wrong, you can open a **dispute** — see [Refund policy](/docs/refunds).

## Your library
Everything you've bought lives in one place on your [dashboard](/dashboard), and a repo you purchased can't be deleted out from under you.`,
  },

  'downloading': {
    title: 'Downloading source code',
    body: `After a purchase clears, the full source is yours to download.

## Download
Open the repository and click **Download**. The file comes through a Vydex link (not a raw storage URL), and access is verified every time — only the owner, buyers, and free-repo downloaders can pull the archive.

## Versions
If the seller has shipped updates, you can grab any **version** from the history — you always have access to the latest.

## Trouble downloading?
Make sure you're signed in with the account you purchased from. Still stuck? [Contact the team](/contact).`,
  },

  'refunds': {
    title: 'Refund policy',
    body: `Because code is delivered instantly, refunds work through **escrow and disputes** rather than a one-click button.

## Confirm or dispute
After buying, your payment sits in escrow:
- If everything's good, **release** it to the seller.
- If it's not — wrong files, broken, misrepresented — **open a dispute** instead of releasing.

## What happens in a dispute
A **moderator** reviews it and decides: release the funds to the seller, or refund you. Disputes are weighed case by case, with particular attention to **misrepresentation, non-delivery, or security issues**.

## Good to know
Digital goods can't be "returned" once downloaded, so be honest in disputes — and sellers, describe your work accurately to avoid them. See our full [Terms](/terms).`,
  },

  'review-rules': {
    title: 'Review rules',
    body: `Reviews are what make the marketplace trustworthy — so they're gated to keep them honest.

## Who can review
Only **verified buyers**. You can review a repository once you've **purchased** it (free repos count once you've claimed them). It's **one review per purchase** — no spam, no brigading. This is enforced at the database level, not just the UI.

## What's expected
- Rate honestly, 1–5 stars, based on what you actually received.
- Keep it civil and on-topic — a content filter blocks abusive language.
- Reviews feed a seller's **reputation**, so they carry real weight.

## For sellers
You can't edit or delete a buyer's review. The way to earn great ones is an accurate listing, a working demo and a clear README. If a review genuinely breaks the rules, [contact a moderator](/contact).`,
  },

  // ─── Account & security ──────────────────────────────────────────────────────
  '2fa': {
    title: 'Two-factor authentication',
    body: `Add a second layer to your account with an authenticator app.

## Enable it
Go to [Security settings](/settings/security), scan the QR code with **Google Authenticator**, Authy, 1Password or any TOTP app, and enter the 6-digit code to confirm.

## After enabling
You'll enter a code from your app when signing in. Keep your authenticator backed up — if you lose access to it, you'll need to recover through support.

We strongly recommend enabling 2FA, especially if you sell and receive payouts.`,
  },

  'change-email': {
    title: 'Changing your email',
    body: `Your email is your login (unless you signed up with GitHub).

## How to change it
Update your email from your account settings. For security, you'll need to **confirm the new address** by clicking the link we send to it — the change takes effect once confirmed.

## Signed in with GitHub?
Your identity comes from GitHub, so manage your email there. You can also set an email/password login if you'd like a second way in.

Need a hand? [Contact the team](/contact).`,
  },

  'github-oauth': {
    title: 'GitHub OAuth login',
    body: `The fastest way onto Vydex is **Continue with GitHub**.

## Why use it
- No password to create or remember.
- One click to sign in every time.
- Your GitHub identity helps establish trust.

## How it works
On the [sign-in page](/auth), click **Continue with GitHub** and authorize Vydex. We only request what's needed to sign you in — we never get your GitHub password, and we can't push or pull your repos.

You can use GitHub and email/password side by side on the same account.`,
  },

  'privacy': {
    title: 'Data & privacy',
    body: `Privacy is a default here, not a setting.

## We don't touch card data
Payments are **crypto-only**, so there are no card numbers to store, leak or get "put under review."

## What we keep
The minimum to run the marketplace: your account, your listings and purchases, reviews and messages. We don't sell your data or run creepy trackers.

## Your control
Verified socials are opt-in via OAuth, and your public profile only shows what you choose to share.

For the full details, read our [Privacy Policy](/privacy).`,
  },

  // ─── Payments ────────────────────────────────────────────────────────────────
  'paying-with-crypto': {
    title: 'Paying with crypto',
    body: `Vydex is crypto-only — it's the position, not a limitation. No card middlemen, no chargebacks, works in every country from day one.

## How checkout works
1. Click **Buy** on a paid listing.
2. Checkout opens a secure crypto invoice (powered by **NOWPayments**).
3. Send the payment from any wallet. When it confirms on-chain, your access unlocks automatically.

## What you'll need
A crypto wallet with funds in a supported coin — see [Supported coins & networks](/docs/supported-coins). Pay the exact amount shown and you're done.

Your payment is held in [escrow](/docs/purchasing) until you confirm the purchase.`,
  },

  'supported-coins': {
    title: 'Supported coins & networks',
    body: `Checkout accepts a wide range of cryptocurrencies through NOWPayments — **300+ coins**, including the majors:

- **Bitcoin** (BTC)
- **Ethereum** (ETH)
- **USDT** — on Tron (TRC-20), BNB Smart Chain (BEP-20), Ethereum (ERC-20), Polygon and Solana
- **USDC** — on multiple networks

## Pick a low-fee network
Stablecoins on **Tron (TRC-20)**, **BNB Smart Chain (BEP-20)**, **Polygon** or **Solana** have tiny network fees — ideal for smaller purchases. Ethereum (ERC-20) works but gas can be high.

Always double-check the **network** matches between your wallet and the invoice before sending.`,
  },

  'payouts': {
    title: 'Seller payouts',
    body: `When a sale clears escrow, the money is yours.

## Set your payout wallet
On your [dashboard](/dashboard), add a **payout wallet** — an address and network (e.g. USDT on Tron or BNB Smart Chain). This is where your earnings are sent.

## How payouts flow
1. A buyer pays → the funds sit in **escrow**.
2. The buyer **confirms** (or the auto-release window passes) → the sale is "ready to pay out."
3. You're paid out in **USDT / USDC** to your wallet.

## Track your earnings
The dashboard shows three numbers at a glance: what's **in escrow**, what's **ready to pay out**, and what's already been **paid out**.`,
  },

  'fees': {
    title: 'Platform fees',
    body: `Simple and flat — no listing fees, no monthly cost.

## The numbers
- **First 30 days: 0% fee.** Everything you sell in your first month is yours.
- **After that: a flat 10%.** You keep ~90% of every sale.

## What it covers
Hosting, checkout, escrow, payouts, discovery and the trust layer that makes the marketplace work.

## Network fees
Separately, every crypto transfer carries a small **blockchain network fee** (a few cents on low-fee networks). That's the chain's cost, not ours — it's why a few dollars is a sensible minimum price. See [Pricing your repository](/docs/pricing).`,
  },

  // ─── API & integrations ──────────────────────────────────────────────────────
  'api-overview': {
    title: 'API overview',
    body: `A public Vydex API is **on the roadmap**, not live yet.

## What it'll do
Programmatic access to the things you'd expect — listing and managing your repositories, reading your sales and payouts, and reacting to events.

## Want early access?
We're shaping it with real use cases. If you're building something that needs the API — a CI step, a dashboard, an integration — [tell us what you need](/contact) and we'll loop you into the early access list.

Until then, everything is available through the web app.`,
  },

  'api-auth': {
    title: 'Authentication',
    body: `_Part of the upcoming [API](/docs/api-overview), not yet available._

When the API ships, you'll authenticate with a **personal API key** generated from your account settings, passed as a bearer token on each request. Keys will be scoped and revocable, so you can limit what an integration can do and cut it off instantly.

Want in early? [Get in touch](/contact).`,
  },

  'webhooks': {
    title: 'Webhooks',
    body: `_Part of the upcoming [API](/docs/api-overview), not yet available._

Planned webhooks will let your systems react to events in real time — a new sale, a payout, a new review — by POSTing a signed payload to a URL you configure. Signatures will let you verify each delivery really came from Vydex.

If real-time events would unblock something you're building, [let us know](/contact).`,
  },

  'rate-limits': {
    title: 'Rate limits',
    body: `_Part of the upcoming [API](/docs/api-overview), not yet available._

The API will apply fair-use rate limits per key, with the current limit and remaining quota returned in response headers so you can back off gracefully. Limits will be generous for normal use and exist mainly to keep the platform fast and fair for everyone.

Building something high-volume? [Talk to us](/contact) about higher limits.`,
  },
}
