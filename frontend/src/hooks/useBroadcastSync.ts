import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export function useBroadcastSync() {
  const router = useRouter();

  useEffect(() => {
    // Connect to a channel named 'app_sync'
    const channel = new BroadcastChannel('app_sync');

    // When a message is received, refresh data
    channel.onmessage = (event) => {
      if (event.data === 'REFRESH_DATA') {
        console.log("Received sync signal from another tab. Refreshing...");
        // Trigger a re-fetch or router refresh
        router.refresh(); 
        // OR call your global fetchData() if available in context
      }
    };

    return () => channel.close();
  }, [router]);
}