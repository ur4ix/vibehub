import type { Metadata } from 'next'
import Link from 'next/link'
import { SiteHeader } from '@/components/site-header'
import { SiteFooter } from '@/components/site-footer'

export const metadata: Metadata = {
  title: 'Privacy Policy — Vydex',
  description:
    'How Vydex collects, uses, shares, and protects your personal information when you use the Services.',
}

const LAST_UPDATED = 'June 15, 2026'

// ─── Content model ────────────────────────────────────────────────────────────

type Block =
  | { kind: 'p'; text: string }
  | { kind: 'sub'; text: string }
  | { kind: 'list'; items: string[] }

interface Section {
  id: string
  title: string
  blocks: Block[]
}

const SECTIONS: Section[] = [
  {
    id: 'introduction',
    title: 'Introduction',
    blocks: [
      { kind: 'p', text: 'Welcome to Vydex ("Vydex", "we", "our", or "us").' },
      {
        kind: 'p',
        text: 'We respect your privacy and are committed to protecting your personal information. This Privacy Policy explains what information we collect, how we use it, how we share it, and the rights you have regarding your information when you use our website, applications, APIs, and related services (collectively, the "Services").',
      },
      {
        kind: 'p',
        text: 'By using the Services, you agree to the collection and use of information in accordance with this Privacy Policy.',
      },
    ],
  },
  {
    id: 'information-we-collect',
    title: 'Information We Collect',
    blocks: [
      { kind: 'sub', text: 'Information You Provide' },
      { kind: 'p', text: 'We may collect information you provide directly to us, including:' },
      {
        kind: 'list',
        items: [
          'Name and username',
          'Email address',
          'Profile information',
          'Account credentials',
          'Organization and team information',
          'Billing and payment information',
          'Communications sent to us',
          'Content you upload, create, or publish through the Services',
        ],
      },
      { kind: 'sub', text: 'Information Collected Automatically' },
      { kind: 'p', text: 'When you access or use the Services, we may automatically collect:' },
      {
        kind: 'list',
        items: [
          'IP address',
          'Browser type and version',
          'Operating system',
          'Device information',
          'Log data',
          'Usage information',
          'Referral URLs',
          'Date and time of requests',
        ],
      },
      { kind: 'sub', text: 'Cookies and Similar Technologies' },
      { kind: 'p', text: 'We use cookies and similar technologies to:' },
      {
        kind: 'list',
        items: [
          'Authenticate users',
          'Maintain sessions',
          'Remember preferences',
          'Analyze usage patterns',
          'Improve performance and security',
        ],
      },
      {
        kind: 'p',
        text: 'You can configure your browser to refuse cookies, although some features may not function properly.',
      },
    ],
  },
  {
    id: 'how-we-use-information',
    title: 'How We Use Information',
    blocks: [
      { kind: 'p', text: 'We use collected information to:' },
      {
        kind: 'list',
        items: [
          'Provide and maintain the Services',
          'Authenticate users and secure accounts',
          'Process payments and subscriptions',
          'Respond to support requests',
          'Improve and develop new features',
          'Monitor usage and performance',
          'Detect, prevent, and investigate abuse, fraud, and security incidents',
          'Comply with legal obligations',
          'Communicate updates, security notices, and service-related information',
        ],
      },
    ],
  },
  {
    id: 'user-content',
    title: 'User Content',
    blocks: [
      { kind: 'p', text: 'The Services may allow you to create, upload, store, and publish content.' },
      {
        kind: 'p',
        text: 'You retain ownership of your content. However, by using the Services, you grant us a limited license to host, process, store, transmit, and display your content solely for the purpose of operating and improving the Services.',
      },
      { kind: 'p', text: 'Public content may be visible to other users and search engines.' },
    ],
  },
  {
    id: 'connected-accounts',
    title: 'Connected Accounts',
    blocks: [
      {
        kind: 'p',
        text: 'The Services let you sign in with, and connect, third-party accounts such as GitHub and X. When you authenticate or link one of these accounts, we receive limited profile information from the provider — for example your verified username, account identifier, avatar, and (where you permit it) your email address.',
      },
      {
        kind: 'p',
        text: 'We use this information to verify ownership of the connected account, populate your public profile, and authenticate you. You can disconnect a linked account at any time from your profile settings, subject to keeping at least one valid sign-in method on your account.',
      },
    ],
  },
  {
    id: 'third-party-services',
    title: 'Third-Party Services',
    blocks: [
      {
        kind: 'p',
        text: 'We rely on third-party providers to operate the Services. These providers process personal information on our behalf under contractual obligations designed to protect your information. They include, among others:',
      },
      {
        kind: 'list',
        items: [
          'Cloud hosting and infrastructure providers (for application hosting and content delivery)',
          'Database, authentication, and file-storage providers',
          'Payment processors',
          'Authentication providers (e.g. GitHub, X) used for sign-in and account linking',
          'Analytics providers',
          'Customer support platforms',
        ],
      },
      {
        kind: 'p',
        text: 'Each provider processes information in accordance with its own privacy policy and our agreements with it.',
      },
    ],
  },
  {
    id: 'payments',
    title: 'Payments',
    blocks: [
      {
        kind: 'p',
        text: 'Payments may be processed by third-party payment processors. We do not store full payment card information on our servers.',
      },
      {
        kind: 'p',
        text: 'Payment providers may collect and process information according to their own privacy policies.',
      },
    ],
  },
  {
    id: 'analytics',
    title: 'Analytics',
    blocks: [
      { kind: 'p', text: 'We may use analytics tools to understand how users interact with the Services.' },
      { kind: 'p', text: 'Analytics data may include:' },
      {
        kind: 'list',
        items: [
          'Pages visited',
          'Features used',
          'Session duration',
          'Device and browser information',
          'Performance metrics',
        ],
      },
      { kind: 'p', text: 'We use this information to improve the Services and user experience.' },
    ],
  },
  {
    id: 'sharing-of-information',
    title: 'Sharing of Information',
    blocks: [
      { kind: 'p', text: 'We do not sell your personal information.' },
      { kind: 'p', text: 'We may share information:' },
      {
        kind: 'list',
        items: [
          'With service providers acting on our behalf',
          'With your consent',
          'To comply with legal obligations',
          'To protect the rights, safety, and security of users, Vydex, and the public',
          'In connection with a merger, acquisition, financing, or sale of assets',
        ],
      },
    ],
  },
  {
    id: 'data-retention',
    title: 'Data Retention',
    blocks: [
      { kind: 'p', text: 'We retain information for as long as necessary to:' },
      {
        kind: 'list',
        items: [
          'Provide the Services',
          'Maintain security and integrity',
          'Comply with legal obligations',
          'Resolve disputes',
          'Enforce agreements',
        ],
      },
      {
        kind: 'p',
        text: 'When information is no longer required, we will delete or anonymize it where reasonably possible.',
      },
    ],
  },
  {
    id: 'security',
    title: 'Security',
    blocks: [
      {
        kind: 'p',
        text: 'We implement reasonable technical, administrative, and organizational safeguards designed to protect personal information.',
      },
      {
        kind: 'p',
        text: 'However, no method of transmission over the Internet or electronic storage is completely secure, and we cannot guarantee absolute security.',
      },
    ],
  },
  {
    id: 'international-transfers',
    title: 'International Transfers',
    blocks: [
      {
        kind: 'p',
        text: 'Your information may be processed and stored in countries other than your country of residence.',
      },
      {
        kind: 'p',
        text: 'Where required by law, we implement appropriate safeguards for international data transfers.',
      },
    ],
  },
  {
    id: 'your-rights',
    title: 'Your Rights',
    blocks: [
      { kind: 'p', text: 'Depending on your location, you may have rights including:' },
      {
        kind: 'list',
        items: [
          'Access to your personal information',
          'Correction of inaccurate information',
          'Deletion of personal information',
          'Restriction of processing',
          'Data portability',
          'Objection to processing',
          'Withdrawal of consent',
        ],
      },
      { kind: 'p', text: 'To exercise these rights, contact us using the information below.' },
    ],
  },
  {
    id: 'gdpr',
    title: 'GDPR Rights (EEA, UK, Switzerland)',
    blocks: [
      {
        kind: 'p',
        text: 'If you are located in the European Economic Area, United Kingdom, or Switzerland, we process personal information under one or more of the following legal bases:',
      },
      {
        kind: 'list',
        items: [
          'Performance of a contract',
          'Legitimate interests',
          'Compliance with legal obligations',
          'Consent',
        ],
      },
      {
        kind: 'p',
        text: 'You may also have the right to lodge a complaint with your local data protection authority.',
      },
    ],
  },
  {
    id: 'california',
    title: 'California Privacy Rights',
    blocks: [
      {
        kind: 'p',
        text: 'California residents may have rights under applicable privacy laws, including the right to:',
      },
      {
        kind: 'list',
        items: [
          'Know what personal information is collected',
          'Request deletion of personal information',
          'Correct inaccurate information',
          'Limit certain uses of personal information',
        ],
      },
      { kind: 'p', text: 'We do not sell personal information.' },
    ],
  },
  {
    id: 'children',
    title: "Children's Privacy",
    blocks: [
      { kind: 'p', text: 'The Services are not directed to children under the age of 13.' },
      {
        kind: 'p',
        text: 'We do not knowingly collect personal information from children under 13. If we become aware that such information has been collected, we will take reasonable steps to remove it.',
      },
    ],
  },
  {
    id: 'changes',
    title: 'Changes to This Policy',
    blocks: [
      { kind: 'p', text: 'We may update this Privacy Policy from time to time.' },
      {
        kind: 'p',
        text: 'When changes are made, we will update the "Last updated" date above. Material changes may be communicated through the Services or by email where appropriate.',
      },
    ],
  },
]

