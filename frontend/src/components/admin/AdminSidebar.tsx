"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { 
  Users, 
  Building2, 
  BarChart2, 
  ShieldCheck, 
  LogOut, 
  LayoutDashboard,
  Calendar,
  Coffee
} from "lucide-react";
import { useAuthStore } from "@/stores/authStore";

export default function AdminSidebar() {
  const pathname = usePathname();
  const { logout } = useAuthStore();

  const menuItems = [
    { name: "داشبورد", icon: LayoutDashboard, href: "/admin" },
    { name: "تقویم سازمانی", icon: Calendar, href: "/admin/calendar" },
    { name: "مدیریت کاربران", icon: Users, href: "/admin/users" },
    { name: "سازمان‌ها", icon: Building2, href: "/admin/companies" },
    { name: "تعطیلات سراسری", icon: Coffee, href: "/admin/holidays" },
    { name: "گزارشات سیستم", icon: BarChart2, href: "/admin/analytics" },
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
        {menuItems.map((item) => {
          const isActive = pathname === item.href;
          return (
            <Link 
              key={item.href}
              href={item.href}
              className={`
                flex items-center gap-3 p-3 rounded-xl transition-all duration-200
                ${isActive 
                  ? "bg-blue-600 text-white shadow-lg shadow-blue-600/20" 
                  : "text-gray-400 hover:bg-white/5 hover:text-gray-200"}
              `}
            >
              <item.icon size={20} />
              <span className="text-sm font-medium">{item.name}</span>
            </Link>
          );
        })}
      </div>

      <div className="p-4 border-t border-white/5 space-y-2">
         <Link href="/" className="flex items-center gap-3 p-3 rounded-xl text-gray-400 hover:bg-white/5 transition-colors">
            <Calendar size={20} />
            <span className="text-sm">بازگشت به تقویم</span>
         </Link>
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