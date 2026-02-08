"use client";

import { 
  Users, Building2, BarChart2, ShieldCheck, LogOut, 
  LayoutDashboard, Calendar, Coffee, Radio, Lock
} from "lucide-react";
import { useAuthStore } from "@/stores/authStore";

interface AdminSidebarProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
}

export default function AdminSidebar({ activeTab, setActiveTab }: AdminSidebarProps) {
  const { logout } = useAuthStore();

  const menuItems = [
    { id: "dashboard", name: "داشبورد", icon: LayoutDashboard },
    { id: "calendar", name: "تقویم سازمانی", icon: Calendar },
    { id: "broadcasts", name: "رویدادهای سراسری", icon: Radio },
    { id: "users", name: "مدیریت کاربران", icon: Users },
    { id: "companies", name: "سازمان‌ها", icon: Building2 },
    { id: "holidays", name: "تعطیلات سیستم", icon: Coffee },
    { id: "security", name: "امنیت و نشست‌ها", icon: Lock },
    { id: "analytics", name: "گزارشات هوشمند", icon: BarChart2 },
  ];

  return (
    <aside className="fixed top-0 right-0 h-full w-[240px] bg-[#09090b]/95 border-l border-white/5 flex flex-col z-50">
      
      <div className="h-20 flex items-center justify-center border-b border-white/5 bg-gradient-to-l from-blue-900/10 to-transparent">
        <div className="flex items-center gap-3">
           <div className="w-10 h-10 rounded-xl bg-blue-600 flex items-center justify-center shadow-lg shadow-blue-500/20 text-white">
              <ShieldCheck size={20} />
           </div>
           <div className="flex flex-col">
             <span className="font-bold text-gray-100 text-sm">پنل مدیریت</span>
             <span className="text-[10px] text-blue-400">Super Admin</span>
           </div>
        </div>
      </div>

      <div className="flex-1 py-6 px-4 space-y-2 overflow-y-auto custom-scrollbar">
        {menuItems.map((item) => (
            <button 
              key={item.id}
              onClick={() => setActiveTab(item.id)}
              className={`
                w-full flex items-center gap-3 p-3 rounded-xl transition-all duration-200
                ${activeTab === item.id 
                  ? "bg-blue-600 text-white shadow-lg shadow-blue-600/20" 
                  : "text-gray-400 hover:bg-white/5 hover:text-gray-200"}
              `}
            >
              <item.icon size={20} />
              <span className="text-sm font-medium">{item.name}</span>
            </button>
        ))}
      </div>

      <div className="p-4 border-t border-white/5 space-y-2">
         <button 
           onClick={logout}
           className="w-full flex items-center gap-3 p-3 rounded-xl text-red-400 hover:bg-red-500/10 transition-colors"
         >
           <LogOut size={20} />
           <span className="text-sm">خروج از سیستم</span>
         </button>
      </div>
    </aside>
  );
}