// ─── Renderers ────────────────────────────────────────────────────────────────

function BlockView({ block }: { block: Block }) {
  if (block.kind === 'sub') {
    return (
      <h3 className="mt-8 mb-3 font-pixel text-[11px] uppercase tracking-wider text-foreground">
        {block.text}
      </h3>
    )
  }
  if (block.kind === 'list') {
    return (
      <ul className="my-4 flex flex-col gap-2">
        {block.items.map((item) => (
          <li key={item} className="flex gap-2.5 text-sm leading-relaxed text-muted-foreground">
            <span className="mt-2 h-1.5 w-1.5 shrink-0 bg-primary" aria-hidden="true" />
            <span>{item}</span>
          </li>
        ))}
      </ul>
    )
  }
  return <p className="my-4 text-sm leading-relaxed text-muted-foreground">{block.text}</p>
}

export default function PrivacyPage() {
  return (
    <div className="min-h-screen bg-background">
      <SiteHeader />

      <main>
        {/* Header */}
        <section className="relative overflow-hidden border-b-2 border-border">
          <div className="pixel-grid absolute inset-0 opacity-40" aria-hidden="true" />
          <div className="relative mx-auto max-w-3xl px-4 py-16 sm:px-6 sm:py-20">
            <span className="font-pixel text-[8px] uppercase tracking-wider text-primary">{'// legal'}</span>
            <h1 className="mt-5 font-pixel text-2xl leading-[1.4] sm:text-3xl sm:leading-[1.4]">
              Privacy Policy
            </h1>
            <p className="mt-5 font-mono text-xs uppercase tracking-wider text-muted-foreground">
              Last updated: {LAST_UPDATED}
            </p>
          </div>
        </section>

        {/* Body */}
        <section className="mx-auto max-w-3xl px-4 py-14 sm:px-6">
          {/* Table of contents */}
          <nav
            aria-label="Sections"
            className="mb-12 border-2 border-border bg-card p-5"
          >
            <p className="mb-3 font-pixel text-[9px] uppercase tracking-wider text-muted-foreground">
              On this page
            </p>
            <ol className="grid gap-x-6 gap-y-2 sm:grid-cols-2">
              {SECTIONS.map((s, i) => (
                <li key={s.id} className="font-mono text-xs">
                  <a href={`#${s.id}`} className="text-muted-foreground transition-colors hover:text-primary">
                    <span className="text-primary">{String(i + 1).padStart(2, '0')}</span>{' '}
                    {s.title}
                  </a>
                </li>
              ))}
            </ol>
          </nav>

          {SECTIONS.map((s, i) => (
            <section key={s.id} id={s.id} className="scroll-mt-24 border-t-2 border-border pt-10 first:border-t-0 first:pt-0">
              <span className="font-pixel text-[8px] uppercase tracking-wider text-primary">
                {`// ${String(i + 1).padStart(2, '0')}`}
              </span>
              <h2 className="mt-4 font-pixel text-lg leading-[1.5]">{s.title}</h2>
              <div className="mt-4">
                {s.blocks.map((block, bi) => (
                  <BlockView key={bi} block={block} />
                ))}
              </div>
            </section>
          ))}

          {/* Contact */}
          <section
            id="contact"
            className="mt-10 scroll-mt-24 border-t-2 border-border pt-10"
          >
            <span className="font-pixel text-[8px] uppercase tracking-wider text-primary">
              {`// ${String(SECTIONS.length + 1).padStart(2, '0')}`}
            </span>
            <h2 className="mt-4 font-pixel text-lg leading-[1.5]">Contact Us</h2>
            <p className="mt-4 text-sm leading-relaxed text-muted-foreground">
              If you have questions about this Privacy Policy or our privacy practices, contact us at:
            </p>
            <div className="mt-5 border-2 border-border bg-card p-5 font-mono text-sm">
              <p className="text-muted-foreground">
                Email:{' '}
                <a href="mailto:admin@vydex.dev" className="text-primary hover:underline">
                  admin@vydex.dev
                </a>
              </p>
              <p className="mt-3 text-muted-foreground">Vydex</p>
              <p className="text-muted-foreground">
                <a
                  href="https://vydex.dev"
                  className="text-primary hover:underline"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  https://vydex.dev
                </a>
              </p>
            </div>
          </section>

          <div className="mt-14 text-center">
            <Link href="/" className="font-mono text-sm text-primary hover:underline">
              ← Back to home
            </Link>
          </div>
        </section>
      </main>

      <SiteFooter />
    </div>
  )
}
