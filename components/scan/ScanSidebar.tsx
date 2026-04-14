"use client";

import Link from "next/link";
import { useEffect, useState, type ComponentType } from "react";

import { ChatIcon, PhoneCallIcon } from "@/components/home/icons";

function LinkScanIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" className={className}>
      <path d="M10.5 13.5 13.5 10.5" />
      <path d="M7.8 15.8 5.5 18a3 3 0 0 1-4.2-4.2l2.3-2.3a3 3 0 0 1 4.2 0" />
      <path d="m16.2 8.2 2.3-2.2a3 3 0 1 1 4.2 4.2L20.4 12a3 3 0 0 1-4.2 0" />
    </svg>
  );
}

function ScreenshotIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" className={className}>
      <path d="M4.5 4.5h6v2h-4v4h-2Z" />
      <path d="M19.5 4.5v6h-2v-4h-4v-2Z" />
      <path d="M4.5 19.5v-6h2v4h4v2Z" />
      <path d="M19.5 19.5h-6v-2h4v-4h2Z" />
    </svg>
  );
}

function CubeIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" className={className}>
      <path d="m12 3 7 4v10l-7 4-7-4V7l7-4Z" />
      <path d="m12 12 7-4" />
      <path d="m12 12-7-4" />
      <path d="M12 12v9" />
    </svg>
  );
}

function DocumentIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" className={className}>
      <path d="M7 3.5h7l4 4V20.5H7Z" />
      <path d="M14 3.5v4h4" />
      <path d="M9.5 13.5h5" />
      <path d="M9.5 17h5" />
    </svg>
  );
}

type ActiveScanItem = "message" | "url" | "screenshot" | "document" | "voice" | "ar";

type SidebarItem = {
  key: ActiveScanItem;
  label: string;
  icon: ComponentType<{ className?: string }>;
  href: string;
  soon?: boolean;
};

const items: SidebarItem[] = [
  { key: "message", label: "Message Scan", icon: ChatIcon, href: "/scan" },
  { key: "url", label: "URL Scan", icon: LinkScanIcon, href: "/scan/url" },
  { key: "screenshot", label: "Screenshot Scan", icon: ScreenshotIcon, href: "/scan/screenshot" },
  { key: "document", label: "Document Scan", icon: DocumentIcon, href: "/scan/document" },
  { key: "voice", label: "Call Guard", icon: PhoneCallIcon, href: "/scan/voice" },
  { key: "ar", label: "AR Scanner", icon: CubeIcon, href: "/scan?view=ar", soon: true }
];

