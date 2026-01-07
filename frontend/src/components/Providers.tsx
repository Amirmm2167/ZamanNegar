"use client";

import { QueryClient } from '@tanstack/react-query';
import { PersistQueryClientProvider } from '@tanstack/react-query-persist-client';
import { createSyncStoragePersister } from '@tanstack/query-sync-storage-persister';
import { useState, useEffect } from 'react';
import { useAutoAnalytics } from '@/hooks/useAutoAnalytics'; // NEW

// Separate component to use hooks inside Provider
function AnalyticsActivator() {
    useAutoAnalytics();
    return null;
}

export default function Providers({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(() => new QueryClient({
    defaultOptions: {
      queries: {
        gcTime: 1000 * 60 * 60 * 24, 
        staleTime: 1000 * 60 * 5,    
        retry: 1,
        refetchOnWindowFocus: false, 
      },
    },
  }));

  const [persister, setPersister] = useState<any>(null);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const localStoragePersister = createSyncStoragePersister({
        storage: window.localStorage,
        throttleTime: 1000, 
      });
      setPersister(localStoragePersister);
    }
  }, []);

  if (!persister) {
      return <>{children}</>;
  }

  return (
    <PersistQueryClientProvider
      client={queryClient}
      persistOptions={{ persister }}
    >
      <AnalyticsActivator /> {/* Activate Sensors */}
      {children}
    </PersistQueryClientProvider>
  );
}