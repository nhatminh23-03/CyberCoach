import Link from "next/link";

type HeaderProps = {
  active?: "Home" | "Scans" | "Privacy" | "Support";
};

const navItems = [
  { label: "Home", href: "/" },
  { label: "Scans", href: "/scan" },
  // { label: "Privacy", href: "/#philosophy" },
  // { label: "Support", href: "/#support" }
] as const;

export function Header({ active = "Home" }: HeaderProps) {
  return (
    <header className="fixed inset-x-0 top-0 z-50">
      <nav className="mx-auto flex w-full max-w-full items-center justify-between border-b border-white/5 bg-primary-container/88 px-4 py-5 backdrop-blur-xl sm:px-6 md:px-12 lg:px-16">
        <Link href="/" className="font-headline text-xl font-black tracking-tight text-vellum">
          CyberCoach
        </Link>

        <div className="flex items-center gap-4 md:hidden">
          {navItems.map((item) => (
            <Link
              key={item.label}
              href={item.href}
              className={`font-label text-[10px] font-bold uppercase tracking-[0.14em] transition-colors ${
                active === item.label
                  ? "border-b-2 border-secondary pb-1 text-secondary"
                  : "text-primary hover:text-vellum"
              }`}
            >
              {item.label}
            </Link>
          ))}
        </div>

        <div className="hidden items-center gap-6 lg:gap-10 md:flex">
          {navItems.map((item) => (
            <Link
              key={item.label}
              href={item.href}
              className={`font-label text-[10px] font-bold uppercase tracking-[0.12em] transition-colors ${
                active === item.label
                  ? "border-b-2 border-secondary pb-1 text-secondary"
                  : "text-primary hover:text-vellum"
              }`}
            >
              {item.label}
            </Link>
          ))}
        </div>

        <div className="hud-label hidden lg:inline-flex">Private Guidance</div>
      </nav>
    </header>
  );
}
