"use client";

import { useLayoutStore } from "@/stores/layoutStore";
import { useAuthStore } from "@/stores/authStore";
import { 
  Calendar, 
  Users, 
  Settings, 
  BarChart2, 
  CheckSquare, 
  LogOut,
  ChevronDown,
  Building2,
  ShieldCheck,
  X
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";

export default function Sidebar() {
  const pathname = usePathname();
  const { isSidebarOpen, setIsSidebarOpen, isMobile } = useLayoutStore();
  
  

  // Use Auth Store
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

  // Define Menu Items based on Role
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
      show: role === 'manager' || role === 'evaluator' 
    },
    { 
      name: "کاربران", 
      icon: Users, 
      href: "/company-panel", 
      show: role === 'manager' 
    },
    { 
      name: "گزارشات", 
      icon: BarChart2, 
      href: "/analytics", 
      show: role === 'manager' || role === 'superadmin' 
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
      className={`
        fixed top-0 right-0 h-full bg-[#0a0c10]/95 backdrop-blur-xl border-l border-white/5 
        transition-all duration-300 z-50 flex flex-col
        ${isSidebarOpen ? "w-[240px]" : "w-[80px]"}
        ${isMobile ? "translate-x-full" : "translate-x-0"}
      `}
    >
      {/* 1. Workspace Switcher (Header) */}
      <div className="h-20 flex items-center justify-center border-b border-white/5 relative">
        {isSidebarOpen ? (
          <div className="w-full px-4">
            <button 
              onClick={() => setDropdownOpen(!isDropdownOpen)}
              className="w-full flex items-center justify-between p-2 rounded-xl hover:bg-white/5 transition-colors group"
            >
              <div className="flex items-center gap-3 overflow-hidden">
                <div className="w-8 h-8 rounded-lg bg-blue-600/20 flex items-center justify-center text-blue-400 shrink-0">
                  <Building2 size={18} />
                </div>
                <div className="flex flex-col items-start min-w-0">
                  <span className="text-sm font-bold text-gray-200 truncate max-w-[120px]">
                    {activeCompany?.company_name || "انتخاب سازمان"}
                  </span>
                  <span className="text-[10px] text-gray-500 uppercase tracking-wider">
                    {role === 'manager' ? 'مدیر ارشد' : role === 'evaluator' ? 'ارزیاب' : 'کاربر'}
                  </span>
                </div>
              </div>
              <ChevronDown size={14} className="text-gray-500 group-hover:text-white" />
            </button>

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
                    className={`w-full text-right px-4 py-3 text-sm hover:bg-white/5 transition-colors flex items-center gap-2
                      ${activeCompanyId === ctx.company_id ? 'text-blue-400 bg-blue-500/10' : 'text-gray-400'}
                    `}
                  >
                    <Building2 size={14} />
                    {ctx.company_name}
                  </button>
                ))}
              </div>
            )}
          </div>
        ) : (
          <button onClick={() => setIsSidebarOpen(true)} className="w-10 h-10 rounded-xl bg-blue-600 flex items-center justify-center shadow-lg shadow-blue-500/20">
             <img src="/icons/logo.png" alt="Logo" className="w-6 h-6 brightness-0 invert" />
          </button>
        )}
      </div>

      {/* 2. Navigation Items */}
      <div className="flex-1 py-6 px-3 space-y-2 overflow-y-auto custom-scrollbar">
        {menuItems.filter(i => i.show).map((item) => {
          const isActive = pathname === item.href;
          return (
            <Link 
              key={item.name} 
              href={item.href}
              className={`
                flex items-center p-3 rounded-xl transition-all duration-200 group relative
                ${isActive ? "bg-blue-600 text-white shadow-lg shadow-blue-600/20" : "text-gray-400 hover:bg-white/5 hover:text-gray-100"}
                ${!isSidebarOpen && "justify-center"}
              `}
            >
              <item.icon size={22} strokeWidth={isActive ? 2.5 : 2} />
              
              {isSidebarOpen && (
                <span className="mr-3 font-medium text-sm">{item.name}</span>
              )}

              {/* Tooltip for collapsed state */}
              {!isSidebarOpen && (
                <div className="absolute right-full mr-2 px-3 py-1.5 bg-gray-800 text-white text-xs rounded-lg opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap z-50 border border-white/10">
                  {item.name}
                </div>
              )}
            </Link>
          );
        })}
      </div>

      {/* 3. Footer (User & Logout) */}
      <div className="p-4 border-t border-white/5">
         <button 
           onClick={logout}
           className={`
             w-full flex items-center p-3 rounded-xl text-red-400 hover:bg-red-500/10 transition-colors
             ${!isSidebarOpen && "justify-center"}
           `}
         >
           <LogOut size={20} />
           {isSidebarOpen && <span className="mr-3 text-sm font-medium">خروج</span>}
         </button>
      </div>
      
    </aside>
  );
}