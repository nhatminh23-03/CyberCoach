"use client";

import Link from "next/link";
import { useState, type ComponentType } from "react";

import { ScrollReveal } from "@/components/home/ScrollReveal";
import {
  ChatIcon,
  CheckCircleIcon,
  GlobeIcon,
  MailIcon,
  PhoneCallIcon,
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

type VectorId = "message" | "url" | "screenshot" | "ar" | "document" | "voice";

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
    label: "Messages",
    title: "Message Scan",
    moduleTitle: "Check A Suspicious Message",
    description:
      "Check suspicious texts, emails, and chat messages for pressure, impersonation, and risky links before you reply.",
    href: "/scan",
    ctaLabel: "Start Message Scan",
    secondaryLabel: "Why It Helps",
    secondaryHref: "#philosophy",
    statLabel: "Best For",
    statValue: "Inbox",
    statBody: "Texts, emails, and chat messages that want a fast reply, click, payment, or code.",
    panelTitle: "Understand what feels off, fast.",
    panelIntro: "Message Scan explains pressure, impersonation, and risky links in plain language.",
    Icon: ChatIcon,
    cards: [
      {
        title: "Pressure And Tone",
        body: "Catch urgency, threats, fake authority, and other tactics that push people to act too quickly.",
        Icon: SmsIcon
      },
      {
        title: "Link And Sender Clues",
        body: "Review suspicious senders, embedded links, and requests for money, codes, or personal details.",
        Icon: MailIcon
      }
    ],
    values: [
      {
        title: "Easy To Use",
        body: "Paste the message and get a clear read without sorting through technical detail."
      },
      {
        title: "Clear Reasons",
        body: "See why something looks suspicious in plain language instead of vague risk jargon."
      },
      {
        title: "Calm Next Steps",
        body: "Get practical guidance for what to do next if the message feels risky."
      }
    ]
  },
  {
    id: "url",
    label: "Links",
    title: "URL Scan",
    moduleTitle: "Check A Suspicious Link",
    description:
      "Check whether a link itself looks deceptive before you open it, with the domain, redirects, and destination explained clearly.",
    href: "/scan/url",
    ctaLabel: "Open URL Scan",
    secondaryLabel: "See Link Checks",
    secondaryHref: "/scan/url",
    statLabel: "Best For",
    statValue: "Links",
    statBody: "Links that feel off before you open them, especially ones from texts, emails, and social posts.",
    panelTitle: "See link risk before you open it.",
    panelIntro: "URL Scan breaks down the link, its destination, and the safest next step.",
    Icon: LinkScanIcon,
    cards: [
      {
        title: "Domain And Redirects",
        body: "Spot lookalike domains, shortened links, redirect chains, and other common phishing patterns.",
        Icon: LinkScanIcon
      },
      {
        title: "Destination Check",
        body: "Review what happens when the link opens, including suspicious forms, logins, and page behavior.",
        Icon: GlobeIcon
      }
    ],
    values: [
      {
        title: "Before You Click",
        body: "See the risk before you visit a page that could ask for credentials or payment."
      },
      {
        title: "Easy To Read",
        body: "Domain parts, redirects, and red flags are explained in a format non-experts can follow."
      },
      {
        title: "Clear Decision",
        body: "Helps you decide whether to avoid the link, verify it another way, or escalate it."
      }
    ]
  },
  {
    id: "screenshot",
    label: "Screenshots",
    title: "Screenshot Scan",
    moduleTitle: "Check A Suspicious Screenshot",
    description:
      "Read screenshots as evidence so users do not have to retype what they received, including visible text, QR links, and interface clues.",
    href: "/scan/screenshot",
    ctaLabel: "Open Screenshot Scan",
    secondaryLabel: "See Screenshot Checks",
    secondaryHref: "/scan/screenshot",
    statLabel: "Best For",
    statValue: "Screens",
    statBody: "Alerts, payment prompts, DMs, and QR codes captured on screen.",
    panelTitle: "Screenshots can be checked too.",
    panelIntro: "Upload what you see and CyberCoach turns it into readable findings.",
    Icon: ScreenshotIcon,
    cards: [
      {
        title: "Read The Text",
        body: "Pull visible words out of a screenshot so the request can be reviewed without retyping it.",
        Icon: ScreenshotIcon
      },
      {
        title: "Check Hidden QR Links",
        body: "Decode QR codes and surface the destination before it is scanned on a phone.",
        Icon: GlobeIcon
      }
    ],
    values: [
      {
        title: "Less Re-Typing",
        body: "Users can upload what they see instead of copying a scam message by hand."
      },
      {
        title: "More Context",
        body: "Layout, branding, banners, and other visual clues stay part of the review."
      },
      {
        title: "Broader Coverage",
        body: "Useful for scams that show up in social apps, notifications, payment screens, and DMs."
      }
    ]
  },
  {
    id: "ar",
    label: "Camera",
    title: "AR Scanner",
    moduleTitle: "Camera Check Preview",
    description:
      "A preview of camera-based scam checking for printed notices, in-person prompts, and other real-world cues.",
    href: "/scan?view=ar",
    ctaLabel: "Preview AR Scanner",
    secondaryLabel: "See Preview",
    secondaryHref: "/scan?view=ar",
    statLabel: "Status",
    statValue: "Preview",
    statBody: "Camera-based guidance is the next scan flow planned for printed slips, kiosks, and other in-person prompts.",
    panelTitle: "Built for what happens off-screen.",
    panelIntro: "AR Scanner is still a preview, but it shows where camera-based checking is headed next.",
    Icon: CubeIcon,
    cards: [
      {
        title: "On-Camera Prompts",
        body: "Flag suspicious printed instructions, delivery slips, or public prompts shown in the camera view.",
        Icon: CubeIcon
      },
      {
        title: "Guided Next Steps",
        body: "Offer plain-language checkpoints before a user follows a real-world request.",
        Icon: CheckCircleIcon
      }
    ],
    values: [
      {
        title: "Real-World Context",
        body: "Useful when the suspicious request is on paper, signage, or a physical notice instead of a screen."
      },
      {
        title: "Phone-Friendly",
        body: "Designed for quick checking in the moment instead of asking users to remember details later."
      },
      {
        title: "Clearly Marked",
        body: "Shown as a preview so users know what is live today and what is still coming next."
      }
    ]
  },
  {
    id: "document",
    label: "Documents",
    title: "Document Scan",
    moduleTitle: "Check A Suspicious Document",
    description:
      "Check suspicious PDFs and office files for fake buttons, phishing links, payment pressure, credential prompts, and brand impersonation.",
    href: "/scan/document",
    ctaLabel: "Open Document Scan",
    secondaryLabel: "See Upload Flow",
    secondaryHref: "/scan/document",
    statLabel: "Best For",
    statValue: "Attachments",
    statBody: "PDFs and office files that look official but ask you to sign in, pay, or click.",
    panelTitle: "For files that look official.",
    panelIntro: "Document Scan explains suspicious buttons, links, and payment pressure without technical overload.",
    Icon: DocumentIcon,
    cards: [
      {
        title: "Links Inside Files",
        body: "Compare visible document buttons like Review or Open with the real destination underneath.",
        Icon: DocumentIcon
      },
      {
        title: "Invoice And Login Traps",
        body: "Spot payment pressure, credential requests, QR lures, and brand impersonation in polished-looking files.",
        Icon: MailIcon
      }
    ],
    values: [
      {
        title: "Beyond Messages",
        body: "Extends checking beyond chats and links into PDFs, forms, and document-based phishing lures."
      },
      {
        title: "Payment Safety",
        body: "Helps catch invoice fraud, payroll tricks, and payment redirection before money moves."
      },
      {
        title: "Plain-English Review",
        body: "Turns technical evidence into a calm summary, clear findings, and practical next steps."
      }
    ]
  },
  {
    id: "voice",
    label: "Calls",
    title: "Call Guard",
    moduleTitle: "Get Help With A Suspicious Call",
    description:
      "Helps users slow down suspicious calls, see a transcript, and get better verification questions before they trust the caller.",
    href: "/scan/voice",
    ctaLabel: "Open Call Guard",
    secondaryLabel: "See Call Flow",
    secondaryHref: "/scan/voice",
    statLabel: "Best For",
    statValue: "Calls",
    statBody: "Suspicious calls that pressure you to move fast, share a code, or trust a familiar voice.",
    panelTitle: "Extra support when a caller wants urgency.",
    panelIntro: "Call Guard helps users slow a call down, see the transcript, and verify before responding.",
    Icon: PhoneCallIcon,
    cards: [
      {
        title: "Live Transcript",
        body: "Turn a speakerphone call into readable text so pressure and impersonation cues are easier to catch.",
        Icon: PhoneCallIcon
      },
      {
        title: "Verification Questions",
        body: "Get smart prompts to verify the caller through trusted callback steps instead of trusting the voice alone.",
        Icon: CheckCircleIcon
      }
    ],
    values: [
      {
        title: "Supportive Design",
        body: "Large, simple controls help when a call feels stressful and fast-moving."
      },
      {
        title: "Behavior First",
        body: "The strongest guidance comes from scam pressure and risky requests, not overconfident deepfake claims."
      },
      {
        title: "Safer Decisions",
        body: "Encourages callback verification before money, codes, or account access change hands."
      }
    ]
  }
];

