"use client";

import { useEffect, useRef, useState } from "react";

export function useHighlightOnFirstVisible({
  sessionKey,
  enabled
}: {
  sessionKey: string | null;
  enabled: boolean;
}) {
  const ref = useRef<HTMLElement | null>(null);
  const [phase, setPhase] = useState<"idle" | "active" | "settled">("idle");
  const hasPlayedRef = useRef(false);

  useEffect(() => {
    hasPlayedRef.current = false;
    setPhase("idle");
  }, [sessionKey]);

  useEffect(() => {
    if (!enabled || !sessionKey || typeof window === "undefined") {
      return;
    }

    const node = ref.current;
    if (!node || hasPlayedRef.current) {
      return;
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (!entry.isIntersecting || hasPlayedRef.current) {
          return;
        }

        hasPlayedRef.current = true;
        setPhase("active");
      },
      {
        threshold: 0.4,
        rootMargin: "-8% 0px -12% 0px"
      }
    );

    observer.observe(node);

    return () => {
      observer.disconnect();
    };
  }, [enabled, sessionKey]);

  useEffect(() => {
    if (phase !== "active" || typeof window === "undefined") {
      return;
    }

    const timeout = window.setTimeout(() => {
      setPhase("settled");
    }, 720);

    return () => {
      window.clearTimeout(timeout);
    };
  }, [phase]);

  const highlightClassName =
    phase === "active"
      ? "scan-card-settled scan-card-on-view"
      : phase === "settled"
        ? "scan-card-settled"
        : "";

  return {
    ref,
    activeClassName: highlightClassName
  };
}
