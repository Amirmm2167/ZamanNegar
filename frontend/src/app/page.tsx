"use client";

import { useEffect, useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { Bell, BellOff, LogOut, Download, User } from "lucide-react";
import CalendarGrid, { CalendarGridHandle } from "@/components/CalendarGrid";
import FabMenu from "@/components/FabMenu";
import DepartmentModal from "@/components/DepartmentModal";
import UserModal from "@/components/UserModal";
import HolidayModal from "@/components/HolidayModal";
import IssueModal from "@/components/IssueModal";

export default function Dashboard() {
  const router = useRouter();
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);
  const [username, setUsername] = useState("");
  
  // Modals
  const [isDeptModalOpen, setIsDeptModalOpen] = useState(false);
  const [isUserModalOpen, setIsUserModalOpen] = useState(false);
  const [isHolidayModalOpen, setIsHolidayModalOpen] = useState(false);
  const [isIssueModalOpen, setIsIssueModalOpen] = useState(false);
  
  // Features
  const [notificationsEnabled, setNotificationsEnabled] = useState(false);
  const [installPrompt, setInstallPrompt] = useState<any>(null);
  
  const calendarRef = useRef<CalendarGridHandle>(null);

  useEffect(() => {
    // 1. Auth Check
    const token = localStorage.getItem("token");
    if (!token) {
      router.push("/login");
    } else {
      setIsAuthenticated(true);
      setUsername(localStorage.getItem("username") || "کاربر");
    }

    // 2. Check Notification Permission
    if ("Notification" in window) {
      setNotificationsEnabled(Notification.permission === "granted");
    }

    // 3. Listen for PWA Install Prompt
    const handleBeforeInstallPrompt = (e: any) => {
      e.preventDefault();
      setInstallPrompt(e);
    };
    window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt);

    return () => {
      window.removeEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
    };
  }, [router]);

  const toggleNotifications = async () => {
    if (!("Notification" in window)) return;
    const permission = await Notification.requestPermission();
    setNotificationsEnabled(permission === "granted");
    
    // Optional: Send this status to backend if you want to save preference
  };

  const handleInstallClick = () => {
    if (!installPrompt) return;
    installPrompt.prompt();
    installPrompt.userChoice.then((choiceResult: any) => {
      if (choiceResult.outcome === "accepted") {
        setInstallPrompt(null);
      }
    });
  };

  const handleLogout = () => {
    localStorage.clear();
    router.push("/login");
  };

  if (!isAuthenticated) {
    return (
      <div className="flex h-screen items-center justify-center bg-black text-white">
        <span className="text-lg">در حال بارگذاری...</span>
      </div>
    );
  }

  return (
    <div className="h-screen bg-transparent flex flex-col overflow-hidden text-gray-200 relative z-10">
      {/* --- GLOBAL APP HEADER --- */}
      <header className="flex items-center justify-between px-6 py-3 bg-black/60 backdrop-blur-md border-b border-white/10 shrink-0 z-50">
        <div className="flex items-center gap-4">
          <h1 className="text-xl font-bold text-white tracking-tight">زمان‌نگار</h1>
          
          {/* Notification Toggle */}
          <button 
            onClick={toggleNotifications}
            className="p-2 rounded-full hover:bg-white/10 transition-colors"
            title={notificationsEnabled ? "اعلانات فعال است" : "فعال‌سازی اعلانات"}
          >
            {notificationsEnabled ? (
              <Bell size={20} className="text-blue-400 drop-shadow-[0_0_8px_rgba(59,130,246,0.5)]" />
            ) : (
              <BellOff size={20} className="text-gray-500" />
            )}
          </button>

          {/* Install App Button (Only shows if browser allows it) */}
          {installPrompt && (
            <button
              onClick={handleInstallClick}
              className="flex items-center gap-2 px-3 py-1.5 text-xs font-medium bg-white/10 hover:bg-white/20 text-white rounded-full transition-all border border-white/20"
            >
              <Download size={14} />
              <span>نصب برنامه</span>
            </button>
          )}
        </div>
        
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-white/5 border border-white/10">
            <User size={16} className="text-gray-400" />
            <span className="text-sm text-gray-200">{username}</span>
          </div>
          <button 
            onClick={handleLogout} 
            className="p-2 text-gray-400 hover:text-red-400 hover:bg-red-500/10 rounded-full transition-colors"
            title="خروج"
          >
            <LogOut size={20} />
          </button>
        </div>
      </header>

      <main className="flex-1 w-full overflow-hidden relative p-0">
        <CalendarGrid ref={calendarRef} />
      </main>

      <FabMenu
        onOpenDepartments={() => setIsDeptModalOpen(true)}
        onOpenUsers={() => setIsUserModalOpen(true)}
        onOpenHolidays={() => setIsHolidayModalOpen(true)}
        onOpenIssues={() => setIsIssueModalOpen(true)}
        onOpenEventModal={() => calendarRef.current?.openNewEventModal()}
      />

      {/* Modals */}
      <DepartmentModal isOpen={isDeptModalOpen} onClose={() => setIsDeptModalOpen(false)} />
      <UserModal isOpen={isUserModalOpen} onClose={() => setIsUserModalOpen(false)} />
      <HolidayModal isOpen={isHolidayModalOpen} onClose={() => setIsHolidayModalOpen(false)} onUpdate={() => {}} />
      <IssueModal isOpen={isIssueModalOpen} onClose={() => setIsIssueModalOpen(false)} />
    </div>
  );
}