"use client";

import { useEffect, useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { Bell, BellOff, LogOut, Download, User, RefreshCw, Menu, X, Calendar, Smartphone, Grid, List, Users, Briefcase, Flag, AlertTriangle } from "lucide-react";
import CalendarGrid, { CalendarGridHandle } from "@/components/CalendarGrid";
import FabMenu from "@/components/FabMenu";
import DepartmentModal from "@/components/DepartmentModal";
import UserModal from "@/components/UserModal";
import HolidayModal from "@/components/HolidayModal";
import IssueModal from "@/components/IssueModal";
import { ViewMode } from "@/components/views/shared/ViewSwitcher";
import clsx from "clsx";

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
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  
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

  const handleHardRefresh = async () => {
    setIsRefreshing(true);
    if ('serviceWorker' in navigator) {
      const registrations = await navigator.serviceWorker.getRegistrations();
      for (const registration of registrations) {
        await registration.unregister();
      }
    }
    window.location.reload();
  };

  const handleViewChange = (view: ViewMode) => {
    calendarRef.current?.setView(view);
    setIsMobileMenuOpen(false);
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
      <header className="flex items-center justify-between px-6 py-3 bg-black/60 backdrop-blur-md border-b border-white/10 shrink-0 z-50 h-16">
        <div className="flex items-center gap-4">
          <h1 className="text-xl font-bold text-white tracking-tight">زمان‌نگار</h1>
          
          <button onClick={handleHardRefresh} className="p-2 rounded-full hover:bg-white/10 transition-colors text-gray-400 hover:text-white" title="بروزرسانی">
            <RefreshCw size={20} className={isRefreshing ? "animate-spin" : ""} />
          </button>
        </div>
        
        {/* Desktop User Menu */}
        <div className="hidden sm:flex items-center gap-4">
          <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-white/5 border border-white/10">
            <User size={16} className="text-gray-400" />
            <span className="text-sm text-gray-200">{username}</span>
          </div>
          <button onClick={handleLogout} className="p-2 text-gray-400 hover:text-red-400 hover:bg-red-500/10 rounded-full transition-colors">
            <LogOut size={20} />
          </button>
        </div>

        {/* Mobile Sandwich Menu Button */}
        <div className="sm:hidden">
            <button onClick={() => setIsMobileMenuOpen(true)} className="p-2 text-white bg-white/10 rounded-xl border border-white/10">
                <Menu size={24} />
            </button>
        </div>
      </header>

      <main className="flex-1 w-full overflow-hidden relative p-0">
        <CalendarGrid ref={calendarRef} />
      </main>

      {/* Desktop Only FAB Menu */}
      <div className="hidden md:block">
        <FabMenu
            onOpenDepartments={() => setIsDeptModalOpen(true)}
            onOpenUsers={() => setIsUserModalOpen(true)}
            onOpenHolidays={() => setIsHolidayModalOpen(true)}
            onOpenIssues={() => setIsIssueModalOpen(true)}
            onOpenEventModal={() => calendarRef.current?.openNewEventModal()}
        />
      </div>

      {/* --- MOBILE SANDWICH MENU (DRAWER) --- */}
      {isMobileMenuOpen && (
          <div className="fixed inset-0 z-[6000] flex justify-end">
              {/* Backdrop */}
              <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setIsMobileMenuOpen(false)}></div>
              
              {/* Drawer */}
              <div className="w-[80%] max-w-sm h-full bg-[#1e1e1e] shadow-2xl relative flex flex-col animate-in slide-in-from-left duration-200 border-r border-white/10">
                  <div className="p-5 border-b border-white/10 flex justify-between items-center bg-white/5">
                      <h2 className="text-lg font-bold text-white">منوی دسترسی</h2>
                      <button onClick={() => setIsMobileMenuOpen(false)} className="p-2 bg-white/5 rounded-full text-gray-400">
                          <X size={20} />
                      </button>
                  </div>

                  <div className="flex-1 overflow-y-auto p-4 space-y-6">
                      
                      {/* Section 1: Views */}
                      <div className="space-y-2">
                          <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-3">نمای تقویم</h3>
                          <button onClick={() => handleViewChange('1day')} className="flex items-center gap-3 w-full p-3 rounded-xl bg-white/5 hover:bg-white/10 text-gray-200">
                              <Smartphone size={20} className="text-blue-400" /> <span>روزانه</span>
                          </button>
                          <button onClick={() => handleViewChange('3day')} className="flex items-center gap-3 w-full p-3 rounded-xl bg-white/5 hover:bg-white/10 text-gray-200">
                              <Calendar size={20} className="text-purple-400" /> <span>۳ روزه</span>
                          </button>
                          <button onClick={() => handleViewChange('mobile-week')} className="flex items-center gap-3 w-full p-3 rounded-xl bg-white/5 hover:bg-white/10 text-gray-200">
                              <Grid size={20} className="text-emerald-400" /> <span>هفتگی</span>
                          </button>
                          <button onClick={() => handleViewChange('month')} className="flex items-center gap-3 w-full p-3 rounded-xl bg-white/5 hover:bg-white/10 text-gray-200">
                              <Calendar size={20} className="text-orange-400" /> <span>ماهانه</span>
                          </button>
                      </div>

                      {/* Section 2: Manager Actions */}
                      <div className="space-y-2">
                          <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-3">مدیریت (FAB)</h3>
                          <button onClick={() => { setIsDeptModalOpen(true); setIsMobileMenuOpen(false); }} className="flex items-center gap-3 w-full p-3 rounded-xl bg-white/5 hover:bg-white/10 text-gray-200">
                              <Briefcase size={20} className="text-pink-400" /> <span>دپارتمان‌ها</span>
                          </button>
                          <button onClick={() => { setIsUserModalOpen(true); setIsMobileMenuOpen(false); }} className="flex items-center gap-3 w-full p-3 rounded-xl bg-white/5 hover:bg-white/10 text-gray-200">
                              <Users size={20} className="text-cyan-400" /> <span>کاربران</span>
                          </button>
                          <button onClick={() => { setIsHolidayModalOpen(true); setIsMobileMenuOpen(false); }} className="flex items-center gap-3 w-full p-3 rounded-xl bg-white/5 hover:bg-white/10 text-gray-200">
                              <Flag size={20} className="text-red-400" /> <span>تعطیلات</span>
                          </button>
                          <button onClick={() => { setIsIssueModalOpen(true); setIsMobileMenuOpen(false); }} className="flex items-center gap-3 w-full p-3 rounded-xl bg-white/5 hover:bg-white/10 text-gray-200">
                              <AlertTriangle size={20} className="text-yellow-400" /> <span>گزارش مشکل</span>
                          </button>
                      </div>

                  </div>
                  
                  {/* Footer: User Info */}
                  <div className="p-4 border-t border-white/10 bg-black/20">
                      <div className="flex items-center gap-3 mb-4">
                          <div className="w-10 h-10 rounded-full bg-blue-600 flex items-center justify-center text-white font-bold text-lg">
                              {username.charAt(0)}
                          </div>
                          <div>
                              <p className="font-bold text-white">{username}</p>
                              <button onClick={handleLogout} className="text-xs text-red-400 flex items-center gap-1 mt-1">
                                  <LogOut size={12} /> خروج از حساب
                              </button>
                          </div>
                      </div>
                  </div>
              </div>
          </div>
      )}

      {/* Modals */}
      <DepartmentModal isOpen={isDeptModalOpen} onClose={() => setIsDeptModalOpen(false)} />
      <UserModal isOpen={isUserModalOpen} onClose={() => setIsUserModalOpen(false)} />
      <HolidayModal isOpen={isHolidayModalOpen} onClose={() => setIsHolidayModalOpen(false)} onUpdate={() => {}} />
      <IssueModal isOpen={isIssueModalOpen} onClose={() => setIsIssueModalOpen(false)} />
    </div>
  );
}