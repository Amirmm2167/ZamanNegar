"use client";

import { useLayoutStore } from "@/stores/layoutStore";
import { useAuthStore } from "@/stores/authStore";
import {
  Calendar,
  LayoutDashboard, 
  CheckSquare,
  BarChart2,
  ShieldCheck,
  Building2,
  Settings,
  LogOut,
  Pin,
  PinOff,
  ChevronDown
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState, useRef } from "react";
import clsx from "clsx";

export default function Sidebar() {
  const pathname = usePathname();
  const { isSidebarOpen, setIsSidebarOpen, isMobile } = useLayoutStore();
  
  const {
    user,
    activeCompanyId,
    availableContexts,
    switchCompany,
    currentRole,
    logout
  } = useAuthStore();

  const role = currentRole();
  const activeCompany = availableContexts.find(c => c.company_id === activeCompanyId);
  const [isDropdownOpen, setDropdownOpen] = useState(false);
  
  const [isHovered, setIsHovered] = useState(false);
  const hoverTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const isExpanded = isSidebarOpen || isHovered;

  const handleMouseEnter = () => {
    if (isMobile) return;
    if (hoverTimeoutRef.current) clearTimeout(hoverTimeoutRef.current);
    hoverTimeoutRef.current = setTimeout(() => {
      setIsHovered(true);
    }, 300); 
  };

  const handleMouseLeave = () => {
    if (isMobile) return;
    if (hoverTimeoutRef.current) clearTimeout(hoverTimeoutRef.current);
    setIsHovered(false);
    setDropdownOpen(false);
  };

  // --- MENU CONFIGURATION ---
  const menuItems = [
    {
      name: "تقویم",
      icon: Calendar,
      href: "/",
      show: true
    },
    {
      name: "کارتابل",
      icon: CheckSquare,
      href: "/approvals",
      show: role === 'evaluator' 
    },
    // Unified Manager Hub
    {
      name: "پنل مدیریت",
      icon: LayoutDashboard,
      href: "/company-panel",
      show: role === 'manager'
    },
    {
      name: "گزارشات",
      icon: BarChart2,
      href: "/analytics",
      show: role === 'superadmin' 
    },
    {
      name: "ادمین سیستم",
      icon: ShieldCheck,
      href: "/admin",
      show: user?.is_superadmin
    },
  ];

  return (
    <aside
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      className={clsx(
        "fixed top-0 right-0 h-full bg-[#0a0c10]/95 backdrop-blur-xl border-l border-white/5",
        "transition-all duration-300 ease-[cubic-bezier(0.4,0,0.2,1)] z-50 flex flex-col",
        isExpanded ? "w-[240px]" : "w-[80px]",
        isMobile ? (isSidebarOpen ? "translate-x-0" : "translate-x-full") : "translate-x-0"
      )}
    >
      {/* 1. Header (Workspace + Pin) */}
      <div className="h-20 flex items-center justify-center border-b border-white/5 relative shrink-0">
        {isExpanded ? (
          <div className="w-full px-4 animate-in fade-in slide-in-from-right-4 duration-300">
            <div className="flex items-center justify-between">
                
                {/* Workspace Selector */}
                <button
                  onClick={() => setDropdownOpen(!isDropdownOpen)}
                  className="flex-1 flex items-center gap-3 p-2 rounded-xl hover:bg-white/5 transition-colors overflow-hidden text-right"
                >
                  <div className="w-8 h-8 rounded-lg bg-blue-600/20 flex items-center justify-center text-blue-400 shrink-0">
                    <Building2 size={18} />
                  </div>
                  <div className="flex flex-col items-start min-w-0">
                    <span className="text-sm font-bold text-gray-200 truncate max-w-[100px]">
                      {activeCompany?.company_name || "انتخاب سازمان"}
                    </span>
                    <span className="text-[10px] text-gray-500 uppercase tracking-wider">
                      {role === 'manager' ? 'مدیر ارشد' : role === 'evaluator' ? 'ارزیاب' : 'کاربر'}
                    </span>
                  </div>
                  <ChevronDown size={14} className="text-gray-500 mr-auto" />
                </button>

                {/* Pin Button */}
                <button
                   onClick={(e) => {
                     e.stopPropagation();
                     setIsSidebarOpen(!isSidebarOpen);
                   }}
                   className="ml-1 text-gray-500 hover:text-white p-1.5 rounded-lg hover:bg-white/10 transition-colors"
                   title={isSidebarOpen ? "برداشتن پین (حالت خودکار)" : "پین کردن منو (همیشه باز)"}
                >
                   {isSidebarOpen ? <Pin size={16} className="fill-blue-500 text-blue-500" /> : <PinOff size={16} />}
                </button>
            </div>

            {/* Dropdown Menu */}
            {isDropdownOpen && (
              <div className="absolute top-full left-4 right-4 mt-2 bg-[#1a1d24] border border-white/10 rounded-xl shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 z-50">
                {availableContexts.map((ctx) => (
                  <button
                    key={ctx.company_id}
                    onClick={() => {
                      switchCompany(ctx.company_id);
                      setDropdownOpen(false);
                    }}
                    className={clsx(
                      "w-full text-right px-4 py-3 text-sm hover:bg-white/5 transition-colors flex items-center gap-2",
                      activeCompanyId === ctx.company_id ? 'text-blue-400 bg-blue-500/10' : 'text-gray-400'
                    )}
                  >
                    <Building2 size={14} />
                    {ctx.company_name}
                  </button>
                ))}
              </div>
            )}
          </div>
        ) : (
          <div className="flex flex-col items-center gap-2 w-full">
              <button className="w-10 h-10 rounded-xl bg-blue-900 flex items-center justify-center shadow-lg shadow-blue-500/20">
                <img src="/icons/icon.png" alt="Logo" className="w-6 h-6" />
              </button>
          </div>
        )}
      </div>

      {/* 2. Navigation Items */}
      <div 
        className={clsx(
          "flex-1 py-6 px-3 space-y-2",
          isExpanded ? "overflow-y-auto scrollbar-hide" : "overflow-hidden"
        )}
      >
        {menuItems.filter(i => i.show).map((item) => {
          const isActive = pathname === item.href || (item.href.includes('?') && pathname === item.href.split('?')[0] && window.location.search.includes(item.href.split('?')[1]));
          return (
            <Link
              key={item.name}
              href={item.href}
              className={clsx(
                "flex items-center p-3 rounded-xl transition-all duration-200 group relative",
                isActive ? "bg-blue-600 text-white shadow-lg shadow-blue-600/20" : "text-gray-400 hover:bg-white/5 hover:text-gray-100"
              )}
            >
              <div className="relative shrink-0">
                 <item.icon size={22} strokeWidth={isActive ? 2.5 : 2} />
                 {!isExpanded && isActive && (
                    <span className="absolute -right-1 -top-1 w-2.5 h-2.5 bg-blue-400 rounded-full border-2 border-[#0a0c10]" />
                 )}
              </div>
              
              <span className={clsx(
                 "mr-3 font-medium text-sm whitespace-nowrap transition-all duration-300",
                 isExpanded ? "opacity-100 translate-x-0" : "opacity-0 translate-x-4 pointer-events-none absolute right-10"
              )}>
                  {item.name}
              </span>

              {!isExpanded && (
                <div className="absolute right-full mr-4 px-3 py-1.5 bg-gray-800 text-white text-xs rounded-lg opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap z-50 border border-white/10 shadow-xl">
                  {item.name}
                  <div className="absolute top-1/2 -right-1 w-2 h-2 bg-gray-800 rotate-45 border-t border-r border-white/10 transform -translate-y-1/2" />
                </div>
              )}
            </Link>
          );
        })}
      </div>

      {/* 3. Footer */}
      <div className="p-4 border-t border-white/5 space-y-1 shrink-0">
         <Link
           href="/settings"
           className={clsx(
             "w-full flex items-center p-3 rounded-xl text-gray-400 hover:bg-white/5 hover:text-white transition-colors group relative"
           )}
         >
           <div className="relative shrink-0">
             <Settings size={20} />
           </div>

           <span className={clsx(
              "mr-3 text-sm font-medium whitespace-nowrap transition-all duration-300",
              isExpanded ? "opacity-100 translate-x-0" : "opacity-0 translate-x-4 pointer-events-none absolute right-10"
           )}>
             تنظیمات
           </span>
         </Link>

         <button
           onClick={logout}
           className={clsx(
             "w-full flex items-center p-3 rounded-xl text-red-400 hover:bg-red-500/10 transition-colors group relative"
           )}
           title={!isExpanded ? "خروج" : ""}
         >
           <div className="relative shrink-0">
             <LogOut size={20} />
           </div>

           <span className={clsx(
              "mr-3 text-sm font-medium whitespace-nowrap transition-all duration-300",
              isExpanded ? "opacity-100 translate-x-0" : "opacity-0 translate-x-4 pointer-events-none absolute right-10"
           )}>
             خروج
           </span>
         </button>
      </div>
    </aside>
  );
}