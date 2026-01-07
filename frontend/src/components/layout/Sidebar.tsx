"use client";

import { useLayoutStore } from "@/stores/layoutStore";
import { 
  CalendarDays, 
  LayoutDashboard, 
  MessageSquare, 
  Settings, 
  LogOut, 
  ChevronRight, 
  ChevronLeft,
  Building2,
  Users
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import clsx from "clsx";
import { motion } from "framer-motion";

interface SidebarProps {
  role: string;
}

export default function Sidebar({ role }: SidebarProps) {
  const { isSidebarOpen, toggleSidebar } = useLayoutStore();
  const pathname = usePathname();

  const isManager = ["manager", "superadmin"].includes(role);

  const navItems = [
    { 
      label: "تقویم", 
      icon: CalendarDays, 
      href: "/", 
      active: pathname === "/" 
    },
    ...(isManager ? [{ 
      label: "پنل مدیریت", 
      icon: LayoutDashboard, 
      href: "/company-panel", 
      active: pathname.startsWith("/company-panel") 
    }] : []),
    { 
      label: "گزارشات", 
      icon: MessageSquare, 
      href: "/issues", // Or modal trigger if we prefer
      active: pathname === "/issues" 
    },
  ];

  return (
    <motion.aside
      initial={false}
      animate={{ width: isSidebarOpen ? 240 : 80 }}
      className="fixed top-0 right-0 h-full z-40 bg-[#09090b]/80 backdrop-blur-xl border-l border-white/10 flex flex-col transition-all duration-300 shadow-2xl"
    >
      {/* 1. Header / Logo */}
      <div className="h-20 flex items-center justify-center border-b border-white/5 relative">
         <div className="flex items-center gap-3 overflow-hidden whitespace-nowrap px-4 w-full">
            <div className="w-10 h-10 rounded-xl bg-blue-600 flex items-center justify-center shrink-0 shadow-[0_0_15px_rgba(37,99,235,0.4)]">
               <CalendarDays className="text-white" size={20} />
            </div>
            {isSidebarOpen && (
               <motion.span 
                 initial={{ opacity: 0 }} 
                 animate={{ opacity: 1 }} 
                 className="font-bold text-lg tracking-tight text-white"
               >
                 زمان‌نگار
               </motion.span>
            )}
         </div>
         
         {/* Toggle Button (Absolute on the edge) */}
         <button 
           onClick={toggleSidebar}
           className="absolute -left-3 top-1/2 -translate-y-1/2 w-6 h-6 bg-[#27272a] border border-white/10 rounded-full flex items-center justify-center text-gray-400 hover:text-white transition-colors z-50"
         >
            {isSidebarOpen ? <ChevronRight size={14} /> : <ChevronLeft size={14} />}
         </button>
      </div>

      {/* 2. Navigation */}
      <nav className="flex-1 py-6 px-3 space-y-2 overflow-y-auto custom-scrollbar">
         {navItems.map((item) => (
            <Link key={item.href} href={item.href}>
               <div className={clsx(
                  "flex items-center gap-3 px-3 py-3 rounded-xl transition-all duration-200 group relative overflow-hidden",
                  item.active 
                    ? "bg-blue-600/10 text-blue-400 border border-blue-600/20" 
                    : "text-gray-400 hover:text-white hover:bg-white/5 border border-transparent"
               )}>
                  <item.icon size={22} className={clsx("shrink-0 transition-colors", item.active ? "text-blue-400" : "group-hover:text-white")} />
                  
                  {isSidebarOpen && (
                    <motion.span 
                      initial={{ opacity: 0, x: 10 }} 
                      animate={{ opacity: 1, x: 0 }} 
                      className="text-sm font-medium whitespace-nowrap"
                    >
                       {item.label}
                    </motion.span>
                  )}

                  {!isSidebarOpen && item.active && (
                     <div className="absolute inset-y-0 right-0 w-1 bg-blue-500 rounded-l-full" />
                  )}
               </div>
            </Link>
         ))}
      </nav>

      {/* 3. Footer / Profile */}
      <div className="p-4 border-t border-white/5 bg-black/20">
         <div className={clsx("flex items-center gap-3", !isSidebarOpen && "justify-center")}>
            <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-emerald-500 to-cyan-500 shrink-0 border-2 border-[#09090b]" />
            
            {isSidebarOpen && (
               <div className="flex-1 min-w-0 overflow-hidden">
                  <div className="text-sm font-bold text-white truncate">کاربر سیستم</div>
                  <div className="text-xs text-gray-500 truncate capitalize">{role}</div>
               </div>
            )}
            
            {isSidebarOpen && (
               <button className="text-gray-500 hover:text-red-400 transition-colors">
                  <LogOut size={18} />
               </button>
            )}
         </div>
      </div>
    </motion.aside>
  );
}