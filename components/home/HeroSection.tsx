import { QuickScanBar } from "@/components/home/QuickScanBar";
import { ScrollReveal } from "@/components/home/ScrollReveal";
import { LockIcon, ShieldCheckIcon } from "@/components/home/icons";

export function HeroSection() {
  return (
    <section
      id="top"
      className="home-panel relative overflow-hidden bg-primary-container px-8 pb-20 pt-20 md:px-16 md:pt-22 lg:min-h-[100svh] lg:px-24"
    >
      <div className="hero-grid-overlay" />
      <div className="ambient-orb left-[-10%] top-[18%] h-80 w-80 bg-secondary/10" />
      <div className="ambient-orb right-[-4%] top-[42%] h-[28rem] w-[28rem] bg-primary/10 [animation-delay:1.6s]" />

      <div className="mx-auto grid min-h-[calc(100svh-7rem)] max-w-7xl items-center gap-16 lg:grid-cols-12">
        <ScrollReveal className="space-y-10 lg:col-span-8" delayMs={40}>
          <div className="space-y-10">
            <span className="inline-block border border-secondary/30 bg-secondary/10 px-4 py-1 font-label text-[10px] font-bold uppercase tracking-[0.2em] text-secondary">
              Advanced Cyber Defense
            </span>

            <h1 className="max-w-4xl font-headline text-5xl font-extrabold leading-[0.95] tracking-editorial text-vellum md:text-6xl lg:text-[4.35rem]">
              Check suspicious messages, links, screenshots, and documents before you act.
            </h1>

            <QuickScanBar />
          </div>
        </ScrollReveal>

        <ScrollReveal className="flex justify-end lg:col-span-4" delayMs={180}>
          <div className="glass-panel ghost-border relative w-full max-w-sm space-y-8 p-8 shadow-atmospheric transition-transform duration-500 hover:-translate-y-1">
            <div className="flex items-start justify-between">
              <div className="space-y-1">
                <p className="font-label text-[10px] font-bold uppercase tracking-[0.15em] text-secondary">
                  Real-time status
                </p>
                <p className="font-headline text-2xl font-bold tracking-tight text-vellum">ENCRYPTED</p>
              </div>
              <ShieldCheckIcon className="h-9 w-9 text-secondary" />
            </div>

            <div className="space-y-6 border-t border-outline-variant/30 pt-8">
              <div className="flex items-center gap-4">
                <div className="h-2 w-2 animate-pulse bg-secondary" />
                <span className="font-label text-xs font-semibold uppercase tracking-[0.14em] text-on-surface-variant">
                  Identity Shield Active
                </span>
              </div>

              <div className="space-y-2">
                <div className="h-1 w-full bg-surface-container-highest">
                  <div className="h-full w-2/3 bg-secondary" />
                </div>
                <div className="flex justify-between font-label text-[9px] uppercase tracking-[0.16em] text-outline">
                  <span>System Integrity</span>
                  <span>98.4% Secure</span>
                </div>
              </div>
            </div>

            <div className="ghost-border bg-primary-container/80 p-5">
              <div className="flex items-center gap-3">
                <LockIcon className="h-5 w-5 text-secondary" />
                <div>
                  <p className="font-label text-[9px] font-bold uppercase tracking-[0.16em] text-secondary">
                    Confidential Handling
                  </p>
                  <p className="mt-1 text-sm leading-relaxed text-on-surface-variant">
                    Every submission is prepared for secure review before deeper analysis begins.
                  </p>
                </div>
              </div>
            </div>
          </div>
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
