import type { Metadata } from 'next'
import { SiteHeader } from '@/components/site-header'
import { SiteFooter } from '@/components/site-footer'
import { LegalDoc, type LegalSection } from '@/components/legal-doc'

export const metadata: Metadata = {
  title: 'Terms of Service — Vydex',
  description: 'The terms that govern your use of Vydex — the marketplace for vibe coders.',
}

const LAST_UPDATED = 'June 16, 2026'

const SECTIONS: LegalSection[] = [
  {
    id: 'agreement',
    title: 'Agreement to Terms',
    blocks: [
      {
        kind: 'p',
        text: 'These Terms of Service ("Terms") govern your access to and use of Vydex — our website, applications, APIs and related services (collectively, the "Services") operated by Vydex ("Vydex", "we", "our", or "us").',
      },
      {
        kind: 'p',
        text: 'By creating an account or using the Services, you agree to be bound by these Terms and by our Privacy Policy. If you do not agree, do not use the Services.',
      },
    ],
  },
  {
    id: 'eligibility',
    title: 'Eligibility',
    blocks: [
      {
        kind: 'p',
        text: 'You must be at least 13 years old to use the Services, and at least 18 (or the age of majority in your jurisdiction) to buy or sell. By using the Services you represent that you meet these requirements and that you can form a binding contract with us.',
      },
    ],
  },
  {
    id: 'accounts',
    title: 'Accounts',
    blocks: [
      {
        kind: 'p',
        text: 'You are responsible for the activity that happens under your account and for keeping your credentials secure. Notify us immediately of any unauthorized use. You agree to provide accurate information and to keep it up to date.',
      },
      {
        kind: 'p',
        text: 'Connected accounts (such as GitHub or X) are used to authenticate you and to verify ownership of the handles shown on your profile. You can disconnect them at any time, subject to keeping at least one valid sign-in method.',
      },
    ],
  },
  {
    id: 'the-services',
    title: 'The Services',
    blocks: [
      {
        kind: 'p',
        text: 'Vydex is a marketplace where developers list, sell, buy and fork code and related digital goods — apps, UI components, prompts, templates and similar work.',
      },
      {
        kind: 'p',
        text: 'We provide the platform that connects buyers and sellers. Except where expressly stated, we are not a party to the transactions between users, and we do not author or guarantee user-listed content.',
      },
    ],
  },
  {
    id: 'seller-terms',
    title: 'Seller Terms',
    blocks: [
      { kind: 'p', text: 'If you list or sell on Vydex, you represent and agree that:' },
      {
        kind: 'list',
        items: [
          'You own or have all rights necessary to sell and license the content you list.',
          'Your content does not infringe the intellectual property, privacy or other rights of any third party.',
          'Your listing description is accurate and not misleading.',
          'You will honor the license you offer to buyers.',
        ],
      },
      {
        kind: 'p',
        text: 'You retain ownership of your content. By listing it, you grant Vydex a non-exclusive, worldwide license to host, store, display, market and distribute it for the purpose of operating the Services, and you grant buyers the license described in your listing upon a completed purchase.',
      },
    ],
  },
  {
    id: 'buyer-terms',
    title: 'Buyer Terms',
    blocks: [
      {
        kind: 'p',
        text: 'When you buy or download a listing, you receive the license described on that listing. Unless stated otherwise, purchases are for your own use or your projects and may not be resold or redistributed as-is.',
      },
      {
        kind: 'p',
        text: 'You are responsible for reviewing code before using it in production. Automated scanning (see below) reduces but does not eliminate risk.',
      },
    ],
  },
  {
    id: 'payments',
    title: 'Payments, Fees & Payouts',
    blocks: [
      {
        kind: 'p',
        text: 'Payments are processed by third-party payment providers. By transacting on Vydex you agree to their terms. We do not store full payment card details.',
      },
      {
        kind: 'p',
        text: 'Vydex may charge a platform fee on sales, disclosed before you list or buy. Seller payouts are made to a connected payout account, subject to the provider’s verification and schedule.',
      },
    ],
  },
  {
    id: 'escrow-refunds',
    title: 'Escrow & Refunds',
    blocks: [
      {
        kind: 'p',
        text: 'Where escrow is offered, buyer funds may be held by the payment provider for a defined window before release to the seller, to allow buyers to evaluate a purchase.',
      },
      {
        kind: 'p',
        text: 'Refund eligibility is described in the applicable listing and our refund policy. Because digital goods are delivered instantly, refunds are handled case by case, with particular weight given to misrepresentation, non-delivery, or security issues.',
      },
    ],
  },
  {
    id: 'acceptable-use',
    title: 'Prohibited Content & Conduct',
    blocks: [
      { kind: 'p', text: 'You must not upload, list, sell or distribute through the Services any content that:' },
      {
        kind: 'list',
        items: [
          'Contains malware, viruses, RATs, stealers, drainers, backdoors, or other malicious or deceptive code.',
          'Exfiltrates data, credentials, wallet keys, or secrets without clear, lawful consent.',
          'Infringes intellectual property, or includes leaked, stolen, or unlicensed code.',
          'Is illegal, harmful, harassing, hateful, or violates the rights or privacy of others.',
          'Circumvents platform fees, scanning, or security controls.',
        ],
      },
      {
        kind: 'p',
        text: 'You also agree not to scrape, overload, reverse-engineer, or abuse the Services or other users.',
      },
    ],
  },
  {
    id: 'scanning',
    title: 'Code Scanning & Removal',
    blocks: [
      {
        kind: 'p',
        text: 'We may scan uploaded content for malware, vulnerabilities, secrets and other risks, automatically and/or manually, before and after publication. Listings that fail review may be held, unpublished, or rejected.',
      },
      {
        kind: 'p',
        text: 'We may remove content, suspend listings, withhold or reverse payouts, and forfeit any seller deposit where we reasonably believe content is malicious, infringing, or in breach of these Terms.',
      },
    ],
  },
  {
    id: 'platform-ip',
    title: 'Intellectual Property',
    blocks: [
      {
        kind: 'p',
        text: 'The Vydex name, logo, design, and platform software are owned by Vydex and protected by intellectual property laws. These Terms do not grant you any right to our brand or platform code except as needed to use the Services.',
      },
    ],
  },
  {
    id: 'dmca',
    title: 'Copyright & Takedowns',
    blocks: [
      {
        kind: 'p',
        text: 'If you believe content on Vydex infringes your copyright or other rights, contact us with enough detail to identify the content and your claim. We will review and may remove infringing material and take action against repeat infringers.',
      },
    ],
  },
  {
    id: 'disclaimers',
    title: 'Disclaimers',
    blocks: [
      {
        kind: 'p',
        text: 'The Services and all user content are provided "as is" and "as available", without warranties of any kind, whether express or implied, including merchantability, fitness for a particular purpose, and non-infringement.',
      },
      {
        kind: 'p',
        text: 'We do not warrant that user-listed code is secure, error-free, or fit for your use. You use it at your own risk and are responsible for your own review and testing.',
      },
    ],
  },
  {
    id: 'liability',
    title: 'Limitation of Liability',
    blocks: [
      {
        kind: 'p',
        text: 'To the maximum extent permitted by law, Vydex will not be liable for any indirect, incidental, special, consequential, or punitive damages, or for lost profits, data, or goodwill, arising from your use of the Services or any user content.',
      },
      {
        kind: 'p',
        text: 'Our total liability for any claim relating to the Services will not exceed the greater of the amounts you paid to Vydex in the three months before the claim, or USD 100.',
      },
    ],
  },
  {
    id: 'indemnification',
    title: 'Indemnification',
    blocks: [
      {
        kind: 'p',
        text: 'You agree to indemnify and hold Vydex harmless from claims, damages, and expenses (including reasonable legal fees) arising from your content, your use of the Services, or your breach of these Terms.',
      },
    ],
  },
  {
    id: 'termination',
    title: 'Termination',
    blocks: [
      {
        kind: 'p',
        text: 'You may stop using the Services at any time. We may suspend or terminate your access if you breach these Terms or to protect the Services, other users, or third parties. Provisions that by their nature should survive termination will survive.',
      },
    ],
  },
  {
    id: 'changes',
    title: 'Changes to the Services & Terms',
    blocks: [
      {
        kind: 'p',
        text: 'We may modify the Services or these Terms from time to time. Material changes will be reflected by updating the "Last updated" date and, where appropriate, by additional notice. Continued use after changes take effect means you accept them.',
      },
    ],
  },
  {
    id: 'governing-law',
    title: 'Governing Law',
    blocks: [
      {
        kind: 'p',
        text: 'These Terms are governed by the laws of the jurisdiction in which Vydex operates, without regard to conflict-of-laws rules. Disputes will be resolved in the competent courts of that jurisdiction, unless applicable law provides otherwise.',
      },
    ],
  },
]

export default function TermsPage() {
  return (
    <div className="min-h-screen bg-background">
      <SiteHeader />
      <LegalDoc
        title="Terms of Service"
        lastUpdated={LAST_UPDATED}
        intro="Please read these Terms carefully. They are a binding agreement between you and Vydex."
        sections={SECTIONS}
      />
      <SiteFooter />
    </div>
  )
}