export function ScanSidebar({ activeItem = "message" }: { activeItem?: ActiveScanItem }) {
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    if (!mobileOpen || typeof document === "undefined") {
      return;
    }

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [mobileOpen]);

  return (
    <>
      <div className="sticky top-[73px] z-30 col-span-12 border-b border-outline-variant/15 bg-primary-container/92 pb-3 pt-1 backdrop-blur-xl xl:hidden">
        <div className="flex items-center justify-between gap-4">
          <div>
            <span className="font-label text-[10px] font-bold uppercase tracking-[0.2em] text-on-primary-container">
              Scanner Suite
            </span>
            <p className="mt-2 text-sm text-on-surface-variant">
              {items.find((item) => item.key === activeItem)?.label ?? "Message Scan"}
            </p>
          </div>

          <button
            type="button"
            aria-label="Open scan menu"
            aria-expanded={mobileOpen}
            onClick={() => setMobileOpen((open) => !open)}
            className="group flex h-12 w-12 items-center justify-center border border-outline-variant/30 bg-surface-container-lowest/70 text-on-surface transition-all duration-300 hover:border-secondary/40 hover:bg-surface-container-low"
          >
            <span className="flex w-5 flex-col gap-1.5">
              <span className={`h-px w-full bg-current transition-transform duration-300 ${mobileOpen ? "translate-y-2 rotate-45" : ""}`} />
              <span className={`h-px w-full bg-current transition-opacity duration-300 ${mobileOpen ? "opacity-0" : "opacity-100"}`} />
              <span className={`h-px w-full bg-current transition-transform duration-300 ${mobileOpen ? "-translate-y-2 -rotate-45" : ""}`} />
            </span>
          </button>
        </div>
      </div>

      <div
        className={`fixed inset-0 z-40 xl:hidden ${mobileOpen ? "pointer-events-auto" : "pointer-events-none"}`}
        aria-hidden={!mobileOpen}
      >
        <button
          type="button"
          aria-label="Close scan menu"
          className={`absolute inset-0 bg-black/55 transition-opacity duration-300 ${mobileOpen ? "opacity-100" : "opacity-0"}`}
          onClick={() => setMobileOpen(false)}
        />

        <aside
          className={`absolute left-0 top-[73px] h-[calc(100dvh-73px)] w-[min(84vw,20rem)] border-r border-outline-variant/20 bg-primary-container/96 px-4 py-6 shadow-2xl backdrop-blur-xl transition-transform duration-300 ${
            mobileOpen ? "translate-x-0" : "-translate-x-full"
          }`}
        >
          <div className="mb-6 flex items-center justify-between">
            <span className="font-label text-[10px] font-bold uppercase tracking-[0.2em] text-on-primary-container">
              Scanner Suite
            </span>
            <button
              type="button"
              onClick={() => setMobileOpen(false)}
              className="font-label text-[10px] font-bold uppercase tracking-[0.16em] text-secondary"
            >
              Close
            </button>
          </div>

          <nav className="space-y-2">
            {items.map((item) => {
              const Icon = item.icon;
              const active = item.key === activeItem;
              return (
                <Link
                  key={item.label}
                  href={item.href}
                  onClick={() => setMobileOpen(false)}
                  className={`group relative flex items-center justify-between overflow-hidden px-4 py-3 transition-all duration-300 ${
                    active
                      ? "bg-surface-container text-secondary shadow-atmospheric"
                      : "text-on-surface-variant hover:bg-surface-container-low hover:text-on-surface"
                  }`}
                >
                  <span
                    className={`absolute inset-y-0 right-0 w-[2px] origin-top transition-transform duration-300 ${
                      active ? "scale-y-100 bg-secondary" : "scale-y-0 bg-secondary group-hover:scale-y-100"
                    }`}
                  />
                  <span className="flex items-center space-x-3">
                    <Icon className={`h-5 w-5 transition-colors ${active ? "text-secondary" : "group-hover:text-secondary"}`} />
                    <span className="font-label text-[11px] font-bold uppercase tracking-wider">{item.label}</span>
                  </span>
                  {item.soon && !active ? (
                    <span className="font-label text-[8px] font-bold uppercase tracking-[0.18em] text-outline transition-colors group-hover:text-secondary">
                      Soon
                    </span>
                  ) : null}
                </Link>
              );
            })}
          </nav>
        </aside>
      </div>

      <nav className="hidden space-y-2 pt-4 xl:block xl:col-span-2">
        <div className="mb-8">
          <span className="font-label text-[10px] font-bold uppercase tracking-[0.2em] text-on-primary-container">
            Scanner Suite
          </span>
        </div>

        {items.map((item, index) => {
          const Icon = item.icon;
          const active = item.key === activeItem;
          return (
            <Link
              key={item.label}
              href={item.href}
              className={`group relative flex items-center justify-between overflow-hidden px-4 py-3 transition-all duration-300 ${
                active
                  ? "bg-surface-container text-secondary shadow-atmospheric"
                  : "text-on-surface-variant hover:bg-surface-container-low hover:text-on-surface"
              } ${active ? "animate-fade-up" : ""}`}
              style={active ? { animationDelay: `${index * 60}ms` } : undefined}
            >
              <span
                className={`absolute inset-y-0 right-0 w-[2px] origin-top transition-transform duration-300 ${
                  active ? "scale-y-100 bg-secondary" : "scale-y-0 bg-secondary group-hover:scale-y-100"
                }`}
              />
              <span className="flex items-center space-x-3">
                <Icon className={`h-5 w-5 transition-colors ${active ? "text-secondary" : "group-hover:text-secondary"}`} />
                <span className="font-label text-[11px] font-bold uppercase tracking-wider">{item.label}</span>
              </span>
              {item.soon && !active ? (
                <span className="font-label text-[8px] font-bold uppercase tracking-[0.18em] text-outline transition-colors group-hover:text-secondary">
                  Soon
                </span>
              ) : null}
            </Link>
          );
        })}
      </nav>
    </>
  );
}
