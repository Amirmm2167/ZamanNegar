import { useMutation } from "@tanstack/react-query";
import api from "@/lib/api";

type EventType = "LOGIN" | "VIEW_CHANGE" | "CREATE_EVENT" | "DRAG_DROP" | "ERROR" | "EXPORT";

interface LogPayload {
  event_type: EventType;
  details?: string;
}

export function useAnalytics() {
  const mutation = useMutation({
    mutationFn: (payload: LogPayload) => api.post("/analytics/log", payload),
    onError: (err) => {
      console.warn("Failed to log analytics:", err); // Fail silently
    },
  });

  const logEvent = (event_type: EventType, details?: string) => {
    mutation.mutate({ event_type, details });
  };

  return { logEvent };
}