"use client";

import { useEffect, useState } from "react";
import { Users, MoreHorizontal, Settings, Trash2, UserPlus, CornerDownLeft } from "lucide-react";
import api from "@/lib/api";
import clsx from "clsx";

export default function DepartmentInspector({ departmentId, companyId, onRefresh }: any) {
  const [details, setDetails] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
     if(departmentId) load();
  }, [departmentId]);

  const load = async () => {
      setLoading(true);
      try {
          // You might need a new endpoint /departments/{id}/stats or similar
          // For now we simulate or fetch simple list
          const res = await api.get(`/departments/${departmentId}`); // Expecting details + users list
          setDetails(res.data); // Backend needs to return { ...dept, users: [] }
      } catch(e) {}
      finally { setLoading(false); }
  };

  if (loading) return <div className="h-full flex items-center justify-center"><div className="animate-spin w-6 h-6 border-2 border-white/20 border-t-blue-500 rounded-full"/></div>;
  if (!details) return null;

  return (
    <div className="flex flex-col h-full animate-in fade-in slide-in-from-right-4 duration-300">
        
        {/* Header */}
        <div className="h-20 border-b border-white/5 px-8 flex justify-between items-center bg-[#09090b]">
            <div>
                <h2 className="text-xl font-black text-white">{details.name}</h2>
                <p className="text-xs text-gray-500 font-mono mt-1">ID: {details.id}</p>
            </div>
            <div className="flex gap-2">
                <button className="p-2 hover:bg-white/5 rounded-xl text-gray-400 hover:text-white transition-colors"><Settings size={18}/></button>
                <button className="p-2 hover:bg-red-500/10 rounded-xl text-gray-400 hover:text-red-400 transition-colors"><Trash2 size={18}/></button>
            </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-3 gap-4 p-8 pb-4">
            <StatCard label="اعضا" value={details.users?.length || 0} icon={Users} />
            <StatCard label="زیرمجموعه" value={0} icon={CornerDownLeft} /> {/* Placeholder */}
            {/* Add more stats */}
        </div>

        {/* Members List */}
        <div className="flex-1 px-8 py-4 overflow-hidden flex flex-col">
            <div className="flex justify-between items-end mb-4">
                <h3 className="font-bold text-gray-300 text-sm">اعضای این دپارتمان</h3>
                <button className="text-xs text-blue-400 hover:text-blue-300 flex items-center gap-1">
                    <UserPlus size={14} /> افزودن عضو
                </button>
            </div>
            
            <div className="flex-1 bg-[#121214] border border-white/5 rounded-2xl overflow-y-auto custom-scrollbar p-2 space-y-1">
                {details.users?.map((u: any) => (
                    <div key={u.id} className="flex items-center justify-between p-3 hover:bg-white/5 rounded-xl group transition-colors cursor-default">
                        <div className="flex items-center gap-3">
                            <div className="w-8 h-8 bg-gray-800 rounded-full flex items-center justify-center text-xs text-gray-300">{u.display_name?.[0]}</div>
                            <span className="text-sm text-gray-200">{u.display_name}</span>
                        </div>
                        <span className="text-[10px] text-gray-500 font-mono">{u.role}</span>
                    </div>
                ))}
                {(!details.users || details.users.length === 0) && (
                    <div className="text-center text-gray-600 text-xs py-10">بدون عضو</div>
                )}
            </div>
        </div>
    </div>
  );
}

function StatCard({ label, value, icon: Icon }: any) {
    return (
        <div className="bg-[#121214] border border-white/5 rounded-xl p-4 flex flex-col items-center justify-center gap-2">
            <Icon size={16} className="text-gray-500 mb-1"/>
            <span className="text-2xl font-bold text-white">{value}</span>
            <span className="text-[10px] text-gray-500 uppercase tracking-wider">{label}</span>
        </div>
    )
}