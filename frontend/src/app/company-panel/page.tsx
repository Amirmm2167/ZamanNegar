"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { LayoutDashboard, Users, Building2, PieChart } from "lucide-react";
import clsx from "clsx";
import ManagerStats from "@/components/manager/ManagerStats";
import ManagerUsers from "@/components/manager/ManagerUsers";
import ManagerDepartments from "@/components/manager/ManagerDepartments";

export default function CompanyPanelPage() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<"stats" | "staff" | "depts">("stats");
  const [isAuthorized, setIsAuthorized] = useState(false);

  useEffect(() => {
    // Role Protection
    const role = localStorage.getItem("role");
    if (!role || (role !== "manager" && role !== "superadmin")) {
      router.push("/"); // Redirect unauthorized
    } else {
      setIsAuthorized(true);
    }
  }, [router]);

  if (!isAuthorized) return null;

  return (
    <div className="flex flex-col h-screen bg-[#09090b] text-gray-100 p-4 md:p-8 overflow-hidden">
      
      {/* Header */}
      <div className="flex items-center gap-3 mb-8 shrink-0">
        <div className="p-3 bg-gradient-to-tr from-blue-600 to-cyan-500 rounded-2xl shadow-lg shadow-blue-500/20">
            <LayoutDashboard size={24} className="text-white" />
        </div>
        <div>
            <h1 className="text-2xl font-bold text-white">پنل مدیریت شرکت</h1>
            <p className="text-sm text-gray-400">مدیریت یکپارچه منابع و رویدادها</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-2 mb-6 border-b border-white/10 shrink-0 overflow-x-auto custom-scrollbar pb-1">
        {[
            { id: "stats", label: "داشبورد وضعیت", icon: PieChart },
            { id: "staff", label: "مدیریت پرسنل", icon: Users },
            { id: "depts", label: "دپارتمان‌ها", icon: Building2 },
        ].map((tab) => (
            <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={clsx(
                    "flex items-center gap-2 px-5 py-3 rounded-t-xl text-sm font-bold transition-all border-b-2",
                    activeTab === tab.id 
                        ? "text-blue-400 bg-blue-500/10 border-blue-500" 
                        : "text-gray-400 hover:text-white hover:bg-white/5 border-transparent"
                )}
            >
                <tab.icon size={18} />
                <span className="whitespace-nowrap">{tab.label}</span>
            </button>
        ))}
      </div>

      {/* Content Area */}
      <div className="flex-1 min-h-0 overflow-y-auto custom-scrollbar pb-10">
         {activeTab === 'stats' && <ManagerStats />}
         {activeTab === 'staff' && <ManagerUsers />}
         {activeTab === 'depts' && <ManagerDepartments />}
      </div>
    </div>
  );
}