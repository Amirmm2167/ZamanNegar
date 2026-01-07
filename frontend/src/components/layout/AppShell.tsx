"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { useLayoutStore } from "@/stores/layoutStore";
import FloatingIsland from "./FloatingIsland";
import ContextRail from "./ContextRail";
import Sidebar from "./Sidebar"; // NEW
import ModernBackground from "@/components/ui/ModernBackground";
import EventModal from "@/components/EventModal";
import IssueModal from "@/components/IssueModal";

interface AppShellProps {
  children: React.ReactNode;
}

export default function AppShell({ children }: AppShellProps) {
  const { setIsMobile, isMobile, isSidebarOpen } = useLayoutStore(); // Added isSidebarOpen
  const pathname = usePathname();
  const [isMounted, setIsMounted] = useState(false);
  const [role, setRole] = useState("viewer");

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

      {/* 2. Desktop Sidebar (Right Side) - Layout Shifting */}
      {!isMobile && !isAuthPage && <Sidebar role={role} />}

      {/* 3. Context Rail (Left Side) - Overlay */}
      {!isMobile && !isAuthPage && <ContextRail role={role} />}

      {/* 4. Main Content Area */}
      <main 
        className={`
          relative z-10 flex-1 transition-all duration-300 ease-[cubic-bezier(0.25,1,0.5,1)]
          ${isMobile && !isAuthPage ? 'pb-28' : ''} 
          /* Desktop Sidebar Margin Logic (RTL: Margin Right) */
          ${!isMobile && !isAuthPage ? (isSidebarOpen ? 'mr-[240px]' : 'mr-[80px]') : ''}
        `}
      >
        {children}
      </main>

      {/* 5. Mobile Navigation */}
      {isMobile && !isAuthPage && (
        <FloatingIsland 
           role={role} 
           onOpenIssue={() => setShowIssueModal(true)}
           onOpenEvent={() => setShowEventModal(true)}
        />
      )}

      {/* 6. Global Modals */}
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