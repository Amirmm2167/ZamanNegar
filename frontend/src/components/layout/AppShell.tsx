"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { useLayoutStore } from "@/stores/layoutStore";
import FloatingIsland from "./FloatingIsland";
import ContextRail from "./ContextRail";
import Sidebar from "./Sidebar";
// REMOVED: import MobileHeader from "./MobileHeader"; 
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
  const [role, setRole] = useState<string | null>(null);

  const isAuthPage = pathname === "/login" || pathname === "/register";

  const [showEventModal, setShowEventModal] = useState(false);
  const [showIssueModal, setShowIssueModal] = useState(false);

  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 768);
    checkMobile();
    window.addEventListener("resize", checkMobile);
    
    const storedRole = localStorage.getItem("role");
    setRole(storedRole || "viewer"); 

    return () => window.removeEventListener("resize", checkMobile);
  }, [setIsMobile]);

  const handleSaveEvent = () => setShowEventModal(false);
  const handleSubmitIssue = () => setShowIssueModal(false);

  if (role === null) {
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

      {/* 1. Sidebar (Desktop Only) */}
      {!isAuthPage && <Sidebar role={role} />}

      {/* 2. Context Rail (Desktop Only) */}
      {!isMobile && !isAuthPage && <ContextRail role={role} />}

      {/* 3. Main Content */}
      <main 
        className={`
          relative z-10 flex-1 transition-all duration-300 ease-[cubic-bezier(0.25,1,0.5,1)]
          flex flex-col min-h-0
          ${isMobile && !isAuthPage ? 'pb-28' : ''} 
          ${!isMobile && !isAuthPage ? (isSidebarOpen ? 'mr-[240px]' : 'mr-[80px]') : ''}
        `}
      >
        {children}
      </main>

      {/* 4. Floating Island (Mobile Nav) */}
      {isMobile && !isAuthPage && (
        <FloatingIsland 
           role={role} 
           onOpenIssue={() => setShowIssueModal(true)}
           onOpenEvent={() => setShowEventModal(true)}
        />
      )}

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