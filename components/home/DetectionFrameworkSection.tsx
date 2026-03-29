"use client";

import Link from "next/link";
import { useState, type ComponentType } from "react";

import { ScrollReveal } from "@/components/home/ScrollReveal";
import {
  ChatIcon,
  CheckCircleIcon,
  GlobeIcon,
  MailIcon,
  SmsIcon
} from "@/components/home/icons";

type IconProps = {
  className?: string;
};

function LinkScanIcon({ className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" className={className}>
      <path d="M10.5 13.5 13.5 10.5" />
      <path d="M7.8 15.8 5.5 18a3 3 0 0 1-4.2-4.2l2.3-2.3a3 3 0 0 1 4.2 0" />
      <path d="m16.2 8.2 2.3-2.2a3 3 0 1 1 4.2 4.2L20.4 12a3 3 0 0 1-4.2 0" />
    </svg>
  );
}

function ScreenshotIcon({ className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" className={className}>
      <path d="M4.5 4.5h6v2h-4v4h-2Z" />
      <path d="M19.5 4.5v6h-2v-4h-4v-2Z" />
      <path d="M4.5 19.5v-6h2v4h4v2Z" />
      <path d="M19.5 19.5h-6v-2h4v-4h2Z" />
    </svg>
  );
}

function CubeIcon({ className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" className={className}>
      <path d="m12 3 7 4v10l-7 4-7-4V7l7-4Z" />
      <path d="m12 12 7-4" />
      <path d="m12 12-7-4" />
      <path d="M12 12v9" />
    </svg>
  );
}

function DocumentIcon({ className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" className={className}>
      <path d="M7 3.5h7l4 4V20.5H7Z" />
      <path d="M14 3.5v4h4" />
      <path d="M9.5 13.5h5" />
      <path d="M9.5 17h5" />
    </svg>
  );
}

type VectorId = "message" | "url" | "screenshot" | "ar" | "document";

type VectorCard = {
  title: string;
  body: string;
  Icon: ComponentType<IconProps>;
};

type VectorValue = {
  title: string;
  body: string;
};

type VectorDefinition = {
  id: VectorId;
  label: string;
  title: string;
  moduleTitle: string;
  description: string;
  href: string;
  ctaLabel: string;
  secondaryLabel: string;
  secondaryHref: string;
  statLabel: string;
  statValue: string;
  statBody: string;
  panelTitle: string;
  panelIntro: string;
  Icon: ComponentType<IconProps>;
  cards: VectorCard[];
  values: VectorValue[];
};

