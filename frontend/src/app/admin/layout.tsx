"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuthStore } from "@/stores/authStore";
import ModernBackground from "@/components/ui/ModernBackground";
import { Loader2 } from "lucide-react";

// NOTE: We REMOVED AdminSidebar from here because page.tsx now handles it.
export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const { user, isAuthenticated } = useAuthStore();
  const [isAuthorized, setIsAuthorized] = useState(false);

  useEffect(() => {
    if (!isAuthenticated()) {
      router.push("/login");
      return;
    }
    if (user && user.is_superadmin) {
      setIsAuthorized(true);
    } else {
      router.push("/");
    }
  }, [user, isAuthenticated, router]);

  if (!isAuthorized) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-[#020205] text-blue-500">
        <Loader2 className="animate-spin mb-4" size={32} />
      </div>
    );
  }

  return (
    <div className="min-h-screen w-full bg-[#020205] text-gray-100 font-sans relative" dir="rtl">
      <div className="fixed inset-0 z-0 pointer-events-none opacity-50">
         <ModernBackground />
      </div>
      
      {/* We render children directly. 
         The 'AdminDashboard' component in page.tsx will provide the Sidebar 
         and the main content area layout.
      */}
      <div className="relative z-10 h-full">
        {children}
      </div>
    </div>
  );
}