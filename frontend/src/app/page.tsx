"use client";

import { useEffect, useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { Bell, BellOff, Settings, LogOut } from "lucide-react";
import CalendarGrid, { CalendarGridHandle } from "@/components/CalendarGrid";
import FabMenu from "@/components/FabMenu";
import DepartmentModal from "@/components/DepartmentModal";
import UserModal from "@/components/UserModal";
import HolidayModal from "@/components/HolidayModal";
import IssueModal from "@/components/IssueModal"; // Ensure this is imported

export default function Dashboard() {
  const router = useRouter();
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);
  const [isDeptModalOpen, setIsDeptModalOpen] = useState(false);
  const [isUserModalOpen, setIsUserModalOpen] = useState(false);
  const [isHolidayModalOpen, setIsHolidayModalOpen] = useState(false);
  const [isIssueModalOpen, setIsIssueModalOpen] = useState(false);
  const [notificationsEnabled, setNotificationsEnabled] = useState(false);
  // Create Ref for CalendarGrid
  const calendarRef = useRef<CalendarGridHandle>(null);

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) router.push("/login");
    else setIsAuthenticated(true);
    
    // Check notification status on load
    if ("Notification" in window) {
      setNotificationsEnabled(Notification.permission === "granted");
    }
  }, [router]);

  const toggleNotifications = async () => {
    if (!("Notification" in window)) return;
    const permission = await Notification.requestPermission();
    setNotificationsEnabled(permission === "granted");
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
      <header className="flex items-center justify-between px-6 py-3 bg-black/40 backdrop-blur-md border-b border-white/10">
        <div className="flex items-center gap-4">
          <h1 className="text-xl font-bold text-white">زمان‌نگار</h1>
          <button 
            onClick={toggleNotifications}
            className="p-2 rounded-full hover:bg-white/10 transition-colors"
            title="تنظیمات اعلان"
          >
            {notificationsEnabled ? <Bell size={20} className="text-blue-400" /> : <BellOff size={20} className="text-gray-400" />}
          </button>
        </div>
        
        <div className="flex items-center gap-3">
          <span className="text-sm opacity-70">{localStorage.getItem("username")}</span>
          <button onClick={handleLogout} className="p-2 hover:text-red-400 transition-colors">
            <LogOut size={20} />
          </button>
        </div>
      </header>
      <main className="flex-1 w-full overflow-hidden relative p-0">
        {" "}
        {/* Padding removed for full screen */}
        <CalendarGrid ref={calendarRef} />
      </main>

      <FabMenu
        onOpenDepartments={() => setIsDeptModalOpen(true)}
        onOpenUsers={() => setIsUserModalOpen(true)}
        onOpenHolidays={() => setIsHolidayModalOpen(true)}
        onOpenIssues={() => setIsIssueModalOpen(true)}
        // USE THE REF HERE
        onOpenEventModal={() => calendarRef.current?.openNewEventModal()}
      />

      <DepartmentModal
        isOpen={isDeptModalOpen}
        onClose={() => setIsDeptModalOpen(false)}
      />

      <UserModal
        isOpen={isUserModalOpen}
        onClose={() => setIsUserModalOpen(false)}
      />

      <HolidayModal
        isOpen={isHolidayModalOpen}
        onClose={() => setIsHolidayModalOpen(false)}
        onUpdate={() => {}}
      />

      <IssueModal
        isOpen={isIssueModalOpen}
        onClose={() => setIsIssueModalOpen(false)}
      />
    </div>
  );
}
