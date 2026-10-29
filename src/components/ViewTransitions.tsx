"use client";

import { useEffect, useMemo } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useUnsavedGuard } from "@/components/UnsavedGuard";

// Longest the old screen stays frozen while the new one loads
const MAX_WAIT_MS = 500;

let pending: (() => void) | null = null;

function depth(path: string) {
  return path.split("/").filter(Boolean).length;
}

function sharedNames(root: ParentNode = document) {
  return Array.from(
    root.querySelectorAll<HTMLElement>('[style*="view-transition-name"]'),
    (el) => el.style.viewTransitionName,
  );
}

function canTransition() {
  return (
    typeof document.startViewTransition === "function" &&
    !window.matchMedia("(prefers-reduced-motion: reduce)").matches
  );
}

type Direction = "forward" | "back" | "fade";

/**
 * Shared elements to wait for: going back, whatever this page names (the
 * list it returns to has the same element); going forward, whatever the
 * tapped link contains.
 */
function run(direction: Direction, go: () => void, from?: Element) {
  if (!canTransition()) {
    go();
    return;
  }
  const names =
    direction === "back" ? sharedNames() : from ? sharedNames(from) : [];
  document.documentElement.dataset.nav = direction;
  const transition = document.startViewTransition(
    () =>
      new Promise<void>((resolve) => {
        const timeout = setTimeout(resolve, MAX_WAIT_MS);
        pending = () => {
          // Hold until a shared element exists on the new page, so it can
          // morph instead of fading into a loading skeleton
          const start = performance.now();
          (function check() {
            const ready =
              names.length === 0 ||
              sharedNames().some((n) => names.includes(n));
            if (ready || performance.now() - start > MAX_WAIT_MS) {
              clearTimeout(timeout);
              resolve();
            } else {
              setTimeout(check, 40);
            }
          })();
        };
        go();
      }),
  );
  transition.finished.finally(() => {
    delete document.documentElement.dataset.nav;
  });
}

export function transitionTo(
  href: string,
  push: (href: string) => void,
  from?: Element,
) {
  const target = new URL(href, window.location.href).pathname;
  const current = window.location.pathname;
  if (target === current) {
    push(href);
    return;
  }
  const d = depth(target) - depth(current);
  run(d > 0 ? "forward" : d < 0 ? "back" : "fade", () => push(href), from);
}

/** Router whose push/back animate with the View Transitions API */
export function useTransitionRouter() {
  const router = useRouter();
  return useMemo(
    () => ({
      push: (href: string) => transitionTo(href, router.push),
      back: () => run("back", router.back),
    }),
    [router],
  );
}

/** Resolves transitions on route change and animates plain link taps */
export function ViewTransitions() {
  const pathname = usePathname();
  const router = useRouter();
  const { hasUnsaved } = useUnsavedGuard();

  useEffect(() => {
    pending?.();
    pending = null;
  }, [pathname]);

  useEffect(() => {
    function onClick(e: MouseEvent) {
      if (
        hasUnsaved ||
        e.defaultPrevented ||
        e.button !== 0 ||
        e.metaKey ||
        e.ctrlKey ||
        e.shiftKey ||
        e.altKey
      )
        return;
      const link = (e.target as Element).closest("a");
      if (!link || link.target || link.hasAttribute("download")) return;
      const url = new URL(link.href, window.location.href);
      if (url.origin !== window.location.origin) return;
      if (url.pathname === window.location.pathname) return;
      e.preventDefault();
      transitionTo(url.pathname + url.search + url.hash, router.push, link);
    }
    document.addEventListener("click", onClick, true);
    return () => document.removeEventListener("click", onClick, true);
  }, [hasUnsaved, router]);

  return null;
}
