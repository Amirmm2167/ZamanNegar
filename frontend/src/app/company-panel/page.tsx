"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useAuthStore } from "@/stores/authStore";
import { 
  LayoutDashboard, 
  Users, 
  PieChart, 
  CheckSquare
} from "lucide-react";
import clsx from "clsx";

// Components
import ManagerStats from "@/components/manager/ManagerStats";
import ManagerOrganization from "@/components/manager/ManagerOrganization"; // <--- NEW COMPONENT
import ApprovalQueue from "@/components/evaluator/ApprovalQueue";

type TabId = "approvals" | "stats" | "org";

export default function CompanyPanelPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  
  const { currentRole, activeCompanyId, user } = useAuthStore();
  const [isAuthorized, setIsAuthorized] = useState(false);
  const [userRole, setUserRole] = useState<string>("");

  const activeTab = (searchParams.get("tab") as TabId) || "approvals";

  useEffect(() => {
    if (!user) {
      router.push("/login");
      return;
    }

    const role = currentRole(); 
    
    if (role !== "manager" && !user.is_superadmin) {
      console.warn("Unauthorized access attempt to Manager Hub");
      router.push("/"); 
    } else {
      setUserRole(role || "");
      setIsAuthorized(true);
    }
  }, [user, currentRole, router, activeCompanyId]);

  const handleTabChange = (id: TabId) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set("tab", id);
    router.replace(`?${params.toString()}`);
  };

  if (!isAuthorized) return null;

  // Simplified Tabs Configuration
  const tabs = [
    { 
      id: "approvals", 
      label: "کارتابل", 
      icon: CheckSquare,
      badge: null 
    },
    { 
      id: "stats", 
      label: "داشبورد", 
      icon: PieChart 
    },
    // Unified Organization Tab
    { 
      id: "org", 
      label: "مدیریت سازمان", 
      icon: Users 
    },
  ];

  return (
    <div className="flex flex-col h-screen bg-[#09090b] text-gray-100 p-4 md:p-8 overflow-hidden">
      
      {/* Header */}
      <div className="flex items-center gap-4 mb-6 shrink-0 animate-in slide-in-from-top-4 duration-500">
        <div className="p-3.5 bg-gradient-to-tr from-blue-600 to-indigo-600 rounded-2xl shadow-lg shadow-blue-500/20">
            <LayoutDashboard size={28} className="text-white" />
        </div>
        <div>
            <h1 className="text-2xl font-black text-white tracking-tight">پنل مدیریت یکپارچه</h1>
            <p className="text-sm text-gray-400 font-medium">مرکز کنترل منابع و رویدادهای سازمان</p>
        </div>
      </div>

      {/* Tabs Navigation */}
      <div className="flex items-center gap-2 mb-6 border-b border-white/10 shrink-0 overflow-x-auto custom-scrollbar pb-0.5">
        {tabs.map((tab) => (
            <button
                key={tab.id}
                onClick={() => handleTabChange(tab.id as TabId)}
                className={clsx(
                    "relative flex items-center gap-2 px-5 py-3.5 rounded-t-xl text-sm font-bold transition-all duration-200 border-b-2",
                    activeTab === tab.id 
                        ? "text-blue-400 bg-gradient-to-t from-blue-500/10 to-transparent border-blue-500" 
                        : "text-gray-400 hover:text-white hover:bg-white/5 border-transparent"
                )}
            >
                <tab.icon size={18} className={activeTab === tab.id ? "text-blue-400" : "text-gray-500"} />
                <span className="whitespace-nowrap">{tab.label}</span>
                
                {tab.id === 'approvals' && (
                   <span className="hidden w-2 h-2 bg-red-500 rounded-full animate-pulse" />
                )}
            </button>
        ))}
      </div>

      {/* Content Area */}
      <div className="flex-1 min-h-0 relative overflow-hidden bg-[#12141a] rounded-2xl border border-white/5 shadow-2xl">
         <div className="absolute inset-0 overflow-y-auto custom-scrollbar"> 
            {/* Removed p-6 padding here so ManagerOrganization fits flush */}
            
            {activeTab === 'approvals' && (
              <div className="p-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
                <ApprovalQueue userRole={userRole} />
              </div>
            )}

            {activeTab === 'stats' && (
              <div className="p-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
                <ManagerStats />
              </div>
            )}

            {activeTab === 'org' && (
               <div className="h-full animate-in fade-in slide-in-from-bottom-2 duration-300">
                 {/* This component handles its own layout/padding internally now */}
                 <ManagerOrganization />
               </div>
            )}
         </div>
      </div>
    </div>
  );
}