"use client";

import { QueryClient } from '@tanstack/react-query';
import { PersistQueryClientProvider } from '@tanstack/react-query-persist-client';
import { createSyncStoragePersister } from '@tanstack/query-sync-storage-persister';
import { useState, useEffect } from 'react';

export default function Providers({ children }: { children: React.ReactNode }) {
  // Create a client that holds the cache
  const [queryClient] = useState(() => new QueryClient({
    defaultOptions: {
      queries: {
        gcTime: 1000 * 60 * 60 * 24, // Keep unused data for 24 hours
        staleTime: 1000 * 60 * 5,    // Data is "fresh" for 5 minutes
        retry: 1,
        refetchOnWindowFocus: false, // Prevent jarring refetches on mobile switching
      },
    },
  }));

  // Create a persister interface for localStorage
  const [persister, setPersister] = useState<any>(null);

  useEffect(() => {
    // Only run on client side
    if (typeof window !== 'undefined') {
      const localStoragePersister = createSyncStoragePersister({
        storage: window.localStorage,
        // Optional: Throttle saves to prevent performance hits
        throttleTime: 1000, 
      });
      setPersister(localStoragePersister);
    }
  }, []);

  // While persister is initializing, render children without persistence 
  // (or a loader, but children is safer for LCP)
  if (!persister) {
      return <>{children}</>;
  }

  return (
    <PersistQueryClientProvider
      client={queryClient}
      persistOptions={{ persister }}
    >
      {children}
    </PersistQueryClientProvider>
  );
}