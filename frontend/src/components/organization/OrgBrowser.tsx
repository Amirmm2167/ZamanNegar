"use client";

import { useState } from "react";
import { FolderTree, Plus } from "lucide-react";
import OrgTree from "./OrgTree";
import DepartmentInspector from "./DepartmentInspector";
import api from "@/lib/api";

interface OrgBrowserProps {
  companyId: number;
  departments: any[];
  onRefresh: () => void;
}

export default function OrgBrowser({ companyId, departments, onRefresh }: OrgBrowserProps) {
  const [selectedDeptId, setSelectedDeptId] = useState<number | null>(null);

  const handleCreateRoot = async () => {
      const name = prompt("نام دپارتمان اصلی:");
      if(!name) return;
      try {
          await api.post("/departments/", { name, company_id: companyId });
          onRefresh();
      } catch(e) { alert("Error"); }
  };

  return (
    <div className="flex h-[600px] border border-white/10 rounded-2xl overflow-hidden bg-[#0a0a0a]">
      
      {/* LEFT: Tree View */}
      <div className="w-1/3 min-w-[250px] border-l border-white/10 flex flex-col bg-[#121214]">
        <div className="p-4 border-b border-white/5 flex justify-between items-center bg-white/[0.02]">
           <span className="text-xs font-bold text-gray-400 flex items-center gap-2 uppercase tracking-wider">
             <FolderTree size={14}/> ساختار سازمانی
           </span>
           <button 
             onClick={handleCreateRoot}
             className="text-[10px] bg-blue-600/10 text-blue-400 px-2 py-1 rounded-md hover:bg-blue-600/20 transition-colors flex items-center gap-1"
           >
             <Plus size={12}/> ریشه جدید
           </button>
        </div>
        <div className="flex-1 overflow-y-auto custom-scrollbar p-3">
           {departments.length === 0 ? (
               <div className="text-center text-gray-600 text-xs mt-10">هیچ دپارتمانی تعریف نشده است</div>
           ) : (
               <OrgTree 
                  departments={departments} 
                  selectedId={selectedDeptId} 
                  onSelect={setSelectedDeptId} 
               />
           )}
        </div>
      </div>

      {/* RIGHT: Inspector */}
      <div className="flex-1 bg-[#09090b] relative">
         {selectedDeptId ? (
            <DepartmentInspector 
               departmentId={selectedDeptId} 
               companyId={companyId}
               onRefresh={onRefresh}
            />
         ) : (
            <div className="absolute inset-0 flex flex-col items-center justify-center text-gray-600/50 pointer-events-none select-none">
               <div className="w-20 h-20 bg-white/5 rounded-3xl flex items-center justify-center mb-4">
                   <FolderTree size={40} className="opacity-50"/>
               </div>
               <p className="text-sm font-medium">یک دپارتمان را برای مدیریت انتخاب کنید</p>
            </div>
         )}
      </div>
    </div>
  );
}