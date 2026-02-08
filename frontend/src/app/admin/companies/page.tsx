"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import api from "@/lib/api";
import { Plus, Search, Building2, ExternalLink } from "lucide-react";
import CompanyModal from "@/components/CompanyModal";

export default function AdminCompaniesPage() {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  const { data: companies = [], refetch } = useQuery<any[]>({
    queryKey: ['admin', 'companies'],
    queryFn: () => api.get("/superadmin/companies").then(res => res.data),
  });

  const filtered = companies.filter(c => c.name.toLowerCase().includes(searchQuery.toLowerCase()));

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white mb-1">مدیریت سازمان‌ها</h1>
          <p className="text-sm text-gray-400">تعریف و ویرایش شرکت‌های زیرمجموعه</p>
        </div>
        <button 
          onClick={() => setIsModalOpen(true)}
          className="flex items-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-500 text-white rounded-xl font-bold transition-all shadow-lg"
        >
          <Plus size={18} />
          <span>سازمان جدید</span>
        </button>
      </div>

      <div className="bg-[#1a1d24]/50 border border-white/5 rounded-2xl p-4 backdrop-blur-sm">
         <div className="relative max-w-md">
            <Search className="absolute right-3 top-3 text-gray-500" size={18} />
            <input 
              type="text" 
              placeholder="جستجو نام سازمان..." 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-[#0a0c10] border border-white/10 rounded-xl py-2.5 pr-10 pl-4 text-sm text-white focus:border-blue-500 outline-none"
            />
         </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
         {filtered.map(company => (
            <div key={company.id} className="p-5 bg-[#1a1d24]/50 border border-white/5 rounded-2xl hover:border-blue-500/30 transition-all group">
               <div className="flex items-start justify-between mb-4">
                  <div className="w-12 h-12 rounded-xl bg-blue-600/10 flex items-center justify-center text-blue-400 group-hover:bg-blue-600 group-hover:text-white transition-colors">
                     <Building2 size={24} />
                  </div>
                  <button className="text-gray-500 hover:text-white">
                     <ExternalLink size={18} />
                  </button>
               </div>
               <h3 className="text-lg font-bold text-white mb-1">{company.name}</h3>
               <p className="text-xs text-gray-500">شناسه: {company.id}</p>
            </div>
         ))}
      </div>

      <CompanyModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} onSuccess={() => { refetch(); setIsModalOpen(false); }} />
    </div>
  );
}