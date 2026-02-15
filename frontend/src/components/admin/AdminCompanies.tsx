"use client";

import { useState, useEffect } from "react";
import api from "@/lib/api";
import { Search, Plus, Building, Users, Calendar, ArrowUpRight, Loader2 } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import CompanySettingsModal from "./CompanySettingsModal"; 
import clsx from "clsx";

interface CompanyStats {
  id: number;
  name: string;
  user_count: number;
  department_count: number;
  event_stats: {
    approved: number;
    pending: number;
    rejected: number;
  };
}

export default function AdminCompanies() {
  const [search, setSearch] = useState("");
  const [selectedCompanyId, setSelectedCompanyId] = useState<number | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  // 1. Fetch Aggregated Stats
  const { data: companies = [], isLoading, refetch, isError } = useQuery<CompanyStats[]>({
    queryKey: ['admin', 'companies-stats'],
    queryFn: async () => {
      // FIX: Ensure correct path (assuming companies router has prefix)
      // Also handle potential 404s gracefully
      try {
        const res = await api.get("/companies/superadmin/stats");
        return Array.isArray(res.data) ? res.data : [];
      } catch (e) {
        console.error("Failed to fetch company stats", e);
        return [];
      }
    }
  });

  // FIX: Safety check before filtering
  const safeCompanies = Array.isArray(companies) ? companies : [];
  
  const filtered = safeCompanies.filter(c => 
    c.name?.toLowerCase().includes(search.toLowerCase())
  );

  const handleCreate = async () => {
     const name = prompt("نام سازمان جدید:");
     if (!name) return;
     try {
        await api.post("/companies/", { name }); // Adjusted path
        refetch();
     } catch(e) { 
       alert("خطا در ایجاد سازمان"); 
     }
  };

  const openSettings = (id: number) => {
      setSelectedCompanyId(id);
      setIsModalOpen(true);
  };

  return (
    <div className="space-y-8 p-4 md:p-0">
      
      {/* Header & Actions */}
      <div className="flex flex-col md:flex-row justify-between items-end gap-4">
         <div>
            <h1 className="text-3xl font-black text-white tracking-tight mb-2">سازمان‌ها</h1>
            <p className="text-gray-400 text-sm">مدیریت ساختار، کاربران و منابع سازمانی</p>
         </div>
         <button 
            onClick={handleCreate}
            className="bg-blue-600 hover:bg-blue-500 text-white px-5 py-3 rounded-xl font-bold flex items-center gap-2 shadow-lg shadow-blue-600/20 transition-all"
         >
            <Plus size={20} />
            سازمان جدید
         </button>
      </div>

      {/* Search */}
      <div className="relative max-w-md">
         <Search className="absolute right-4 top-3.5 text-gray-500" size={20} />
         <input 
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="جستجو در سازمان‌ها..."
            className="w-full bg-[#18181b] border border-white/10 rounded-2xl py-3 pr-12 pl-4 text-white focus:border-blue-500 outline-none transition-colors"
         />
      </div>

      {/* Grid */}
      {isLoading ? (
         <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1,2,3].map(i => <div key={i} className="h-48 bg-[#18181b] rounded-3xl animate-pulse" />)}
         </div>
      ) : isError || safeCompanies.length === 0 ? (
         <div className="text-center py-20 bg-[#18181b] rounded-3xl border border-dashed border-white/10">
            <Building className="mx-auto text-gray-600 mb-4" size={48} />
            <p className="text-gray-400">سازمانی یافت نشد یا خطایی رخ داده است.</p>
         </div>
      ) : (
         <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filtered.map(comp => (
               <div 
                  key={comp.id} 
                  className="group bg-[#18181b] border border-white/5 rounded-3xl p-6 relative overflow-hidden hover:border-white/10 transition-all hover:shadow-2xl hover:shadow-blue-900/10 cursor-pointer"
                  onClick={() => openSettings(comp.id)}
               >
                  {/* Decorative Gradient */}
                  <div className="absolute top-0 right-0 w-32 h-32 bg-blue-600/5 rounded-bl-full -mr-10 -mt-10 group-hover:bg-blue-600/10 transition-colors" />

                  {/* Header */}
                  <div className="flex justify-between items-start mb-6">
                     <div className="w-12 h-12 bg-gray-800 rounded-2xl flex items-center justify-center text-gray-300 group-hover:text-white group-hover:bg-blue-600 transition-all">
                        <Building size={24} />
                     </div>
                     <button className="p-2 bg-white/5 rounded-full text-gray-400 hover:text-white opacity-0 group-hover:opacity-100 transition-all">
                        <ArrowUpRight size={20} />
                     </button>
                  </div>

                  {/* Title */}
                  <h3 className="text-xl font-bold text-white mb-1 group-hover:text-blue-400 transition-colors">{comp.name}</h3>
                  <p className="text-xs text-gray-500 font-mono mb-6">ID: {comp.id}</p>

                  {/* Metrics */}
                  <div className="grid grid-cols-3 gap-2 border-t border-white/5 pt-4">
                     <MetricItem icon={Users} label="کاربر" value={comp.user_count} />
                     <MetricItem icon={Building} label="دپارتمان" value={comp.department_count} />
                     <MetricItem icon={Calendar} label="رویداد" value={(comp.event_stats?.approved || 0) + (comp.event_stats?.pending || 0)} />
                  </div>

                  {/* Event Status Bar */}
                  <div className="mt-4 flex h-1.5 rounded-full overflow-hidden bg-gray-800">
                     <div style={{ flex: comp.event_stats?.approved || 0 }} className="bg-emerald-500" />
                     <div style={{ flex: comp.event_stats?.pending || 0 }} className="bg-amber-500" />
                     <div style={{ flex: comp.event_stats?.rejected || 0 }} className="bg-red-500" />
                  </div>
                  <div className="flex justify-between text-[10px] text-gray-500 mt-1">
                     <span>{comp.event_stats?.approved || 0} تایید</span>
                     <span>{comp.event_stats?.pending || 0} در انتظار</span>
                  </div>
               </div>
            ))}
         </div>
      )}

      {/* Settings Modal */}
      <CompanySettingsModal 
         isOpen={isModalOpen}
         onClose={() => setIsModalOpen(false)}
         companyId={selectedCompanyId}
      />
    </div>
  );
}

function MetricItem({ icon: Icon, label, value }: any) {
    return (
        <div className="flex flex-col items-center gap-1">
            <span className="text-xs text-gray-500 flex items-center gap-1">
                <Icon size={12} /> {label}
            </span>
            <span className="font-bold text-white text-lg">{value}</span>
        </div>
    );
}