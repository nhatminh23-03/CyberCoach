import { HomeStatusCard } from "@/components/home/HomeStatusCard";
import { QuickScanBar } from "@/components/home/QuickScanBar";
import { ScrollReveal } from "@/components/home/ScrollReveal";

export function HeroSection() {
  return (
    <section
      id="top"
      className="home-panel relative overflow-hidden bg-primary-container px-4 pb-16 pt-16 sm:px-8 sm:pb-20 sm:pt-20 md:px-16 md:pt-22 lg:min-h-[100svh] lg:px-24"
    >
      <div className="hero-grid-overlay" />
      <div className="ambient-orb left-[-10%] top-[18%] h-80 w-80 bg-secondary/10" />
      <div className="ambient-orb right-[-4%] top-[42%] h-[28rem] w-[28rem] bg-primary/10 [animation-delay:1.6s]" />

      <div className="mx-auto grid max-w-7xl items-start gap-10 sm:gap-12 lg:min-h-[calc(100svh-7rem)] lg:grid-cols-12 lg:items-center lg:gap-16">
        <ScrollReveal className="space-y-8 sm:space-y-10 lg:col-span-8" delayMs={40}>
          <div className="space-y-8 sm:space-y-10">
            <span className="inline-block border border-secondary/30 bg-secondary/10 px-4 py-1 font-label text-[10px] font-bold uppercase tracking-[0.2em] text-secondary">
              Everyday Scam Check
            </span>

            <h1 className="max-w-4xl font-headline text-4xl font-extrabold leading-[0.95] tracking-editorial text-vellum sm:text-5xl md:text-6xl lg:text-[4.35rem]">
              Check suspicious messages, links, screenshots, documents, and calls before you act.
            </h1>

            <QuickScanBar />
          </div>
        </ScrollReveal>

        <ScrollReveal className="w-full lg:col-span-4 lg:flex lg:justify-end" delayMs={180}>
          <HomeStatusCard />
        </ScrollReveal>
      </div>

      <div className="absolute bottom-8 left-1/2 hidden -translate-x-1/2 lg:block">
        <a href="#detection" className="editorial-link inline-flex items-center gap-3 text-on-surface-variant transition-colors hover:text-secondary">
          <span className="h-px w-10 bg-outline-variant/70" />
          Scroll to Continue
        </a>
      </div>

      <div className="absolute -bottom-24 -right-24 h-96 w-96 bg-secondary/5 blur-[120px]" />
      <div className="absolute inset-x-0 bottom-0 h-24 bg-gradient-to-b from-transparent to-surface" />
    </section>
  );
}
