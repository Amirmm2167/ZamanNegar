"use client";

import { useEffect, useState } from "react";
import { useLayoutStore } from "@/stores/layoutStore";
import FloatingIsland from "./FloatingIsland";
import ContextRail from "./ContextRail";
import ModernBackground from "@/components/ui/ModernBackground";
// Import the new modals
import EventModal from "@/components/EventModal";
import IssueModal from "@/components/IssueModal";

interface AppShellProps {
  children: React.ReactNode;
}

export default function AppShell({ children }: AppShellProps) {
  const { setIsMobile, isMobile, selectedEventId } = useLayoutStore();
  const [isMounted, setIsMounted] = useState(false);
  const [role, setRole] = useState("viewer");

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

  // Handlers
  const handleSaveEvent = (data: any) => {
    console.log("Saving Event:", data);
    // Here you would call your API mutation
    setShowEventModal(false);
  };

  const handleSubmitIssue = (title: string, desc: string) => {
    console.log("Reporting Issue:", title, desc);
    // Here you would call your API mutation
    setShowIssueModal(false);
  };

  if (!isMounted) return null;

  return (
    <div className="relative min-h-screen w-full overflow-hidden flex" dir="rtl">
      
      {/* 1. Global Background */}
      <div className="fixed inset-0 z-0 pointer-events-none">
         <ModernBackground />
      </div>

      {/* 2. Desktop Context Rail */}
      {!isMobile && <ContextRail />}

      {/* 3. Main Content Area */}
      <main className={`
        relative z-10 flex-1 transition-all duration-300 ease-[cubic-bezier(0.25,1,0.5,1)]
        ${!isMobile && selectedEventId ? 'mr-[400px]' : ''} /* RTL: Push from right (start) or left (end)? Usually ContextRail is on Left in RTL if it's "Start" */
        ${isMobile ? 'pb-28' : ''}
      `}>
        {children}
      </main>

      {/* 4. Mobile Navigation (The Brain connects to the Hands) */}
      {isMobile && (
        <FloatingIsland 
           role={role} 
           onOpenIssue={() => setShowIssueModal(true)}
           onOpenEvent={() => setShowEventModal(true)}
        />
      )}

      {/* 5. Global Modals (Rendered at Shell Level) */}
      <EventModal 
        isOpen={showEventModal} 
        onClose={() => setShowEventModal(false)}
        onSave={handleSaveEvent}
      />

      <IssueModal 
        isOpen={showIssueModal} 
        onClose={() => setShowIssueModal(false)}
        onSubmit={handleSubmitIssue}
      />

    </div>
  );
}