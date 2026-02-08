"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import api from "@/lib/api";
import { Plus, Calendar, Trash2 } from "lucide-react";
import HolidayModal from "@/components/HolidayModal";
import { toPersianDigits } from "@/lib/utils";

export default function AdminHolidaysPage() {
  const [isModalOpen, setIsModalOpen] = useState(false);

  const { data: holidays = [], refetch } = useQuery<any[]>({
    queryKey: ['admin', 'holidays'],
    queryFn: () => api.get("/superadmin/holidays").then(res => res.data),
  });

  const handleDelete = async (id: number) => {
     if(confirm('حذف شود؟')) {
        await api.delete(`/superadmin/holidays/${id}`);
        refetch();
     }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white mb-1">تعطیلات سراسری</h1>
          <p className="text-sm text-gray-400">تقویم تعطیلات رسمی سیستم</p>
        </div>
        <button onClick={() => setIsModalOpen(true)} className="flex items-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-500 text-white rounded-xl font-bold transition-all shadow-lg">
          <Plus size={18} /> <span>افزودن تعطیلی</span>
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
         {holidays.map(h => (
            <div key={h.id} className="p-4 bg-[#1a1d24]/50 border border-white/5 rounded-xl flex items-center justify-between group hover:border-red-500/30 transition-colors">
               <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-red-500/10 flex items-center justify-center text-red-400">
                     <Calendar size={20} />
                  </div>
                  <div>
                     <div className="font-bold text-gray-200">{h.occasion}</div>
                     <div className="text-xs text-gray-500 dir-ltr text-right">{new Date(h.holiday_date).toLocaleDateString('fa-IR')}</div>
                  </div>
               </div>
               <button onClick={() => handleDelete(h.id)} className="p-2 text-gray-600 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-opacity">
                  <Trash2 size={18} />
               </button>
            </div>
         ))}
      </div>

      <HolidayModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} onSuccess={() => { refetch(); setIsModalOpen(false); }} />
    </div>
  );
}