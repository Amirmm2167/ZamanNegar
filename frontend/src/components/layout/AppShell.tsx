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
  
  // Stores
  const { setIsMobile, isMobile, isSidebarOpen } = useLayoutStore();
  const { user, currentRole, isAuthenticated } = useAuthStore();
  
  const role = currentRole();
  const isAuthPage = pathname === "/login" || pathname === "/register";
  
  // Local State for Modals
  const [showEventModal, setShowEventModal] = useState(false);
  const [showIssueModal, setShowIssueModal] = useState(false);
  const [isClient, setIsClient] = useState(false);

  // 1. Hydration & Auth Check
  useEffect(() => {
    setIsClient(true);
    
    // Resize Listener
    const checkMobile = () => setIsMobile(window.innerWidth < 768);
    checkMobile();
    window.addEventListener("resize", checkMobile);

    return () => window.removeEventListener("resize", checkMobile);
  }, [setIsMobile]);

  // 2. Redirect if not authenticated
  useEffect(() => {
    if (isClient && !isAuthenticated() && !isAuthPage) {
      router.push('/login');
    }
  }, [isClient, isAuthenticated, isAuthPage, router]);

  // Prevent hydration mismatch or flash of unauthenticated content
  if (!isClient) return null;

  // Show Loader while redirecting
  if (!isAuthenticated() && !isAuthPage) {
     return (
        <div className="h-screen w-full flex items-center justify-center bg-[#000000] text-blue-500">
           <Loader2 className="animate-spin" size={32} />
        </div>
     );
  }

  return (
    <div className="relative min-h-screen w-full overflow-hidden flex flex-col md:flex-row" dir="rtl">
      
      {/* Background (Fixed) */}
      <div className="fixed inset-0 z-0 pointer-events-none">
         <ModernBackground />
      </div>

      {/* Sidebar (Desktop) */}
      {!isAuthPage && <Sidebar />}

      {/* Context Rail (Right Sidebar for Details) */}
      {!isMobile && !isAuthPage && <ContextRail />}

      {/* Main Content Area */}
      <main 
        className={`
          relative z-10 flex-1 transition-all duration-300 ease-[cubic-bezier(0.25,1,0.5,1)]
          flex flex-col min-h-0
          ${isMobile && !isAuthPage ? 'pb-28' : ''} 
          /* Adjust margin based on Sidebar state */
          ${!isMobile && !isAuthPage ? (isSidebarOpen ? 'mr-[240px]' : 'mr-[80px]') : ''}
        `}
      >
        {children}
      </main>

      {/* Mobile Navigation */}
      {!isAuthPage && isMobile && (
        <FloatingIsland 
           role={role || 'viewer'} 
           onOpenIssue={() => setShowIssueModal(true)}
           onOpenEvent={() => setShowEventModal(true)}
        />
      )}

      {/* Global Modals */}
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