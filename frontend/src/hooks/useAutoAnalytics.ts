"use client";

import { useEffect, useRef } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import { useAnalytics } from "./useAnalytics";
import { getRichContext } from "@/lib/contextEngine";

export function useAutoAnalytics() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { logEvent } = useAnalytics();
  
  // Track last route to calculate duration
  const lastRouteRef = useRef<{ path: string; time: number } | null>(null);
  
  // Track clicks for Rage Detection
  const clickHistory = useRef<{ target: EventTarget; time: number }[]>([]);

  // 1. Route Tracking (The Observer)
  useEffect(() => {
    const now = Date.now();
    const currentPath = pathname + (searchParams?.toString() ? `?${searchParams.toString()}` : "");

    // Log previous page duration
    if (lastRouteRef.current) {
        const duration = (now - lastRouteRef.current.time) / 1000;
        // Don't log if duration is tiny (e.g. redirect)
        if (duration > 0.5) {
             getRichContext().then(ctx => {
                logEvent("VIEW", {
                    path: lastRouteRef.current?.path,
                    duration_sec: duration,
                    next_path: currentPath,
                    context: ctx
                });
             });
        }
    }

    lastRouteRef.current = { path: currentPath, time: now };
  }, [pathname, searchParams]);

  // 2. Global Interaction Listener
  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
        const target = e.target as HTMLElement;
        const now = Date.now();

        // A. Rage Click Detection (3 clicks on same target in 1s)
        clickHistory.current.push({ target, time: now });
        // Keep only last 1 second
        clickHistory.current = clickHistory.current.filter(c => now - c.time < 1000);
        
        const clicksOnTarget = clickHistory.current.filter(c => c.target === target).length;
        if (clicksOnTarget === 3) {
            getRichContext().then(ctx => {
                logEvent("RAGE_CLICK", {
                    target_tag: target.tagName,
                    target_text: target.innerText?.slice(0, 50),
                    x: e.clientX, 
                    y: e.clientY,
                    context: ctx
                });
            });
        }

        // B. Smart Interaction Tracking (Buttons & Links)
        // Find closest clickable element
        const clickable = target.closest('button, a, [role="button"]');
        if (clickable) {
            const text = (clickable as HTMLElement).innerText || (clickable as HTMLElement).getAttribute('aria-label') || "Unknown";
            
            // Debounce standard clicks to avoid log spam? 
            // For now, we log meaningful actions.
            // We verify if it actually did something? Hard to tell generically.
            // But we can log the INTENT.
            
            getRichContext().then(ctx => {
                logEvent("ACTION", {
                    element: clickable.tagName,
                    label: text.slice(0, 50),
                    path: pathname,
                    context: ctx
                });
            });
        } else {
            // C. Dead Click Detection? 
            // If it looks clickable (cursor pointer) but isn't a button/link/input
            const style = window.getComputedStyle(target);
            if (style.cursor === 'pointer' && clicksOnTarget === 1) { // Log only once
                 getRichContext().then(ctx => {
                    logEvent("DEAD_CLICK", {
                        target_tag: target.tagName,
                        target_text: target.innerText?.slice(0, 50),
                        context: ctx
                    });
                });
            }
        }
    };

    window.addEventListener('click', handleClick, { capture: true });
    return () => window.removeEventListener('click', handleClick, { capture: true });
  }, [pathname]);
}