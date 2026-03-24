import { GlobeIcon, LockIcon, ShieldCheckIcon } from "@/components/home/icons";

const footerColumns = [
  {
    title: "Resources",
    links: []
    // links: ["Methodology", "Threat Intelligence", "Case Studies", "Verification Logic"]
  },
  {
    title: "Network Nodes",
    links: []
    // links: ["Primary Core", "Sovereign Relay", "Edge Validation", "API Gateway"]
  },
  {
    title: "Institutional",
    links: []

    // links: ["Privacy Policy", "Terms of Service", "Compliance", "Legal Repository"]
  }
];

export function Footer() {
  return (
    <footer id="support" className="bg-primary-container px-4 pb-12 pt-20 sm:px-6 lg:px-12 lg:pt-24">
      <div className="mx-auto mb-16 grid max-w-7xl gap-12 md:grid-cols-4 lg:mb-24 lg:gap-16">
        <div className="col-span-1 space-y-8">
          <div className="font-headline text-xl font-bold text-vellum">CyberCoach</div>
          <p className="text-sm font-light leading-relaxed text-primary">
            The sovereign standard in digital verification and executive cyber safety guidance.
          </p>
          <div className="inline-flex items-center gap-3 border border-outline-variant/30 bg-surface-container-lowest/20 px-4 py-2">
            <LockIcon className="h-4 w-4 text-secondary" />
            <span className="font-label text-[9px] font-bold uppercase tracking-[0.16em] text-vellum">
              Enterprise Standard Encryption
            </span>
          </div>
        </div>

        {footerColumns.map((column) => (
          <div key={column.title} className="space-y-8">
            <h5 className="font-label text-[10px] font-bold uppercase tracking-[0.1em] text-secondary">
              {column.title}
            </h5>
            <ul className="space-y-4">
              {column.links.map((link) => (
                <li key={link}>
                  <a href="#" className="text-sm text-primary transition-colors hover:text-secondary">
                    {link}
                  </a>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>

      <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-6 border-t border-outline-variant/10 pt-10 text-center md:flex-row md:text-left">
        <p className="font-label text-[10px] font-bold uppercase tracking-[0.16em] text-outline">
          © 2026 CyberCoach Sovereign Editorial. All Rights Reserved.
        </p>
        <div className="flex gap-8 text-outline">
          <GlobeIcon className="h-5 w-5 transition-colors hover:text-secondary" />
          <ShieldCheckIcon className="h-5 w-5 transition-colors hover:text-secondary" />
          <LockIcon className="h-5 w-5 transition-colors hover:text-secondary" />
        </div>
      </div>
    </footer>
  );
}
