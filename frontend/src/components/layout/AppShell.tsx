"use client";

import { useEffect, useState } from "react";
import { useLayoutStore } from "@/stores/layoutStore";
import FloatingIsland from "./FloatingIsland";
import ContextRail from "./ContextRail";
// import Sidebar from "./Sidebar"; // (Existing Sidebar logic needs to move here)
import ModernBackground from "@/components/ui/ModernBackground";

interface AppShellProps {
  children: React.ReactNode;
  role?: string; // Passed from initial auth check
}

export default function AppShell({ children, role = "viewer" }: AppShellProps) {
  const { setIsMobile, isMobile, selectedEventId } = useLayoutStore();
  const [isMounted, setIsMounted] = useState(false);

  // 1. Detect Mobile
  useEffect(() => {
    setIsMounted(true);
    const checkMobile = () => setIsMobile(window.innerWidth < 768);
    checkMobile();
    window.addEventListener("resize", checkMobile);
    return () => window.removeEventListener("resize", checkMobile);
  }, [setIsMobile]);

  // 2. Mock Handlers for the Island (You will connect these to actual Modals later)
  const handleOpenIssue = () => console.log("Open Issue Modal");
  const handleOpenEvent = () => console.log("Open Event Modal");

  if (!isMounted) return null; // Prevent hydration mismatch

  return (
    <div className="relative min-h-screen w-full overflow-hidden flex">
      
      {/* 1. Global Background */}
      <div className="fixed inset-0 z-0">
         <ModernBackground />
      </div>

      {/* 2. Desktop Context Rail (Left) */}
      {!isMobile && <ContextRail />}

      {/* 3. Main Content Area */}
      <main className={`
        relative z-10 flex-1 transition-all duration-300
        ${!isMobile && selectedEventId ? 'ml-[400px]' : ''} /* Push content when Rail opens */
        ${isMobile ? 'pb-24' : ''} /* Space for Island */
      `}>
        {children}
      </main>

      {/* 4. Mobile Navigation (Island) */}
      {isMobile && (
        <FloatingIsland 
           role={role} 
           onOpenIssue={handleOpenIssue}
           onOpenEvent={handleOpenEvent}
        />
      )}

    </div>
  );
}