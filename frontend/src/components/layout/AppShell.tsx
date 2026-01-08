"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { useLayoutStore } from "@/stores/layoutStore";
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
  const { setIsMobile, isMobile, isSidebarOpen } = useLayoutStore();
  const pathname = usePathname();
  const [role, setRole] = useState<string | null>(null); // Start null to indicate loading

  const isAuthPage = pathname === "/login" || pathname === "/register";

  const [showEventModal, setShowEventModal] = useState(false);
  const [showIssueModal, setShowIssueModal] = useState(false);

  useEffect(() => {
    // 1. Mobile Detection
    const checkMobile = () => setIsMobile(window.innerWidth < 768);
    checkMobile();
    window.addEventListener("resize", checkMobile);
    
    // 2. Auth Hydration (Critical Fix)
    const storedRole = localStorage.getItem("role");
    // We set state immediately. If null, we default to viewer BUT only after checking.
    // However, to avoid flash, we prefer to wait a tick or just set it.
    if (storedRole) {
        setRole(storedRole);
    } else {
        setRole("viewer");
    }

    return () => window.removeEventListener("resize", checkMobile);
  }, [setIsMobile]);

  const handleSaveEvent = () => setShowEventModal(false);
  const handleSubmitIssue = () => setShowIssueModal(false);

  // BLOCKING LOADER: Prevents the app from rendering the wrong view
  if (role === null) {
      return (
          <div className="h-screen w-full flex items-center justify-center bg-[#000000] text-blue-500">
              <Loader2 className="animate-spin" size={32} />
          </div>
      );
  }

  return (
    <div className="relative min-h-screen w-full overflow-hidden flex" dir="rtl">
      
      {/* Background */}
      <div className="fixed inset-0 z-0 pointer-events-none">
         <ModernBackground />
      </div>

      {/* Desktop Navigation */}
      {!isMobile && !isAuthPage && <Sidebar role={role} />}
      {!isMobile && !isAuthPage && <ContextRail role={role} />}

      {/* Main Content */}
      <main 
        className={`
          relative z-10 flex-1 transition-all duration-300 ease-[cubic-bezier(0.25,1,0.5,1)]
          ${isMobile && !isAuthPage ? 'pb-28' : ''} 
          /* Desktop Shift Logic */
          ${!isMobile && !isAuthPage ? (isSidebarOpen ? 'mr-[240px]' : 'mr-[80px]') : ''}
        `}
      >
        {children}
      </main>

      {/* Mobile Navigation */}
      {isMobile && !isAuthPage && (
        <FloatingIsland 
           role={role} 
           onOpenIssue={() => setShowIssueModal(true)}
           onOpenEvent={() => setShowEventModal(true)}
        />
      )}

      {/* Global Modals */}
      <EventModal 
        isOpen={showEventModal} 
        onClose={() => setShowEventModal(false)}
        onSuccess={handleSaveEvent}
        currentUserId={0}
      />

      <IssueModal 
        isOpen={showIssueModal} 
        onClose={() => setShowIssueModal(false)}
        onSubmit={handleSubmitIssue}
      />
    </div>
  );
}