const vectors: VectorDefinition[] = [
  {
    id: "message",
    label: "Vector 01",
    title: "Message Scan",
    moduleTitle: "Message Scan Module",
    description:
      "Advanced linguistic decomposition and behavioral analysis for SMS, WhatsApp, and email. We identify social engineering patterns before they compromise trust.",
    href: "/scan",
    ctaLabel: "Quick Scan",
    secondaryLabel: "Detection Layers",
    secondaryHref: "#philosophy",
    statLabel: "Global Threat Map",
    statValue: "2.4M",
    statBody: "Threats mitigated in the last 24 hours across our network nodes.",
    panelTitle: "Simple, human language. Zero technical jargon.",
    panelIntro: "Message analysis keeps the workflow calm, clear, and usable for everyday scam reports.",
    Icon: ChatIcon,
    cards: [
      {
        title: "SMS Analysis",
        body: "Phishing detection informed by sender cues, urgency language, and embedded destination clues.",
        Icon: SmsIcon
      },
      {
        title: "Email Logic",
        body: "Header-style context, spoofing cues, and malicious request patterns reviewed in plain language.",
        Icon: MailIcon
      }
    ],
    values: [
      {
        title: "Privacy First",
        body: "Your data is handled with discretion and prepared for safe review before deeper analysis."
      },
      {
        title: "Clear Logic",
        body: "Understand exactly why something was flagged without technical overload or vague scoring."
      },
      {
        title: "Safe Steps",
        body: "Receive calm, concrete next actions you can take immediately when a threat feels credible."
      }
    ]
  },
  {
    id: "url",
    label: "Vector 02",
    title: "URL Scan",
    moduleTitle: "URL Intelligence Module",
    description:
      "Inspect suspicious links for deceptive domains, shortened redirects, and known phishing infrastructure before a risky page ever opens.",
    href: "/scan/url",
    ctaLabel: "Open URL Scan",
    secondaryLabel: "Review Scan Suite",
    secondaryHref: "/scan/url",
    statLabel: "Domain Signals",
    statValue: "18K",
    statBody: "Suspicious hosts triaged today across redirect chains, typo domains, and raw-IP lures.",
    panelTitle: "Fast signal checks before you click.",
    panelIntro: "The URL layer surfaces host, structure, and reputation cues with minimal friction.",
    Icon: LinkScanIcon,
    cards: [
      {
        title: "Deep Link Crawl",
        body: "Resolve suspicious destinations, catch redirect chains, and expose bait-and-switch entry points.",
        Icon: LinkScanIcon
      },
      {
        title: "Domain Reputation",
        body: "Highlight young domains, risky patterns, and phishing-database matches before a visit happens.",
        Icon: GlobeIcon
      }
    ],
    values: [
      {
        title: "Pre-Visit Safety",
        body: "Catch risk before loading a site that could request credentials or deliver malware."
      },
      {
        title: "Visible Structure",
        body: "Show domain parts, shortening behavior, and redirects in a format non-experts can follow."
      },
      {
        title: "Actionable Triage",
        body: "Quickly decide whether to avoid, verify through another channel, or escalate a suspicious link."
      }
    ]
  },
  {
    id: "screenshot",
    label: "Vector 03",
    title: "Screenshot",
    moduleTitle: "Screenshot Intelligence Module",
    description:
      "Read scam screenshots as visual evidence, combining OCR, QR payload detection, and interface-level impersonation cues in one pass.",
    href: "/scan/screenshot",
    ctaLabel: "Open Screenshot Scan",
    secondaryLabel: "Capture Workflow",
    secondaryHref: "/scan/screenshot",
    statLabel: "Visual Evidence Queue",
    statValue: "640",
    statBody: "Captured screens reviewed today for fake payment prompts, account alerts, and QR traps.",
    panelTitle: "Visual scams need visual analysis.",
    panelIntro: "This vector turns screenshots into structured risk signals without asking the user to transcribe anything.",
    Icon: ScreenshotIcon,
    cards: [
      {
        title: "OCR Recovery",
        body: "Extract visible language from screenshots so suspicious requests can be analyzed like a message thread.",
        Icon: ScreenshotIcon
      },
      {
        title: "QR Inspection",
        body: "Decode embedded QR destinations and surface hidden links before they are scanned on a mobile device.",
        Icon: GlobeIcon
      }
    ],
    values: [
      {
        title: "Less Manual Work",
        body: "Users can upload what they see instead of retyping scam content under stress."
      },
      {
        title: "Context Preserved",
        body: "Layout, branding, urgency banners, and other visual clues remain part of the investigation."
      },
      {
        title: "Cross-Channel Coverage",
        body: "Catch scams arriving through social posts, payment apps, chats, and device notifications."
      }
    ]
  },
  {
    id: "ar",
    label: "Vector 04",
    title: "AR Scanner",
    moduleTitle: "AR Scanner Preview",
    description:
      "Prototype an on-device overlay that flags environmental scam cues in real time, from fake collection slips to impersonation signage.",
    href: "/scan?view=ar",
    ctaLabel: "Preview AR Flow",
    secondaryLabel: "Scanner Suite",
    secondaryHref: "/scan?view=ar",
    statLabel: "Field Signals",
    statValue: "Soon",
    statBody: "AR support is staged as the next intelligence surface for live camera-based scam guidance.",
    panelTitle: "Built for in-the-moment verification.",
    panelIntro: "AR is still staged, but this vector explains the real-world use cases the product is aiming to cover next.",
    Icon: CubeIcon,
    cards: [
      {
        title: "Live Surface Cues",
        body: "Highlight suspicious payment instructions, delivery notices, or pop-up signage in the camera frame.",
        Icon: CubeIcon
      },
      {
        title: "Guided Verification",
        body: "Overlay plain-language checkpoints so users can verify requests before following real-world prompts.",
        Icon: CheckCircleIcon
      }
    ],
    values: [
      {
        title: "Contextual Defense",
        body: "Useful when threats leave the inbox and appear as printed slips, kiosks, or physical social engineering."
      },
      {
        title: "Mobile First",
        body: "Designed to meet users where scam pressure happens, with camera-led review instead of delayed reporting."
      },
      {
        title: "Roadmap Clarity",
        body: "Keeps the upcoming vector visible instead of feeling like a dead or decorative menu item."
      }
    ]
  },
  {
    id: "document",
    label: "Vector 05",
    title: "Document Scan",
    moduleTitle: "Document Scan Preview",
    description:
      "Prepare invoices, letters, and official-looking forms for structured review so forged paperwork does not slip past initial trust.",
    href: "/scan?view=document",
    ctaLabel: "Preview Document Flow",
    secondaryLabel: "Scanner Suite",
    secondaryHref: "/scan?view=document",
    statLabel: "Document Intake",
    statValue: "Soon",
    statBody: "Document review is staged for invoice fraud, fake notices, and attachment-led impersonation attempts.",
    panelTitle: "For scams that arrive looking official.",
    panelIntro: "The document vector frames how forged paperwork and attachments will be analyzed once that module is live.",
    Icon: DocumentIcon,
    cards: [
      {
        title: "Form Inspection",
        body: "Extract addresses, payment instructions, deadlines, and entity names from suspicious documents.",
        Icon: DocumentIcon
      },
      {
        title: "Consistency Checks",
        body: "Compare tone, branding, and payment requests for clues that a formal-looking notice is fabricated.",
        Icon: MailIcon
      }
    ],
    values: [
      {
        title: "Attachment Coverage",
        body: "Extends protection beyond chats and URLs into PDFs, notices, and other trust-heavy formats."
      },
      {
        title: "Financial Safety",
        body: "Supports invoice and billing verification before money moves to a fraudulent account."
      },
      {
        title: "Operational Readiness",
        body: "Gives the homepage a working document lane now instead of a placeholder that never responds."
      }
    ]
  }
];

