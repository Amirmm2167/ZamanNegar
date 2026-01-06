import { useMutation } from "@tanstack/react-query";
import api from "@/lib/api";
import { useEffect } from "react";
import { onCLS, onINP, onLCP } from 'web-vitals';

type EventType = "PERFORMANCE" | "ERROR" | "PWA_ACTION" | "VIEW";

export function useAnalytics() {
  const mutation = useMutation({
    mutationFn: (payload: { event_type: EventType; details: any }) => 
      api.post("/analytics/log", { 
        event_type: payload.event_type, 
        details: JSON.stringify(payload.details) 
      }),
  });

  // 1. Auto-track Web Vitals (Performance)
  useEffect(() => {
    onCLS((metric) => mutation.mutate({ event_type: "PERFORMANCE", details: metric }));
    onINP((metric) => mutation.mutate({ event_type: "PERFORMANCE", details: metric }));
    onLCP((metric) => mutation.mutate({ event_type: "PERFORMANCE", details: metric }));
  }, []);

  // 2. Auto-track Crashes (Errors)
  useEffect(() => {
    const handleError = (event: ErrorEvent) => {
      mutation.mutate({ 
        event_type: "ERROR", 
        details: { message: event.message, filename: event.filename, lineno: event.lineno } 
      });
    };
    window.addEventListener("error", handleError);
    return () => window.removeEventListener("error", handleError);
  }, []);

  // 3. Auto-track PWA Install
  useEffect(() => {
    window.addEventListener("appinstalled", () => {
      mutation.mutate({ event_type: "PWA_ACTION", details: "INSTALLED" });
    });
  }, []);

  return { logEvent: (type: EventType, data: any) => mutation.mutate({ event_type: type, details: data }) };
}