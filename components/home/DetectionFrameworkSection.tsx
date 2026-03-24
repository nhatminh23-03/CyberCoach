import Link from "next/link";

import { ScrollReveal } from "@/components/home/ScrollReveal";
import { ArrowRightIcon, ChatIcon, CheckCircleIcon, GlobeIcon, MailIcon, SmsIcon } from "@/components/home/icons";

const vectors = [
  { label: "Vector 01", title: "Message Scan", active: true },
  { label: "Vector 02", title: "URL Scan" },
  { label: "Vector 03", title: "Screenshot" },
  { label: "Vector 04", title: "AR Scanner" },
  { label: "Vector 05", title: "Document Scan" }
];

const values = [
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
];

export function DetectionFrameworkSection() {
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
            {vectors.map((vector) => (
              <div
                key={vector.title}
                className={`border-b border-outline-variant/20 p-8 ${
                  vector.active ? "border-l-4 border-l-secondary bg-surface-container-low" : "hover:bg-surface-container-low"
                }`}
              >
                <span
                  className={`mb-2 block font-label text-[10px] font-bold uppercase tracking-[0.16em] ${
                    vector.active ? "text-secondary" : "text-outline"
                  }`}
                >
                  {vector.label}
                </span>
                <span
                  className={`block font-headline text-lg font-bold ${
                    vector.active ? "text-vellum" : "text-on-surface-variant"
                  }`}
                >
                  {vector.title}
                </span>
              </div>
            ))}
          </div>

          <div className="flex min-h-[500px] flex-col justify-between bg-surface-container-low p-12 lg:col-span-6">
            <div className="space-y-8">
              <div className="flex items-center gap-6">
                <div className="ghost-border flex h-16 w-16 items-center justify-center bg-primary-container">
                  <ChatIcon className="h-8 w-8 text-secondary" />
                </div>
                <h3 className="font-headline text-3xl font-bold text-vellum">Message Scan Module</h3>
              </div>

              <p className="max-w-xl text-xl font-light leading-relaxed text-on-surface-variant">
                Advanced linguistic decomposition and behavioral analysis for SMS, WhatsApp, and email. We
                identify social engineering patterns before they compromise trust.
              </p>

              <div className="grid gap-8 pt-8 md:grid-cols-2">
                <div className="ghost-border space-y-4 bg-surface-container-lowest/50 p-6">
                  <SmsIcon className="h-6 w-6 text-secondary" />
                  <p className="font-label text-[10px] font-bold uppercase tracking-[0.14em] text-vellum">
                    SMS Analysis
                  </p>
                  <p className="text-sm leading-relaxed text-on-surface-variant">
                    Phishing detection informed by sender cues, urgency language, and embedded destination clues.
                  </p>
                </div>

                <div className="ghost-border space-y-4 bg-surface-container-lowest/50 p-6">
                  <MailIcon className="h-6 w-6 text-secondary" />
                  <p className="font-label text-[10px] font-bold uppercase tracking-[0.14em] text-vellum">
                    Email Logic
                  </p>
                  <p className="text-sm leading-relaxed text-on-surface-variant">
                    Header-style context, spoofing cues, and malicious request patterns reviewed in plain language.
                  </p>
                </div>
              </div>
            </div>

            <div className="flex flex-col gap-4 pt-12 sm:flex-row">
              <Link href="/scan" className="editorial-button editorial-button-primary px-8">
                Quick Scan
              </Link>
              <a href="#philosophy" className="editorial-button px-8">
                Detection Layers
              </a>
            </div>
          </div>

          <div className="border-l border-outline-variant/20 bg-surface-container-lowest p-12 lg:col-span-3">
            <div className="flex h-full flex-col space-y-12">
              <div className="space-y-6">
                <h4 className="font-headline text-xl font-bold leading-tight text-vellum">
                  Simple, human language. Zero technical jargon.
                </h4>

                <div className="space-y-4">
                  {values.map((value) => (
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
                    Global Threat Map
                  </p>
                  <p className="font-headline text-2xl font-bold text-vellum">2.4M</p>
                  <p className="max-w-[14rem] text-[10px] leading-tight text-outline">
                    Threats mitigated in the last 24 hours across our network nodes.
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
