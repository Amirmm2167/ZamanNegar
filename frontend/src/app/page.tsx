"use client";

import { useEffect, useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { Bell, BellOff, LogOut, Download, User, Users, RefreshCw, Menu, X, Calendar, Smartphone, Grid, Briefcase, Flag, AlertTriangle } from "lucide-react";
import { motion, AnimatePresence, Variants } from "framer-motion"; 
import CalendarGrid, { CalendarGridHandle } from "@/components/CalendarGrid";
import FabMenu from "@/components/FabMenu";
import DepartmentModal from "@/components/DepartmentModal";
import UserModal from "@/components/UserModal";
import HolidayModal from "@/components/HolidayModal";
import IssueModal from "@/components/IssueModal";
import SkeletonGrid from "@/components/views/mobile/SkeletonGrid"; 
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

  // Loading State -> Show Skeleton
  if (!isAuthenticated) {
    return (
      <div className="h-screen bg-black flex flex-col">
         {/* Fake Header for smooth transition */}
         <div className="h-16 border-b border-white/10 bg-black/60 backdrop-blur-md flex items-center justify-between px-6">
             <div className="w-8 h-8 bg-white/10 rounded-xl animate-pulse"/>
             <div className="w-24 h-6 bg-white/10 rounded animate-pulse"/>
         </div>
         {/* Skeleton Grid */}
         <div className="flex-1 overflow-hidden">
             <SkeletonGrid daysToShow={3} />
         </div>
      </div>
    );
  }

  // Animation Variants (Typed Correctly)
  const sidebarVariants: Variants = {
    closed: { 
        x: "120%", 
        opacity: 0,
        scale: 0.95,
        transition: { type: "spring", stiffness: 400, damping: 40 } 
    },
    open: { 
        x: 0, 
        opacity: 1,
        scale: 1,
        transition: { type: "spring", stiffness: 300, damping: 30 } 
    }
  };

  const overlayVariants: Variants = {
    closed: { opacity: 0 },
    open: { opacity: 1 }
  };

  const itemVariants: Variants = {
    closed: { opacity: 0, x: 20 },
    open: (i: number) => ({ 
        opacity: 1, 
        x: 0, 
        transition: { delay: i * 0.05 + 0.1 } 
    })
  };

  return (
    <div className="h-screen bg-transparent flex flex-col overflow-hidden text-gray-200 relative z-10">
      {/* --- GLOBAL APP HEADER --- */}
      <header className="flex items-center justify-between px-6 py-3 bg-black/60 backdrop-blur-md border-b border-white/10 shrink-0 z-50 h-16">
        
        {/* RIGHT SIDE (RTL Start) */}
        <div className="flex items-center gap-4">
          <div className="sm:hidden">
            <button 
                onClick={() => setIsMobileMenuOpen(true)} 
                className="p-2 text-white bg-white/10 rounded-xl border border-white/10 active:scale-90 transition-transform hover:bg-white/20"
            >
                <Menu size={24} />
            </button>
          </div>

          <h1 className="text-xl font-bold text-white tracking-tight">زمان‌نگار</h1>
        </div>
        
        {/* LEFT SIDE (RTL End) */}
        <div className="flex items-center gap-4">
          <button onClick={handleHardRefresh} className="p-2 rounded-full hover:bg-white/10 transition-colors text-gray-400 hover:text-white" title="بروزرسانی">
            <RefreshCw size={20} className={isRefreshing ? "animate-spin" : ""} />
          </button>

          <div className="hidden sm:flex items-center gap-4">
            <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-white/5 border border-white/10">
              <User size={16} className="text-gray-400" />
              <span className="text-sm text-gray-200">{username}</span>
            </div>
            <button onClick={handleLogout} className="p-2 text-gray-400 hover:text-red-400 hover:bg-red-500/10 rounded-full transition-colors">
              <LogOut size={20} />
            </button>
          </div>
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

      {/* --- NEW: Mobile Feedback Button (Restored Tunnel) --- */}
      <div className="md:hidden fixed bottom-6 left-6 z-[50]">
        <button 
            onClick={() => setIsIssueModalOpen(true)}
            className="w-14 h-14 bg-yellow-500 text-black rounded-full shadow-lg shadow-yellow-500/20 flex items-center justify-center active:scale-90 transition-transform border-2 border-yellow-400"
        >
            <AlertTriangle size={24} strokeWidth={2.5} />
        </button>
      </div>

      <AnimatePresence>
      {isMobileMenuOpen && (
          <>
            <motion.div 
                initial="closed" animate="open" exit="closed" variants={overlayVariants}
                className="fixed inset-0 z-[6000] bg-black/60 backdrop-blur-sm" 
                onClick={() => setIsMobileMenuOpen(false)}
            />
              
            <motion.div 
                initial="closed" animate="open" exit="closed" variants={sidebarVariants}
                className={clsx(
                    "fixed z-[6001] flex flex-col overflow-hidden",
                    "top-3 bottom-3 right-3 w-[85%] max-w-[320px]", 
                    "bg-[#0a0a0a]/90 backdrop-blur-2xl", 
                    "rounded-[32px] border border-white/10 shadow-2xl" 
                )}
            >
                <div className="p-6 flex justify-between items-center relative">
                    <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500/20 blur-[60px] rounded-full pointer-events-none" />
                    
                    <div className="relative z-10">
                        <h2 className="text-xl font-black text-white tracking-tight">منوی کاربری</h2>
                        <p className="text-xs text-gray-400 mt-1">مدیریت و تنظیمات تقویم</p>
                    </div>
                    <button 
                        onClick={() => setIsMobileMenuOpen(false)} 
                        className="relative z-10 p-2 bg-white/5 hover:bg-white/15 rounded-full text-gray-400 hover:text-white transition-colors border border-white/5 active:scale-90"
                    >
                        <X size={20} />
                    </button>
                </div>

                <div className="flex-1 overflow-y-auto p-5 space-y-8 relative z-10 custom-scrollbar">
                    
                    <div className="space-y-3">
                        <h3 className="text-[10px] font-bold text-gray-500 uppercase tracking-widest px-1">نمای تقویم</h3>
                        <div className="grid grid-cols-1 gap-2">
                            {[
                                { id: '1day', label: 'روزانه', icon: Smartphone, color: 'text-blue-400', bg: 'bg-blue-500/10' },
                                { id: '3day', label: '۳ روزه', icon: Calendar, color: 'text-purple-400', bg: 'bg-purple-500/10' },
                                { id: 'mobile-week', label: 'هفتگی', icon: Grid, color: 'text-emerald-400', bg: 'bg-emerald-500/10' },
                                { id: 'month', label: 'ماهانه', icon: Calendar, color: 'text-orange-400', bg: 'bg-orange-500/10' },
                            ].map((item, i) => (
                                <motion.button
                                    key={item.id}
                                    custom={i}
                                    variants={itemVariants}
                                    initial="closed"
                                    animate="open"
                                    onClick={() => handleViewChange(item.id as ViewMode)}
                                    className="flex items-center justify-between w-full p-3.5 rounded-2xl bg-white/5 hover:bg-white/10 border border-white/5 transition-all active:scale-[0.98] group"
                                >
                                    <div className="flex items-center gap-4">
                                        <div className={clsx("p-2 rounded-xl", item.bg, item.color)}>
                                            <item.icon size={18} />
                                        </div>
                                        <span className="font-medium text-gray-200 group-hover:text-white transition-colors">{item.label}</span>
                                    </div>
                                </motion.button>
                            ))}
                        </div>
                    </div>

                    <div className="space-y-3">
                        <h3 className="text-[10px] font-bold text-gray-500 uppercase tracking-widest px-1">مدیریت سیستم</h3>
                        <div className="grid grid-cols-1 gap-2">
                            {[
                                { label: 'دپارتمان‌ها', icon: Briefcase, action: () => setIsDeptModalOpen(true), color: 'text-pink-400' },
                                { label: 'کاربران', icon: Users, action: () => setIsUserModalOpen(true), color: 'text-cyan-400' },
                                { label: 'تعطیلات', icon: Flag, action: () => setIsHolidayModalOpen(true), color: 'text-red-400' },
                                { label: 'گزارش مشکل', icon: AlertTriangle, action: () => setIsIssueModalOpen(true), color: 'text-yellow-400' },
                            ].map((item, i) => (
                                <motion.button
                                    key={i}
                                    custom={i + 4} 
                                    variants={itemVariants}
                                    initial="closed"
                                    animate="open"
                                    onClick={() => { item.action(); setIsMobileMenuOpen(false); }}
                                    className="flex items-center gap-4 w-full p-3 rounded-xl hover:bg-white/5 transition-colors text-gray-300 hover:text-white"
                                >
                                    <item.icon size={18} className={item.color} />
                                    <span className="text-sm">{item.label}</span>
                                </motion.button>
                            ))}
                        </div>
                    </div>

                </div>
                
                <div className="p-5 border-t border-white/10 bg-black/20 backdrop-blur-md relative z-10">
                    <div className="flex items-center gap-4 p-3 rounded-2xl bg-white/5 border border-white/10 shadow-lg">
                        <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-500 to-blue-700 flex items-center justify-center text-white font-bold text-xl shadow-inner shrink-0">
                            {username.charAt(0)}
                        </div>
                        <div className="flex-1 min-w-0">
                            <p className="font-bold text-white text-sm truncate">{username}</p>
                            <div className="flex items-center gap-2 mt-1">
                                <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></div>
                                <span className="text-[10px] text-gray-400">آنلاین</span>
                            </div>
                        </div>
                        <button onClick={handleLogout} className="p-2 text-red-400 hover:bg-red-500/10 rounded-lg transition-colors">
                            <LogOut size={18} />
                        </button>
                    </div>
                </div>
            </motion.div>
          </>
      )}
      </AnimatePresence>

      <DepartmentModal isOpen={isDeptModalOpen} onClose={() => setIsDeptModalOpen(false)} />
      <UserModal isOpen={isUserModalOpen} onClose={() => setIsUserModalOpen(false)} />
      <HolidayModal isOpen={isHolidayModalOpen} onClose={() => setIsHolidayModalOpen(false)} onUpdate={() => {}} />
      <IssueModal isOpen={isIssueModalOpen} onClose={() => setIsIssueModalOpen(false)} />
    </div>
  );
}