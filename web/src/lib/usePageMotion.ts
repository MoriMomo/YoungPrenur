"use client";

import { useEffect, useRef, type RefObject } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

let scrollPluginRegistered = false;

export interface PageMotionOptions {
  /** Re-runs entrance transitions when this primitive key changes. */
  triggerKey?: string | number;
  /** CSS selector scoped to `scopeRef` for mount/update reveals. */
  selector?: string;
  /** Vertical offset in pixels for reveal entrance. */
  y?: number;
  /** Delay step in seconds between revealed elements. */
  stagger?: number;
  /** Enables ScrollTrigger reveals for `[data-gsap="scroll"]` sections. */
  scroll?: boolean;
  /** Skips running the scoped reveal on initial mount (triggers only on key changes). */
  skipInitial?: boolean;
}

/**
 * Coordinates reduced-motion-safe GSAP entrance and scroll reveals within a page or panel container.
 */
export function usePageMotion(
  scopeRef: RefObject<HTMLElement | null>,
  options: PageMotionOptions = {}
): void {
  const {
    triggerKey,
    selector = '[data-gsap="reveal"]',
    y = 10,
    stagger = 0.045,
    scroll = false,
    skipInitial = false,
  } = options;

  const prevTriggerRef = useRef<string | number | undefined>(triggerKey);

  useEffect(() => {
    if (skipInitial && prevTriggerRef.current === triggerKey) {
      return;
    }
    prevTriggerRef.current = triggerKey;

    const root = scopeRef.current;
    if (!root) return;

    if (scroll && !scrollPluginRegistered) {
      gsap.registerPlugin(ScrollTrigger);
      scrollPluginRegistered = true;
    }

    const mm = gsap.matchMedia(root);

    mm.add("(prefers-reduced-motion: no-preference)", () => {
      const revealEls = root.querySelectorAll<HTMLElement>(selector);
      if (revealEls.length > 0) {
        gsap.fromTo(
          revealEls,
          { y, opacity: 0.72 },
          {
            y: 0,
            opacity: 1,
            duration: 0.34,
            stagger,
            ease: "power2.out",
            clearProps: "transform,opacity",
          }
        );
      }

      if (scroll) {
        const scrollSections = root.querySelectorAll<HTMLElement>('[data-gsap="scroll"]');
        scrollSections.forEach((el) => {
          const items = el.querySelectorAll<HTMLElement>('[data-gsap="scroll-item"]');
          const targets = items.length > 0 ? items : el;
          gsap.fromTo(
            targets,
            { y: 14, opacity: 0.75 },
            {
              y: 0,
              opacity: 1,
              duration: 0.38,
              stagger: items.length > 0 ? stagger : 0,
              ease: "power2.out",
              immediateRender: false,
              clearProps: "transform,opacity",
              scrollTrigger: {
                trigger: el,
                start: "top 88%",
                once: true,
              },
            }
          );
        });
      }
    });

    return () => {
      mm.revert();
    };
  }, [scopeRef, triggerKey, selector, y, stagger, scroll, skipInitial]);
}
