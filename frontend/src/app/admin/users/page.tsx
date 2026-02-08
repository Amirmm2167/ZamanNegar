"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import api from "@/lib/api";
import { User } from "@/types";
import { Search, Plus, User as UserIcon, Shield, MoreVertical } from "lucide-react";
import UserModal from "@/components/UserModal";
import { toPersianDigits } from "@/lib/utils";

export default function AdminUsersPage() {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  // Fetch Users (Assuming backend endpoint exists, or we add it)
  const { data: users = [], isLoading, refetch } = useQuery<User[]>({
    queryKey: ['admin', 'users'],
    queryFn: () => api.get("/users/").then(res => res.data),
  });

  const filteredUsers = users.filter(u => 
    u.username.toLowerCase().includes(searchQuery.toLowerCase()) ||
    u.display_name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="space-y-6">
      
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white mb-1">مدیریت کاربران</h1>
          <p className="text-sm text-gray-400">لیست تمامی کاربران سیستم</p>
        </div>
        <button 
          onClick={() => setIsModalOpen(true)}
          className="flex items-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-500 text-white rounded-xl font-bold transition-all shadow-lg shadow-blue-600/20"
        >
          <Plus size={18} />
          <span>کاربر جدید</span>
        </button>
      </div>

      {/* Filter Bar */}
      <div className="bg-[#1a1d24]/50 border border-white/5 rounded-2xl p-4 flex items-center gap-4 backdrop-blur-sm">
         <div className="relative flex-1 max-w-md">
            <Search className="absolute right-3 top-3 text-gray-500" size={18} />
            <input 
              type="text" 
              placeholder="جستجو بر اساس نام یا نام کاربری..." 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-[#0a0c10] border border-white/10 rounded-xl py-2.5 pr-10 pl-4 text-sm text-white focus:border-blue-500 outline-none"
            />
         </div>
      </div>

      {/* Users Table */}
      <div className="bg-[#1a1d24]/50 border border-white/5 rounded-2xl overflow-hidden backdrop-blur-sm">
        {isLoading ? (
           <div className="p-8 text-center text-gray-500">در حال بارگذاری...</div>
        ) : (
           <table className="w-full text-right">
             <thead className="bg-white/5 text-gray-400 text-xs uppercase font-medium">
               <tr>
                 <th className="px-6 py-4">کاربر</th>
                 <th className="px-6 py-4">نام کاربری</th>
                 <th className="px-6 py-4">نقش سیستمی</th>
                 <th className="px-6 py-4">وضعیت</th>
                 <th className="px-6 py-4">عملیات</th>
               </tr>
             </thead>
             <tbody className="divide-y divide-white/5">
               {filteredUsers.map((u) => (
                 <tr key={u.id} className="hover:bg-white/[0.02] transition-colors">
                   <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                         <div className="w-9 h-9 rounded-full bg-gradient-to-br from-gray-700 to-gray-800 flex items-center justify-center text-white font-bold text-sm">
                            {u.display_name.charAt(0)}
                         </div>
                         <span className="font-medium text-gray-200">{u.display_name}</span>
                      </div>
                   </td>
                   <td className="px-6 py-4 text-gray-400 dir-ltr text-right font-mono text-sm">
                      @{u.username}
                   </td>
                   <td className="px-6 py-4">
                      {u.is_superadmin ? (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-purple-500/10 text-purple-400 text-xs font-bold border border-purple-500/20">
                           <Shield size={12} />
                           مدیر ارشد
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-gray-500/10 text-gray-400 text-xs border border-gray-500/20">
                           <UserIcon size={12} />
                           کاربر عادی
                        </span>
                      )}
                   </td>
                   <td className="px-6 py-4">
                      <span className="text-xs text-emerald-400 bg-emerald-500/10 px-2 py-1 rounded border border-emerald-500/20">
                        فعال
                      </span>
                   </td>
                   <td className="px-6 py-4">
                      <button className="p-2 text-gray-500 hover:text-white transition-colors">
                         <MoreVertical size={18} />
                      </button>
                   </td>
                 </tr>
               ))}
             </tbody>
           </table>
        )}
      </div>

      <UserModal 
        isOpen={isModalOpen} 
        onClose={() => setIsModalOpen(false)}
        onSuccess={() => {
           refetch();
           setIsModalOpen(false);
        }}
      />
    </div>
  );
}