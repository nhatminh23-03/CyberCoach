export function Footer() {
  return (
    <footer id="support" className="bg-primary-container px-4 pb-8 pt-10 sm:px-6 sm:pb-10 sm:pt-14 lg:px-12 lg:pt-16">
      <div className="mx-auto max-w-7xl space-y-5">
        <div className="font-headline text-xl font-bold text-vellum">CyberCoach</div>
        <p className="max-w-md text-sm font-light leading-relaxed text-primary">
          Clear help for suspicious messages, links, files, and calls.
        </p>
      </div>

      <div className="mx-auto mt-8 flex max-w-7xl flex-col items-center justify-between gap-4 border-t border-outline-variant/10 pt-6 text-center sm:mt-10 sm:pt-8 md:flex-row md:text-left">
        <p className="font-label text-[10px] font-bold uppercase tracking-[0.16em] text-outline">
          © 2026 CyberCoach. All rights reserved.
        </p>
      </div>
    </footer>
  );
}
