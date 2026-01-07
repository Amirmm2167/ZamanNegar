"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import api from "@/lib/api";
import SmartTable, { Column } from "@/components/ui/SmartTable";
import DepartmentModal from "@/components/DepartmentModal";
import { Building2, Plus } from "lucide-react";
import { Department } from "@/types";

export default function ManagerDepartments() {
  const [isModalOpen, setIsModalOpen] = useState(false);

  const { data: departments = [], refetch } = useQuery<Department[]>({
    queryKey: ['departments'],
    queryFn: () => api.get("/departments/").then(res => res.data),
  });

  const columns: Column<Department>[] = [
    { 
        key: "name", 
        label: "نام دپارتمان", 
        sortable: true, 
        filterable: true,
        render: (dept) => (
            <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full shadow-sm" style={{ backgroundColor: dept.color }} />
                <span>{dept.name}</span>
            </div>
        )
    },
    { 
        key: "parent_id", 
        label: "والد", 
        sortable: true, 
        render: (dept) => {
            const parent = departments.find(d => d.id === dept.parent_id);
            return parent ? <span className="text-gray-400">{parent.name}</span> : <span className="opacity-30">-</span>;
        }
    },
    { key: "id", label: "شناسه", width: "w-16", sortable: true },
  ];

  return (
    <div className="space-y-4 h-full flex flex-col">
       <div className="flex justify-between items-center">
          <p className="text-gray-400 text-sm">مدیریت ساختار سازمانی و واحدها</p>
          <button 
            onClick={() => setIsModalOpen(true)}
            className="flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl shadow-lg shadow-emerald-500/20 transition-all active:scale-95 text-sm font-bold"
          >
            <Plus size={18} /> افزودن دپارتمان
          </button>
       </div>

       <div className="flex-1 min-h-0">
         <SmartTable 
            title="دپارتمان‌ها"
            data={departments}
            columns={columns}
            icon={Building2}
         />
       </div>

       <DepartmentModal 
         isOpen={isModalOpen} 
         onClose={() => { setIsModalOpen(false); refetch(); }} 
       />
    </div>
  );
}