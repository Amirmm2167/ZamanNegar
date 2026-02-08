"use client";

import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useLayoutStore } from "@/stores/layoutStore";
import { useAuthStore } from "@/stores/authStore";
import FloatingIsland from "./FloatingIsland";
import ContextRail from "./ContextRail";
import Sidebar from "./Sidebar";
import ModernBackground from "@/components/ui/ModernBackground";
import EventModal from "@/components/EventModal";
import IssueModal from "@/components/IssueModal";
import { Loader2 } from "lucide-react";

interface AppShellProps {
  children: React.ReactNode;
}

export default function AppShell({ children }: AppShellProps) {
  const router = useRouter();
  const pathname = usePathname();
  
  const { setIsMobile, isMobile, isSidebarOpen } = useLayoutStore();
  const { user, currentRole, isAuthenticated } = useAuthStore();
  
  const role = currentRole();
  const isAuthPage = pathname === "/login" || pathname === "/register";
  // 1. DETECT ADMIN PAGE
  const isAdminPage = pathname?.startsWith("/admin");
  
  const [showEventModal, setShowEventModal] = useState(false);
  const [showIssueModal, setShowIssueModal] = useState(false);
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
    const checkMobile = () => setIsMobile(window.innerWidth < 768);
    checkMobile();
    window.addEventListener("resize", checkMobile);
    return () => window.removeEventListener("resize", checkMobile);
  }, [setIsMobile]);

  useEffect(() => {
    if (isClient && !isAuthenticated() && !isAuthPage) {
      router.push('/login');
    }
  }, [isClient, isAuthenticated, isAuthPage, router]);

  if (!isClient) return null;

  if (!isAuthenticated() && !isAuthPage) {
     return (
        <div className="h-screen w-full flex items-center justify-center bg-[#000000] text-blue-500">
           <Loader2 className="animate-spin" size={32} />
        </div>
     );
  }

  return (
    <div className="relative min-h-screen w-full overflow-hidden flex flex-col md:flex-row" dir="rtl">
      
      <div className="fixed inset-0 z-0 pointer-events-none">
         <ModernBackground />
      </div>

      {/* 2. HIDE USER SIDEBAR ON ADMIN PAGES */}
      {!isAuthPage && !isAdminPage && <Sidebar />}

      {/* 3. HIDE CONTEXT RAIL ON ADMIN PAGES */}
      {!isMobile && !isAuthPage && !isAdminPage && <ContextRail />}

      {/* Main Content Area */}
      <main 
        className={`
          relative z-10 flex-1 transition-all duration-300 ease-[cubic-bezier(0.25,1,0.5,1)]
          flex flex-col min-h-0
          ${isMobile && !isAuthPage ? 'pb-28' : ''} 
          /* Only apply margin if standard sidebar is present */
          ${!isMobile && !isAuthPage && !isAdminPage ? (isSidebarOpen ? 'mr-[240px]' : 'mr-[80px]') : ''}
        `}
      >
        {children}
      </main>

      {/* 4. HIDE MOBILE MENU ON ADMIN PAGES */}
      {!isAuthPage && !isAdminPage && isMobile && (
        <FloatingIsland 
           role={role || 'viewer'} 
           onOpenIssue={() => setShowIssueModal(true)}
           onOpenEvent={() => setShowEventModal(true)}
        />
      )}

      {/* Global Modals (Keep these available everywhere) */}
      <EventModal 
        isOpen={showEventModal} 
        onClose={() => setShowEventModal(false)}
        onSuccess={() => setShowEventModal(false)}
        currentUserId={user?.id || 0}
      />

      <IssueModal 
        isOpen={showIssueModal} 
        onClose={() => setShowIssueModal(false)}
        onSubmit={() => setShowIssueModal(false)}
      />
    </div>
  );
}