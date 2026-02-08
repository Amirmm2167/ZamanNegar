"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuthStore } from "@/stores/authStore";
import { Loader2 } from "lucide-react";

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const { user, isHydrated, isSynced } = useAuthStore();
  const [isAuthorized, setIsAuthorized] = useState(false);

  useEffect(() => {
    // Wait for AppShell to finish its work
    if (!isHydrated || !isSynced) return;

    if (user && user.is_superadmin) {
      setIsAuthorized(true);
    } else {
      // If not admin, kick them out
      router.replace("/");
    }
  }, [user, isHydrated, isSynced, router]);

  if (!isAuthorized) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-[#020205] text-blue-500">
        <Loader2 className="animate-spin mb-4" size={32} />
      </div>
    );
  }

  return <>{children}</>;
}