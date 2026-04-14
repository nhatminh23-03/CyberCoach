"use client";

import { useMemo } from "react";

import { LockIcon } from "@/components/home/icons";
import type { MessageSample } from "@/lib/scan";

type ScanSupportPanelsProps = {
  samples: MessageSample[];
  randomRealPhish: MessageSample | null;
  activeSampleId: string | null;
  privacyMode: boolean;
  onSelectSample: (sample: MessageSample) => void;
  onRefreshRandom: () => Promise<void>;
  samplesLoading: boolean;
};

const steps = [
  "Paste a suspicious message",
  "Execute the scan",
  "Review the result and next steps"
];

export function ScanSupportPanels({
  samples,
  randomRealPhish,
  activeSampleId,
  privacyMode,
  onSelectSample,
  onRefreshRandom,
  samplesLoading
}: ScanSupportPanelsProps) {
  const sampleItems = useMemo(() => {
    const base = [...samples];
    if (randomRealPhish) {
      base.push(randomRealPhish);
    } else {
      base.push({
        id: "random_real_phish",
        label: "Random real phish",
        text: ""
      });
    }
    return base;
  }, [randomRealPhish, samples]);

  return (
    <div className="space-y-6">
      <section className="ghost-border animate-fade-up bg-surface-container-low p-6" style={{ animationDelay: "120ms" }}>
        <div className="space-y-2">
          <p className="font-label text-[10px] font-bold uppercase tracking-[0.18em] text-secondary">Try A Sample</p>
          <h3 className="font-headline text-xl font-bold text-vellum">Demo Presets</h3>
          <p className="text-sm leading-relaxed text-on-surface-variant">
            Load realistic scenarios from the original CyberCoach flow without leaving the scan workspace.
          </p>
        </div>

        <div className="mt-6 grid gap-3">
          {sampleItems.map((sample, index) => {
            const isActive = activeSampleId === sample.id;
            const isRandom = sample.id === "random_real_phish";
            const disabled = isRandom && samplesLoading;
            return (
              <button
                key={`${sample.id}-${index}`}
                type="button"
                disabled={disabled}
                onClick={() => {
                  if (isRandom) {
                    void onRefreshRandom();
                    return;
                  }
                  onSelectSample(sample);
                }}
                className={`group flex items-center justify-between border px-4 py-4 text-left transition-all duration-300 ${
                  isActive
                    ? "border-secondary/50 bg-primary-container/60"
                    : "border-outline-variant/20 bg-surface-container-lowest/55 hover:border-secondary/30 hover:bg-surface-container"
                } ${disabled ? "opacity-60" : ""}`}
              >
                <span>
                  <span className="font-label text-[10px] font-bold uppercase tracking-[0.16em] text-secondary">
                    {sample.label}
                  </span>
                  <span className="mt-2 block text-sm leading-relaxed text-on-surface-variant">
                    {isRandom
                      ? samplesLoading
                        ? "Pulling a fresh phishing sample from the existing dataset..."
                        : "Load one random real phish example from the Kaggle-backed dataset."
                      : "Fill the input instantly with a curated scenario."}
                  </span>
                </span>
                <span className="font-label text-[9px] font-bold uppercase tracking-[0.14em] text-outline transition-colors group-hover:text-secondary">
                  {isRandom ? "Load" : isActive ? "Active" : "Fill"}
                </span>
              </button>
            );
          })}
        </div>
      </section>

      <section className="ghost-border animate-fade-up bg-surface-container-low p-6" style={{ animationDelay: "180ms" }}>
        <p className="font-label text-[10px] font-bold uppercase tracking-[0.18em] text-secondary">How It Works</p>
        <div className="mt-5 space-y-4">
          {steps.map((step, index) => (
            <div key={step} className="flex items-start gap-4">
              <span className="flex h-7 w-7 shrink-0 items-center justify-center bg-primary-container font-label text-[10px] font-bold text-secondary">
                {index + 1}
              </span>
              <p className="pt-1 text-sm leading-relaxed text-on-surface">{step}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="ghost-border animate-fade-up bg-primary-container/35 p-6" style={{ animationDelay: "240ms" }}>
        <div className="flex items-start gap-4">
          <LockIcon className="mt-0.5 h-5 w-5 shrink-0 text-secondary" />
          <div className="space-y-2">
            <p className="font-label text-[10px] font-bold uppercase tracking-[0.18em] text-secondary">
              Privacy Reassurance
            </p>
            <p className="text-sm leading-relaxed text-on-surface">
              {privacyMode
                ? "Nothing is stored. Privacy Mode redacts sensitive details for analysis and keeps raw text out of the returned result when possible."
                : "Nothing is stored. Your scan is handled ephemerally for review during this session."}
            </p>
          </div>
        </div>
      </section>
    </div>
  );
}
