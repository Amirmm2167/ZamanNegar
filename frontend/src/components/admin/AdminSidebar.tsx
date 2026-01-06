"use client";

import { Building, Calendar, FileText, LogOut, LayoutDashboard, Activity } from "lucide-react"; // Added Activity
import clsx from "clsx";

interface AdminSidebarProps {
  activeTab: string;
  onChangeTab: (tab: string) => void;
  onLogout: () => void;
}

export default function AdminSidebar({ activeTab, onChangeTab, onLogout }: AdminSidebarProps) {
  const menuItems = [
    { id: "companies", label: "سازمان‌ها", icon: Building },
    { id: "holidays", label: "تعطیلات", icon: Calendar },
    { id: "reports", label: "گزارشات", icon: FileText },
    { id: "analytics", label: "آمار و تحلیل", icon: Activity }, // New Item
  ];

  return (
    <aside className="w-64 bg-[#1e1e1e]/80 backdrop-blur-xl border-l border-white/10 flex flex-col shrink-0">
      <div className="p-6 flex items-center gap-3 border-b border-white/5">
        <LayoutDashboard className="text-blue-500" />
        <h1 className="font-bold text-lg">پنل مدیریت</h1>
      </div>

      <nav className="flex-1 p-4 space-y-2">
        {menuItems.map((item) => (
          <button
            key={item.id}
            onClick={() => onChangeTab(item.id)}
            className={clsx(
              "w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all",
              activeTab === item.id 
                ? "bg-blue-600 text-white shadow-lg shadow-blue-900/20" 
                : "text-gray-400 hover:bg-white/5 hover:text-white"
            )}
          >
            <item.icon size={20} />
            <span className="font-medium text-sm">{item.label}</span>
          </button>
        ))}
      </nav>

      <div className="p-4 border-t border-white/5">
        <button 
          onClick={onLogout}
          className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-red-400 hover:bg-red-500/10 transition-colors"
        >
          <LogOut size={20} />
          <span className="font-medium text-sm">خروج</span>
        </button>
      </div>
    </aside>
  );
}