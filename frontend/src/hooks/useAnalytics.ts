import { useMutation } from "@tanstack/react-query";
import api from "@/lib/api";
import { useEffect } from "react";
import { onCLS, onINP, onLCP, Metric } from 'web-vitals'; 

type EventType = "PERFORMANCE" | "ERROR" | "PWA_ACTION" | "VIEW" | "ACTION";

export function useAnalytics() {
  const mutation = useMutation({
    mutationFn: (payload: { event_type: EventType; details: any }) => 
      api.post("/analytics/log", { 
        event_type: payload.event_type, 
        details: typeof payload.details === 'string' ? payload.details : JSON.stringify(payload.details) 
      }),
  });

  // 1. Auto-track Web Vitals (Performance)
  useEffect(() => {
    // Only run in browser
    if (typeof window !== 'undefined') {
        onCLS((metric: Metric) => mutation.mutate({ event_type: "PERFORMANCE", details: { name: metric.name, value: metric.value } }));
        onINP((metric: Metric) => mutation.mutate({ event_type: "PERFORMANCE", details: { name: metric.name, value: metric.value } }));
        onLCP((metric: Metric) => mutation.mutate({ event_type: "PERFORMANCE", details: { name: metric.name, value: metric.value } }));
    }
  }, []);

  // 2. Auto-track Crashes (Global Errors)
  useEffect(() => {
    const handleError = (event: ErrorEvent) => {
      mutation.mutate({ 
        event_type: "ERROR", 
        details: { message: event.message, filename: event.filename, lineno: event.lineno } 
      });
    };
    
    // Catch Promise Rejections (e.g. failed fetches)
    const handleRejection = (event: PromiseRejectionEvent) => {
        mutation.mutate({
            event_type: "ERROR",
            details: { message: "Unhandled Rejection", reason: String(event.reason) }
        });
    };

    window.addEventListener("error", handleError);
    window.addEventListener("unhandledrejection", handleRejection);
    
    return () => {
        window.removeEventListener("error", handleError);
        window.removeEventListener("unhandledrejection", handleRejection);
    };
  }, []);

  return { 
      logEvent: (type: EventType, data: any) => mutation.mutate({ event_type: type, details: data }) 
  };
}