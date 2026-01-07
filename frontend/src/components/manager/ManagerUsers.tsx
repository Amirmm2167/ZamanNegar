"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import api from "@/lib/api";
import SmartTable, { Column } from "@/components/ui/SmartTable";
import UserModal from "@/components/UserModal";
import { Users, Plus, Shield, ShieldAlert, User, Eye } from "lucide-react";
import { User as UserData } from "@/types"; // Ensure UserData is exported or defined

// Fallback interface if not in types
interface UserT {
    id: number;
    username: string;
    display_name: string;
    role: string;
    department_id?: number;
}

export default function ManagerUsers() {
  const [isModalOpen, setIsModalOpen] = useState(false);

  const { data: users = [], refetch } = useQuery<UserT[]>({
    queryKey: ['users'],
    queryFn: () => api.get("/users/").then(res => res.data),
  });

  const columns: Column<UserT>[] = [
    { key: "display_name", label: "نام نمایشی", sortable: true, filterable: true },
    { key: "username", label: "نام کاربری", sortable: true, filterable: true },
    { 
        key: "role", 
        label: "نقش", 
        sortable: true, 
        filterable: true,
        render: (user) => {
            const colors: any = { 
                manager: "text-emerald-400 bg-emerald-400/10 border-emerald-400/20", 
                evaluator: "text-purple-400 bg-purple-400/10 border-purple-400/20", 
                proposer: "text-blue-400 bg-blue-400/10 border-blue-400/20", 
                viewer: "text-gray-400 bg-gray-400/10 border-gray-400/20" 
            };
            const icons: any = {
                manager: ShieldAlert,
                evaluator: Shield,
                proposer: User,
                viewer: Eye
            };
            const Icon = icons[user.role] || User;
            return (
                <div className={`flex items-center gap-1.5 px-2 py-1 rounded-lg border w-fit text-xs font-medium ${colors[user.role] || colors.viewer}`}>
                    <Icon size={12} />
                    <span>{user.role}</span>
                </div>
            );
        }
    },
    { key: "department_id", label: "دپارتمان ID", sortable: true, filterable: true },
  ];

  return (
    <div className="space-y-4 h-full flex flex-col">
       <div className="flex justify-between items-center">
          <p className="text-gray-400 text-sm">لیست تمامی پرسنل و سطح دسترسی آن‌ها</p>
          <button 
            onClick={() => setIsModalOpen(true)}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl shadow-lg shadow-blue-500/20 transition-all active:scale-95 text-sm font-bold"
          >
            <Plus size={18} /> افزودن کاربر
          </button>
       </div>

       <div className="flex-1 min-h-0">
         <SmartTable 
            title="کاربران سیستم"
            data={users}
            columns={columns}
            icon={Users}
         />
       </div>

       <UserModal 
         isOpen={isModalOpen} 
         onClose={() => { setIsModalOpen(false); refetch(); }} 
       />
    </div>
  );
}