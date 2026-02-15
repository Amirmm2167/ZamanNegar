"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation"; 
import { useLayoutStore } from "@/stores/layoutStore";
import { useAuthStore } from "@/stores/authStore";
import { useHotkeys } from "@/hooks/useHotkeys"; 
import FloatingIsland from "./FloatingIsland";
import Sidebar from "./Sidebar";
import DesktopHeader from "./DesktopHeader";
import NotificationsRail from "./NotificationsRail"; 
import ContextMenu from "@/components/ui/ContextMenu";
import ModernBackground from "@/components/ui/ModernBackground";
import EventModal from "@/components/EventModal";
import IssueModal from "@/components/IssueModal";
import { Loader2 } from "lucide-react";

interface AppShellProps {
  children: React.ReactNode;
}

export default function AppShell({ children }: AppShellProps) {
  const pathname = usePathname();
  useHotkeys();

  const { setIsMobile, isMobile, isSidebarOpen } = useLayoutStore();
  const { user, currentRole, initialize, isInitialized, isHydrated } = useAuthStore(); 
  
  // FIX: Determine Role Safely
  const role = currentRole();
  const isAuthPage = pathname === "/login" || pathname === "/register";
  const isAdminPage = pathname?.startsWith("/admin");
  
  const [showEventModal, setShowEventModal] = useState(false);
  const [showIssueModal, setShowIssueModal] = useState(false);
  const [editingEventId, setEditingEventId] = useState<number | undefined>(undefined);
  
  const [isClient, setIsClient] = useState(false);

  // --- 1. Client Mount ---
  useEffect(() => {
      setIsClient(true);
  }, []);

  // --- 2. Initialize AFTER Hydration ---
  // This prevents the "tokenless" API call that was happening on refresh
  useEffect(() => {
      if (isClient && isHydrated) {
          initialize();
      }
  }, [isClient, isHydrated, initialize]);

  // --- Mobile Check ---
  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 768);
    checkMobile();
    window.addEventListener("resize", checkMobile);
    return () => window.removeEventListener("resize", checkMobile);
  }, [setIsMobile]);

  // --- Event Listeners ---
  useEffect(() => {
    const handleOpenNew = () => { setEditingEventId(undefined); setShowEventModal(true); };
    const handleOpenEdit = (e: Event) => {
      const detail = (e as CustomEvent).detail;
      if (detail?.eventId) { setEditingEventId(detail.eventId); setShowEventModal(true); }
    };
    const handleCloseAll = () => { setShowEventModal(false); setShowIssueModal(false); };

    window.addEventListener('open-new-event', handleOpenNew);
    window.addEventListener('open-event-modal', handleOpenEdit);
    window.addEventListener('close-modals', handleCloseAll);

    return () => {
      window.removeEventListener('open-new-event', handleOpenNew);
      window.removeEventListener('open-event-modal', handleOpenEdit);
      window.removeEventListener('close-modals', handleCloseAll);
    };
  }, []);

  // --- Render Gates ---
  
  // 1. Wait for Hydration: Don't show ANYTHING until we've read cookies
  if (!isClient || !isHydrated) return null;

  // 2. Wait for API Validation (Optional but recommended for strict auth)
  // If we have a token but haven't validated it yet, show loader
  if (!isInitialized && !isAuthPage) {
      return (
        <div className="h-screen w-full flex items-center justify-center bg-[#000000] text-blue-500">
           <Loader2 className="animate-spin" size={32} />
        </div>
      );
  }

  return (
    <div className="relative h-screen w-full overflow-hidden flex flex-col md:flex-row bg-black" dir="rtl">
      <div className="fixed inset-0 z-0 pointer-events-none">
         <ModernBackground />
      </div>
      <ContextMenu />

      {!isAuthPage && !isAdminPage && <Sidebar />}
      {!isAuthPage && !isAdminPage && <NotificationsRail />}

      <main 
        className={`
          relative z-10 flex-1 flex flex-col h-full overflow-hidden transition-all duration-300
          ${!isMobile && !isAuthPage && !isAdminPage ? (isSidebarOpen ? 'mr-[240px]' : 'mr-[80px]') : ''}
        `}
      >
        {!isMobile && !isAuthPage && !isAdminPage && <DesktopHeader />}
        
        <div className="flex-1 relative overflow-hidden flex flex-col">
           {children}
        </div>
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
        onSuccess={() => {
            setShowEventModal(false);
            window.dispatchEvent(new Event('refresh-calendar'));
        }}
        eventId={editingEventId}
        currentUserId={user?.id}
      />

      <IssueModal 
        isOpen={showIssueModal} 
        onClose={() => setShowIssueModal(false)}
        onSubmit={() => setShowIssueModal(false)}
      />
    </div>
  );
}