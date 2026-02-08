"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuthStore } from "@/stores/authStore";
import AdminSidebar from "@/components/admin/AdminSidebar";
import ModernBackground from "@/components/ui/ModernBackground";
import { Loader2, ShieldAlert } from "lucide-react";

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const { user, isAuthenticated } = useAuthStore();
  const [isAuthorized, setIsAuthorized] = useState(false);

  useEffect(() => {
    // 1. Check Login
    if (!isAuthenticated()) {
      router.push("/login");
      return;
    }

    // 2. Check Superadmin Status
    // Note: In a real app, strict checks happen on Backend. 
    // This is a UI redirect for UX.
    if (user && user.is_superadmin) {
      setIsAuthorized(true);
    } else {
      // Not an admin? Redirect to dashboard
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
    <div className="flex min-h-screen w-full bg-[#020205] text-gray-100 font-sans" dir="rtl">
      <div className="fixed inset-0 z-0 pointer-events-none opacity-50">
         <ModernBackground />
      </div>

      {/* Admin Sidebar */}
      <AdminSidebar />

      {/* Main Admin Content */}
      <main className="flex-1 relative z-10 transition-all duration-300 mr-[240px] p-8">
        {children}
      </main>
    </div>
  );
}