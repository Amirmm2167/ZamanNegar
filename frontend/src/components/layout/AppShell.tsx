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
  const { 
    user, 
    currentRole, 
    isAuthenticated,
    token,
    isHydrated, 
    isSynced, 
    fetchSession 
  } = useAuthStore();
  
  const role = currentRole();
  const isAuthPage = pathname === "/login" || pathname === "/register";
  const isAdminPage = pathname?.startsWith("/admin");
  
  // Flag: Are we logged in but waiting for server verification?
  const isRestoringSession = !!token && !isSynced; 

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

  // 1. Session Sync
  useEffect(() => {
    if (!isHydrated) return;
    if (token && !isSynced) {
      fetchSession();
    }
  }, [isHydrated, token, isSynced, fetchSession]);

  // 2. Auth Protection
  useEffect(() => {
    if (!isClient || !isHydrated || isRestoringSession) return;

    if (!isAuthenticated() && !isAuthPage) {
      router.replace('/login');
    }
    
    // We REMOVE the "already logged in" redirect from here to prevent fighting
    // The Login Page will handle the forward redirect explicitly.
    
  }, [isClient, isHydrated, isRestoringSession, isAuthenticated, isAuthPage, router]);

  // 3. Loading State
  if (!isClient || !isHydrated || isRestoringSession) {
     return (
        <div className="flex h-screen w-full items-center justify-center bg-[#020205] text-blue-500">
           <Loader2 className="animate-spin" size={40} />
        </div>
     );
  }

  // If redirecting, return null to avoid flash
  if (!isAuthenticated() && !isAuthPage) return null;

  return (
    <div className="relative min-h-screen w-full overflow-hidden flex flex-col md:flex-row" dir="rtl">
      
      <div className="fixed inset-0 z-0 pointer-events-none">
         <ModernBackground />
      </div>

      {!isAuthPage && !isAdminPage && <Sidebar />}
      {!isMobile && !isAuthPage && !isAdminPage && <ContextRail />}

      <main 
        className={`
          relative z-10 flex-1 transition-all duration-300 ease-[cubic-bezier(0.25,1,0.5,1)]
          flex flex-col min-h-0
          ${isMobile && !isAuthPage ? 'pb-28' : ''} 
          ${!isMobile && !isAuthPage && !isAdminPage ? (isSidebarOpen ? 'mr-[240px]' : 'mr-[80px]') : ''}
        `}
      >
        {children}
      </main>

      {!isAuthPage && !isAdminPage && isMobile && (
        <FloatingIsland 
           role={role || 'viewer'} 
           onOpenIssue={() => setShowIssueModal(true)}
           onOpenEvent={() => setShowEventModal(true)}
        />
      )}

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