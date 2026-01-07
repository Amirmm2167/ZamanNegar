"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation"; // Import usePathname
import { useLayoutStore } from "@/stores/layoutStore";
import FloatingIsland from "./FloatingIsland";
import ContextRail from "./ContextRail";
import ModernBackground from "@/components/ui/ModernBackground";
import EventModal from "@/components/EventModal";
import IssueModal from "@/components/IssueModal";

interface AppShellProps {
  children: React.ReactNode;
}

export default function AppShell({ children }: AppShellProps) {
  const { setIsMobile, isMobile } = useLayoutStore();
  const pathname = usePathname(); // Get current route
  const [isMounted, setIsMounted] = useState(false);
  const [role, setRole] = useState("viewer");

  // Route Logic: Hide shell elements on auth pages
  const isAuthPage = pathname === "/login" || pathname === "/register";

  // Modal States
  const [showEventModal, setShowEventModal] = useState(false);
  const [showIssueModal, setShowIssueModal] = useState(false);

  useEffect(() => {
    setIsMounted(true);
    const checkMobile = () => setIsMobile(window.innerWidth < 768);
    checkMobile();
    window.addEventListener("resize", checkMobile);
    
    const storedRole = localStorage.getItem("role") || "viewer";
    setRole(storedRole);

    return () => window.removeEventListener("resize", checkMobile);
  }, [setIsMobile]);

  const handleSaveEvent = () => setShowEventModal(false);
  const handleSubmitIssue = () => setShowIssueModal(false);

  if (!isMounted) return null;

  return (
    <div className="relative min-h-screen w-full overflow-hidden flex" dir="rtl">
      
      {/* 1. Global Background */}
      <div className="fixed inset-0 z-0 pointer-events-none">
         <ModernBackground />
      </div>

      {/* 2. Desktop Context Rail (Overlay Mode - No Layout Shift) */}
      {/* Only show if NOT mobile and NOT auth page */}
      {!isMobile && !isAuthPage && <ContextRail role={role} />}

      {/* 3. Main Content Area */}
      <main className={`
        relative z-10 flex-1 transition-all duration-300 ease-[cubic-bezier(0.25,1,0.5,1)]
        /* Removed 'mr-[400px]' logic to prevent shrinking. The rail will overlap. */
        ${isMobile && !isAuthPage ? 'pb-28' : ''} 
      `}>
        {children}
      </main>

      {/* 4. Mobile Navigation */}
      {/* Hide on Auth Pages */}
      {isMobile && !isAuthPage && (
        <FloatingIsland 
           role={role} 
           onOpenIssue={() => setShowIssueModal(true)}
           onOpenEvent={() => setShowEventModal(true)}
        />
      )}

      {/* 5. Global Modals */}
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