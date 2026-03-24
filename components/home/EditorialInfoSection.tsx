import { ArrowRightIcon } from "@/components/home/icons";
import { ScrollReveal } from "@/components/home/ScrollReveal";

export function EditorialInfoSection() {
  return (
    <section id="philosophy" className="home-panel overflow-hidden bg-vellum px-8 py-28 md:px-16 lg:min-h-[100svh] lg:px-24 lg:py-24">
      <div className="mx-auto grid max-w-7xl items-center gap-24 lg:grid-cols-2">
        <ScrollReveal className="relative order-2 lg:order-1" delayMs={80}>
          <div className="ghost-border relative aspect-[4/5] overflow-hidden bg-surface-container">
            <img
              src="https://lh3.googleusercontent.com/aida-public/AB6AXuBLNuUwfOEHDT24KCjBy9JTMStr3RIGeIVnpgZ2Ir0d4A5_zp9-BFJFweI5Bja-5pt_wjW1PjQMz6v3dZbwZTO67Cw2K9CyyWgm9KRFq5ONlQUY-pj9CRDd037FIaWLbtVS2bUMC579riDH_GrYA3vJorShen-qAFOnPL8fCwj05DDAo6Tc7IL9OnkL6FS7Kv1eYDU_QhgiiGuyhW4TOszz2sEMswcGPleS4aQ2QqgTugvGlsJGY5rO6-S7kX-izIXZiHieBRGCcXw"
              alt="A refined workspace scene reflecting a calm and premium cyber safety experience."
              className="h-full w-full object-cover grayscale brightness-75 transition-all duration-700 hover:grayscale-0"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-[#0a192f]/40 to-transparent" />
          </div>

          <div className="absolute -bottom-8 -right-8 hidden bg-secondary p-8 md:block">
            <p className="font-headline text-2xl font-bold tracking-tight text-on-secondary">Sovereign Protection</p>
          </div>
        </ScrollReveal>

        <ScrollReveal className="order-1 space-y-12 lg:order-2" delayMs={180}>
          <div className="space-y-6">
            <p className="font-label text-[10px] font-bold uppercase tracking-[0.2em] text-primary-container">
              The Human Philosophy
            </p>
            <h2 className="font-headline text-5xl font-extrabold leading-tight tracking-editorial text-ink md:text-6xl">
              Built for individuals who value their peace of mind.
            </h2>
          </div>

          <div className="space-y-8 text-xl font-light leading-relaxed text-surface-variant">
            <p>
              CyberCoach was engineered for people who demand discretion and clarity. The complexity of
              cybersecurity is removed so the judgment feels calm, immediate, and usable.
            </p>
            <p>
              It acts like a digital concierge, reviewing suspicious interactions with the restraint of an
              intelligence service and the composure of an editorial product.
            </p>
          </div>

          <div className="pt-4">
            <a
              href="#support"
              className="group inline-flex items-center gap-4 font-label text-xs font-bold uppercase tracking-[0.18em] text-ink"
            >
              Explore the Methodology
              <ArrowRightIcon className="h-4 w-4 transition-transform group-hover:translate-x-1.5" />
            </a>
          </div>
        </ScrollReveal>
      </div>
    </section>
  );
}
