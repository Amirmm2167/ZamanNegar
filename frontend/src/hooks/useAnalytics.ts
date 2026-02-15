import { useMutation } from "@tanstack/react-query";
import api from "@/lib/api";
import { useEffect } from "react";
import { onCLS, onINP, onLCP, Metric } from 'web-vitals'; 
import { useAuthStore } from "@/stores/authStore"; // Import Auth Store

type EventType = "PERFORMANCE" | "ERROR" | "PWA_ACTION" | "VIEW" | "ACTION" | "RAGE_CLICK" | "DEAD_CLICK";

export function useAnalytics() {
  const mutation = useMutation({
    mutationFn: async (payload: { event_type: EventType; details: any }) => {
      
      // --- FIX START: Check for Token ---
      // Do not send analytics if user is not logged in
      const token = useAuthStore.getState().token;
      if (!token) return null;
      // --- FIX END ---

      // FORCE STRINGIFICATION
      const detailsString = typeof payload.details === 'string' 
        ? payload.details 
        : JSON.stringify(payload.details);

      return api.post("/analytics/log", { 
        event_type: payload.event_type, 
        details: detailsString 
      });
    },
    onError: (err) => {
        // Optional: Suppress errors in console to keep it clean
        if (process.env.NODE_ENV === 'development') {
            console.error("Analytics Failed to Send:", err);
        }
    }
  });

  // 1. Auto-track Web Vitals
  useEffect(() => {
    if (typeof window !== 'undefined') {
        onCLS((metric: Metric) => mutation.mutate({ event_type: "PERFORMANCE", details: { name: metric.name, value: metric.value } }));
        onINP((metric: Metric) => mutation.mutate({ event_type: "PERFORMANCE", details: { name: metric.name, value: metric.value } }));
        onLCP((metric: Metric) => mutation.mutate({ event_type: "PERFORMANCE", details: { name: metric.name, value: metric.value } }));
    }
  }, []);

  // 2. Auto-track Crashes
  useEffect(() => {
    const handleError = (event: ErrorEvent) => {
      mutation.mutate({ 
        event_type: "ERROR", 
        details: { message: event.message, filename: event.filename, lineno: event.lineno } 
      });
    };
    
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