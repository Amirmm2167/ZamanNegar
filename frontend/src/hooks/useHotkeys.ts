"use client";

import { useEffect } from "react";
import { useLayoutStore } from "@/stores/layoutStore";
import { addJalaliDays } from "@/lib/jalali";

export function useHotkeys() {
  const { 
    viewMode, 
    setViewMode, 
    currentDate, 
    setCurrentDate, 
    jumpToToday 
  } = useLayoutStore();

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      // Check if user is typing in an input field
      const isInput = ['INPUT', 'TEXTAREA'].includes(target.tagName) || target.isContentEditable;

      // --- 1. ESCAPE (Global Priority) ---
      if (e.key === 'Escape') {
        e.preventDefault();
        
        // Remove Focus from anything (Search, Buttons, Inputs)
        if (target && typeof target.blur === 'function') {
          target.blur();
        }

        // Close Modals (Dispatch Global Signal)
        window.dispatchEvent(new Event('close-modals'));
        return;
      }

      // If typing in an input, ignore other hotkeys
      if (isInput) return;

      switch (e.key.toLowerCase()) {
        // --- View Switching ---
        case 't':
          e.preventDefault();
          jumpToToday();
          break;
        case 'w':
          setViewMode('week');
          break;
        case 'm':
          setViewMode('month');
          break;
        case 'd':
          setViewMode('agenda');
          break;
        case 'y':
          setViewMode('year');
          break;

        // --- Navigation (Ctrl + Arrows) ---
        case 'arrowright': 
          if (e.ctrlKey) {
             e.preventDefault();
             const days = viewMode === 'week' ? 7 : 1;
             setCurrentDate(addJalaliDays(currentDate, days));
          }
          break;

        case 'arrowleft': 
          if (e.ctrlKey) {
             e.preventDefault();
             const days = viewMode === 'week' ? -7 : -1;
             setCurrentDate(addJalaliDays(currentDate, days));
          }
          break;

        // --- Actions ---
        case ' ': // Space Bar
          e.preventDefault();
          // Only open if NO modals are currently open
          if (!document.querySelector('[role="dialog"]')) {
             window.dispatchEvent(new Event('open-new-event'));
          }
          break;

        case 'k':
          if (e.ctrlKey || e.metaKey) {
             e.preventDefault();
             // FIX: Cast to HTMLElement to allow .focus()
             const input = document.querySelector('input[type="text"]') as HTMLElement;
             input?.focus();
          }
          break;
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [viewMode, currentDate, setViewMode, setCurrentDate, jumpToToday]);
}