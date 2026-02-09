"use client";

import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useLayoutStore } from "@/stores/layoutStore";
import { useAuthStore } from "@/stores/authStore";
import { useHotkeys } from "@/hooks/useHotkeys"; 
import FloatingIsland from "./FloatingIsland";
import ContextRail from "./ContextRail";
import Sidebar from "./Sidebar";
import DesktopHeader from "./DesktopHeader";
import ContextMenu from "@/components/ui/ContextMenu";
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
  
  useHotkeys();

  const { setIsMobile, isMobile, isSidebarOpen } = useLayoutStore();
  const { user, isAuthenticated, currentRole } = useAuthStore();
  
  const role = currentRole();
  const isAuthPage = pathname === "/login" || pathname === "/register";
  const isAdminPage = pathname?.startsWith("/admin");
  
  // Modal States
  const [showEventModal, setShowEventModal] = useState(false);
  const [showIssueModal, setShowIssueModal] = useState(false);
  const [editingEventId, setEditingEventId] = useState<number | undefined>(undefined);
  
  const [isClient, setIsClient] = useState(false);

  // --- 1. Global Event Listeners (Hotkeys & Context Menu) ---
  useEffect(() => {
    // A. Open New Event
    const handleOpenNew = () => {
      setEditingEventId(undefined);
      setShowEventModal(true);
    };

    // B. Open Edit Event (from Context Menu)
    const handleOpenEdit = (e: Event) => {
      const detail = (e as CustomEvent).detail;
      if (detail?.eventId) {
        setEditingEventId(detail.eventId);
        setShowEventModal(true);
      }
    };

    // C. Close All Modals (Esc Key)
    const handleCloseAll = () => {
      setShowEventModal(false);
      setShowIssueModal(false);
    };

    window.addEventListener('open-new-event', handleOpenNew);
    window.addEventListener('open-event-modal', handleOpenEdit);
    window.addEventListener('close-modals', handleCloseAll);

    return () => {
      window.removeEventListener('open-new-event', handleOpenNew);
      window.removeEventListener('open-event-modal', handleOpenEdit);
      window.removeEventListener('close-modals', handleCloseAll);
    };
  }, []);

  // --- 2. Button Focus Management (The "Prevent Stickiness" Fix) ---
  useEffect(() => {
    const handleMouseUp = (e: MouseEvent) => {
      // Find the closest button element if the user clicked an icon/span inside a button
      const button = (e.target as HTMLElement).closest('button');
      if (button) {
        // Force blur immediately so Space/Enter hotkeys don't re-trigger the button
        button.blur();
      }
    };
    window.addEventListener('mouseup', handleMouseUp);
    return () => window.removeEventListener('mouseup', handleMouseUp);
  }, []);

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
    <div className="relative h-screen w-full overflow-hidden flex flex-col md:flex-row bg-black" dir="rtl">
      <div className="fixed inset-0 z-0 pointer-events-none">
         <ModernBackground />
      </div>
      <ContextMenu />

      {!isAuthPage && !isAdminPage && <Sidebar />}
      {!isMobile && !isAuthPage && !isAdminPage && <ContextRail />}

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

      {/* Passing editId allows the modal to fetch data if needed, or pass null for new */}
      <EventModal 
        isOpen={showEventModal} 
        onClose={() => setShowEventModal(false)}
        onSuccess={() => setShowEventModal(false)}
        currentUserId={user?.id || 0}
        // If your EventModal supports editing by ID, pass it here
        // eventId={editingEventId} 
      />

      <IssueModal 
        isOpen={showIssueModal} 
        onClose={() => setShowIssueModal(false)}
        onSubmit={() => setShowIssueModal(false)}
      />
    </div>
  );
}