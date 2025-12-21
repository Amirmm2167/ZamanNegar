"use client";

import { useEffect } from "react";

export default function ServiceWorkerRegister() {
  useEffect(() => {
    if ("serviceWorker" in navigator && process.env.NODE_ENV === "production") {
      // Only register in production to avoid interfering with dev hot-reload
      // Or remove the check if you want to test offline mode in dev
      navigator.serviceWorker
        .register("/sw.js")
        .then((registration) => {
          console.log("SW Registered:", registration.scope);
        })
        .catch((err) => {
          console.error("SW Registration Failed:", err);
        });
    }
  }, []);

  return null;
}