export function DetectionFrameworkSection() {
  const [activeVectorId, setActiveVectorId] = useState<VectorId>("message");
  const activeVector = vectors.find((vector) => vector.id === activeVectorId) ?? vectors[0];
  const activeVectorIndex = Math.max(
    0,
    vectors.findIndex((vector) => vector.id === activeVector.id)
  );

  return (
    <section id="detection" className="home-panel relative bg-surface px-4 py-16 sm:px-8 sm:py-20 md:px-16 lg:min-h-[100svh] lg:px-24 lg:py-24">
      <div className="absolute inset-x-0 top-0 h-28 bg-gradient-to-b from-primary-container to-transparent opacity-80" />
      <div className="mx-auto max-w-7xl">
        <ScrollReveal className="mb-12 flex flex-col justify-between gap-6 sm:mb-16 sm:gap-8 md:flex-row md:items-end lg:mb-20">
          <div className="space-y-4">
            <p className="font-label text-[10px] font-bold uppercase tracking-[0.2em] text-secondary">
              What CyberCoach Checks
            </p>
            <h2 className="font-headline text-3xl font-extrabold tracking-editorial text-vellum sm:text-4xl md:text-5xl">
              One Place To Check What Feels Off
            </h2>
          </div>
          <p className="max-w-md text-base font-light leading-relaxed text-on-surface-variant sm:text-lg">
            CyberCoach checks suspicious messages, links, screenshots, documents, and calls in one place so
            you can slow down and make a safer decision.
          </p>
        </ScrollReveal>

        <ScrollReveal className="space-y-6" delayMs={140}>
          <div className="lg:hidden">
            <div className="mb-4 flex items-center justify-between gap-4">
              <div>
                <p className="font-label text-[10px] font-bold uppercase tracking-[0.18em] text-on-primary-container">
                  Choose a scan
                </p>
                <p className="mt-2 text-sm leading-relaxed text-on-surface-variant">
                  Swipe through the scan suites and open the one that fits what you received.
                </p>
              </div>
              <p className="shrink-0 font-label text-[10px] font-bold uppercase tracking-[0.18em] text-secondary">
                {String(activeVectorIndex + 1).padStart(2, "0")} / {String(vectors.length).padStart(2, "0")}
              </p>
            </div>

            <div className="hide-scrollbar -mx-4 overflow-x-auto px-4 snap-x snap-mandatory sm:-mx-8 sm:px-8">
              <div className="flex w-max gap-3 pb-1">
                {vectors.map((vector) => {
                  const isActive = vector.id === activeVector.id;
                  return (
                    <button
                      key={vector.title}
                      type="button"
                      onClick={() => setActiveVectorId(vector.id)}
                      aria-pressed={isActive}
                      className={`group relative w-[74vw] max-w-[16.5rem] shrink-0 snap-center overflow-hidden border p-4 text-left transition-all duration-300 sm:w-[78vw] sm:max-w-[18rem] sm:p-5 ${
                        isActive
                          ? "border-secondary/28 bg-surface-container-low text-vellum shadow-atmospheric"
                          : "border-outline-variant/22 bg-surface-container-lowest/70 text-on-surface-variant hover:border-secondary/18 hover:bg-surface-container-low"
                      }`}
                    >
                      <span
                        className={`absolute inset-x-0 top-0 h-px transition-opacity duration-300 ${
                          isActive ? "bg-secondary opacity-100" : "bg-secondary/40 opacity-0"
                        }`}
                      />
                      <div className="flex items-start justify-between gap-4">
                        <div className="min-w-0">
                          <span className={`mb-2 block font-label text-[10px] font-bold uppercase tracking-[0.16em] ${isActive ? "text-secondary" : "text-outline"}`}>
                            {vector.label}
                          </span>
                          <span className={`block font-headline text-xl font-bold tracking-tight sm:text-2xl ${isActive ? "text-vellum" : "text-on-surface"}`}>
                            {vector.title}
                          </span>
                        </div>
                        <div
                          className={`ghost-border flex h-9 w-9 shrink-0 items-center justify-center transition-colors sm:h-10 sm:w-10 ${
                            isActive ? "bg-primary-container text-secondary" : "bg-surface-container-low text-outline"
                          }`}
                        >
                          <vector.Icon className="h-4 w-4 sm:h-5 sm:w-5" />
                        </div>
                      </div>

                      <p className={`mt-5 line-clamp-2 text-sm leading-relaxed ${isActive ? "text-on-surface-variant" : "text-outline"}`}>
                        {vector.statBody}
                      </p>

                      <div className="mt-5 flex items-center justify-between gap-3">
                        <span className={`font-label text-[10px] font-bold uppercase tracking-[0.16em] ${isActive ? "text-secondary" : "text-on-primary-container"}`}>
                          {vector.statValue}
                        </span>
                        <span className={`font-label text-[9px] font-bold uppercase tracking-[0.16em] transition-opacity ${
                          isActive ? "text-secondary opacity-100" : "text-outline opacity-70"
                        }`}>
                          {isActive ? "Selected" : "Tap To View"}
                        </span>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          <div className="grid gap-px bg-outline-variant/20 lg:grid-cols-12">
            <div className="hidden bg-surface-container-lowest lg:block lg:col-span-3">
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

            <div className="flex min-h-0 flex-col justify-between bg-surface-container-low p-8 sm:min-h-[460px] sm:p-10 lg:col-span-6 lg:min-h-[500px] lg:p-12">
              <div className="space-y-6 sm:space-y-8">
                <div className="flex items-center gap-4 sm:gap-6">
                  <div className="ghost-border flex h-14 w-14 items-center justify-center bg-primary-container sm:h-16 sm:w-16">
                    <activeVector.Icon className="h-7 w-7 text-secondary sm:h-8 sm:w-8" />
                  </div>
                  <h3 className="font-headline text-2xl font-bold text-vellum sm:text-3xl">{activeVector.moduleTitle}</h3>
                </div>

                <p className="max-w-xl text-lg font-light leading-relaxed text-on-surface-variant sm:text-xl">
                  {activeVector.description}
                </p>

                <div className="grid gap-5 pt-6 sm:gap-8 sm:pt-8 md:grid-cols-2">
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

              <div className="flex flex-col gap-4 pt-8 sm:flex-row sm:pt-10 lg:pt-12">
                <Link href={activeVector.href} className="editorial-button editorial-button-primary px-8">
                  {activeVector.ctaLabel}
                </Link>
                <Link href={activeVector.secondaryHref} className="editorial-button px-8">
                  {activeVector.secondaryLabel}
                </Link>
              </div>
            </div>

            <div className="bg-surface-container-lowest p-8 sm:p-10 lg:col-span-3 lg:border-l lg:border-outline-variant/20 lg:p-12">
              <div className="flex h-full flex-col space-y-8 sm:space-y-10 lg:space-y-12">
                <div className="space-y-5 sm:space-y-6">
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

                <div className="ghost-border relative mt-auto overflow-hidden bg-primary-container p-5 sm:p-6">
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
          </div>
        </ScrollReveal>
      </div>
    </section>
  );
}
