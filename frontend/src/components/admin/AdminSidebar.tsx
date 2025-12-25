"use client";

import { Building, CalendarOff, MessageSquare, LogOut, Shield } from "lucide-react";
import clsx from "clsx";
import GlassPane from "@/components/ui/GlassPane";

interface AdminSidebarProps {
  activeTab: string;
  onChangeTab: (tab: string) => void;
  onLogout: () => void;
}

export default function AdminSidebar({ activeTab, onChangeTab, onLogout }: AdminSidebarProps) {
  const menuItems = [
    { id: "companies", label: "مدیریت شرکت‌ها", icon: Building },
    { id: "holidays", label: "تعطیلات سراسری", icon: CalendarOff },
    { id: "reports", label: "گزارشات کاربران", icon: MessageSquare },
  ];

  return (
    <GlassPane intensity="medium" className="w-72 h-full flex flex-col border-l border-white/10 rounded-l-2xl my-4 ms-4">
      <div className="h-20 flex items-center gap-3 px-6 border-b border-white/10">
        <div className="p-2 bg-red-500/20 rounded-lg">
             <Shield className="text-red-500" size={24} />
        </div>
        <div>
            <h1 className="font-bold text-white text-lg">پنل ادمین</h1>
            <span className="text-xs text-gray-400">مدیریت سیستم</span>
        </div>
      </div>

      <nav className="flex-1 p-4 space-y-2">
        {menuItems.map((item) => (
          <button
            key={item.id}
            onClick={() => onChangeTab(item.id)}
            className={clsx(
              "w-full flex items-center gap-3 px-4 py-3.5 rounded-xl transition-all border",
              activeTab === item.id 
                ? "bg-blue-600/20 border-blue-500/50 text-blue-100 shadow-[0_0_15px_rgba(37,99,235,0.2)]" 
                : "border-transparent text-gray-400 hover:bg-white/5 hover:text-white"
            )}
          >
            <item.icon size={20} />
            <span className="font-medium">{item.label}</span>
          </button>
        ))}
      </nav>

      <div className="p-4 border-t border-white/10">
        <button
          onClick={onLogout}
          className="w-full flex items-center gap-3 px-4 py-3 text-red-400 hover:bg-red-900/20 rounded-xl transition-colors"
        >
          <LogOut size={20} />
          <span>خروج</span>
        </button>
      </div>
    </GlassPane>
  );
}