export function DetectionFrameworkSection() {
  const [activeVectorId, setActiveVectorId] = useState<VectorId>("message");
  const activeVector = vectors.find((vector) => vector.id === activeVectorId) ?? vectors[0];

  return (
    <section id="detection" className="home-panel relative bg-surface px-8 py-28 md:px-16 lg:min-h-[100svh] lg:px-24 lg:py-24">
      <div className="absolute inset-x-0 top-0 h-28 bg-gradient-to-b from-primary-container to-transparent opacity-80" />
      <div className="mx-auto max-w-7xl">
        <ScrollReveal className="mb-20 flex flex-col justify-between gap-8 md:flex-row md:items-end">
          <div className="space-y-4">
            <p className="font-label text-[10px] font-bold uppercase tracking-[0.2em] text-secondary">
              Analysis Core
            </p>
            <h2 className="font-headline text-4xl font-extrabold tracking-editorial text-vellum md:text-5xl">
              Comprehensive Detection
            </h2>
          </div>
          <p className="max-w-md text-lg font-light leading-relaxed text-on-surface-variant">
            Our sovereign intelligence layer reviews suspicious communication across every major entry point
            before a scam becomes a mistake.
          </p>
        </ScrollReveal>

        <ScrollReveal className="grid gap-px bg-outline-variant/20 lg:grid-cols-12" delayMs={140}>
          <div className="bg-surface-container-lowest lg:col-span-3">
            {vectors.map((vector) => {
              const isActive = vector.id === activeVector.id;
              return (
                <button
                  key={vector.title}
                  type="button"
                  onClick={() => setActiveVectorId(vector.id)}
                  aria-pressed={isActive}
                  className={`w-full border-b border-outline-variant/20 p-8 text-left transition-colors duration-300 ${
                    isActive ? "border-l-4 border-l-secondary bg-surface-container-low" : "hover:bg-surface-container-low"
                  }`}
                >
                  <span
                    className={`mb-2 block font-label text-[10px] font-bold uppercase tracking-[0.16em] transition-colors ${
                      isActive ? "text-secondary" : "text-outline"
                    }`}
                  >
                    {vector.label}
                  </span>
                  <span
                    className={`block font-headline text-lg font-bold transition-colors ${
                      isActive ? "text-vellum" : "text-on-surface-variant"
                    }`}
                  >
                    {vector.title}
                  </span>
                </button>
              );
            })}
          </div>

          <div className="flex min-h-[500px] flex-col justify-between bg-surface-container-low p-12 lg:col-span-6">
            <div className="space-y-8">
              <div className="flex items-center gap-6">
                <div className="ghost-border flex h-16 w-16 items-center justify-center bg-primary-container">
                  <activeVector.Icon className="h-8 w-8 text-secondary" />
                </div>
                <h3 className="font-headline text-3xl font-bold text-vellum">{activeVector.moduleTitle}</h3>
              </div>

              <p className="max-w-xl text-xl font-light leading-relaxed text-on-surface-variant">
                {activeVector.description}
              </p>

              <div className="grid gap-8 pt-8 md:grid-cols-2">
                {activeVector.cards.map((card) => (
                  <div key={card.title} className="ghost-border space-y-4 bg-surface-container-lowest/50 p-6">
                    <card.Icon className="h-6 w-6 text-secondary" />
                    <p className="font-label text-[10px] font-bold uppercase tracking-[0.14em] text-vellum">
                      {card.title}
                    </p>
                    <p className="text-sm leading-relaxed text-on-surface-variant">{card.body}</p>
                  </div>
                ))}
              </div>
            </div>

            <div className="flex flex-col gap-4 pt-12 sm:flex-row">
              <Link href={activeVector.href} className="editorial-button editorial-button-primary px-8">
                {activeVector.ctaLabel}
              </Link>
              <Link href={activeVector.secondaryHref} className="editorial-button px-8">
                {activeVector.secondaryLabel}
              </Link>
            </div>
          </div>

          <div className="border-l border-outline-variant/20 bg-surface-container-lowest p-12 lg:col-span-3">
            <div className="flex h-full flex-col space-y-12">
              <div className="space-y-6">
                <h4 className="font-headline text-xl font-bold leading-tight text-vellum">
                  {activeVector.panelTitle}
                </h4>

                <p className="text-sm leading-relaxed text-on-surface-variant">{activeVector.panelIntro}</p>

                <div className="space-y-4">
                  {activeVector.values.map((value) => (
                    <div key={value.title} className="flex items-start gap-3">
                      <CheckCircleIcon className="mt-0.5 h-4 w-4 text-secondary" />
                      <div className="space-y-1">
                        <p className="text-sm font-bold text-vellum">{value.title}</p>
                        <p className="text-xs leading-relaxed text-on-surface-variant">{value.body}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="ghost-border relative mt-auto overflow-hidden bg-primary-container p-6">
                <div className="relative z-10 space-y-4">
                  <p className="font-label text-[9px] font-bold uppercase tracking-[0.16em] text-secondary">
                    {activeVector.statLabel}
                  </p>
                  <p className="font-headline text-2xl font-bold text-vellum">{activeVector.statValue}</p>
                  <p className="max-w-[14rem] text-[10px] leading-tight text-outline">
                    {activeVector.statBody}
                  </p>
                </div>
                <div className="absolute right-0 top-0 p-4 opacity-20">
                  <GlobeIcon className="h-16 w-16 text-secondary" />
                </div>
              </div>
            </div>
          </div>
        </ScrollReveal>
      </div>
    </section>
  );
}
