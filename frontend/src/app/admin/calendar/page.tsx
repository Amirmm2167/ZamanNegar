"use client";

import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import api from "@/lib/api";
import CalendarGrid from "@/components/CalendarGrid";
import { useAuthStore } from "@/stores/authStore";
import { Building2, ChevronDown } from "lucide-react";

export default function AdminCalendarPage() {
  const { switchCompany, activeCompanyId } = useAuthStore();
  const [selectedCompany, setSelectedCompany] = useState<number | null>(activeCompanyId);

  const { data: companies = [] } = useQuery<any[]>({
    queryKey: ['admin', 'companies'],
    queryFn: () => api.get("/superadmin/companies").then(res => res.data),
  });

  const handleCompanyChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const id = Number(e.target.value);
    setSelectedCompany(id);
    switchCompany(id); // Sets the global context for the Grid
  };

  return (
    <div className="h-[calc(100vh-60px)] flex flex-col">
      <div className="flex items-center justify-between mb-4 shrink-0">
        <div>
          <h1 className="text-2xl font-bold text-white mb-1">تقویم سازمانی</h1>
          <p className="text-sm text-gray-400">مشاهده و مدیریت رویدادهای شرکت‌ها</p>
        </div>
        
        {/* Company Selector */}
        <div className="relative w-64">
           <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none text-gray-500">
              <Building2 size={16} />
           </div>
           <select 
             value={selectedCompany || ""} 
             onChange={handleCompanyChange}
             className="w-full appearance-none bg-[#1a1d24] border border-white/10 rounded-xl py-2.5 pr-10 pl-4 text-white focus:border-blue-500 outline-none text-sm"
           >
              <option value="" disabled>انتخاب سازمان...</option>
              {companies.map(c => (
                 <option key={c.id} value={c.id}>{c.name}</option>
              ))}
           </select>
           <ChevronDown size={14} className="absolute left-3 top-3.5 text-gray-500 pointer-events-none" />
        </div>
      </div>

      <div className="flex-1 bg-[#0a0c10] border border-white/5 rounded-2xl overflow-hidden relative">
         {selectedCompany ? (
            <CalendarGrid />
         ) : (
            <div className="absolute inset-0 flex flex-col items-center justify-center text-gray-500">
               <Building2 size={48} className="mb-4 opacity-20" />
               <p>لطفا برای مشاهده تقویم، یک سازمان را انتخاب کنید</p>
            </div>
         )}
      </div>
    </div>
  );
}