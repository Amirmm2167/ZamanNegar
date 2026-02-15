"use client";

import { useState, useEffect } from "react";
import { Users, Building, RefreshCw, UserPlus, Loader2 } from "lucide-react";
import api from "@/lib/api";
import clsx from "clsx";
import { motion, AnimatePresence } from "framer-motion";

// Reuse the robust modules we built for Admin
import OrgBrowser from "@/components/organization/OrgBrowser";
import UserList from "@/components/roster/UserList";
import UserDrawer from "@/components/roster/UserDrawer";
import QuickInviteModal from "@/components/roster/QuickInviteModal";

export default function ManagerOrganization() {
  const [activeTab, setActiveTab] = useState<'users' | 'depts'>('users');
  const [loading, setLoading] = useState(true);
  
  // Data State
  const [companyId, setCompanyId] = useState<number | null>(null);
  const [companyName, setCompanyName] = useState("");
  const [roster, setRoster] = useState<any[]>([]);
  const [departments, setDepartments] = useState<any[]>([]);
  
  // UI State
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [selectedUser, setSelectedUser] = useState<any>(null);

  // 1. Initial Load: Find the Manager's Company
  useEffect(() => {
    async function init() {
      try {
        // Fetch companies the user belongs to
        const res = await api.get("/companies/me");
        if (res.data && res.data.length > 0) {
          // Default to the first company for now
          // (Future: ContextRail can switch this ID)
          const target = res.data[0];
          setCompanyId(target.id);
          setCompanyName(target.name);
        }
      } catch (e) {
        console.error("Failed to fetch context");
      }
    }
    init();
  }, []);

  // 2. Fetch Data when CompanyID is set
  useEffect(() => {
    if (companyId) refreshData();
  }, [companyId]);

  const refreshData = async () => {
    if (!companyId) return;
    setLoading(true);
    try {
      const [usersRes, deptsRes] = await Promise.all([
        api.get(`/companies/${companyId}/users`),
        api.get(`/departments/?company_id=${companyId}`),
      ]);
      setRoster(usersRes.data);
      setDepartments(deptsRes.data);
    } catch (e) {
      console.error("Failed to load organization data");
    } finally {
      setLoading(false);
    }
  };

  const handleRemoveUser = async (userId: number) => {
      if(!confirm("آیا از حذف این کاربر از سازمان اطمینان دارید؟")) return;
      try {
          // DELETE /users/{id} handles removing from company context
          await api.delete(`/users/${userId}`);
          setSelectedUser(null);
          refreshData();
      } catch(e) {
          alert("خطا در حذف کاربر");
      }
  };

  if (!companyId && !loading) {
      return (
          <div className="flex h-full items-center justify-center text-gray-500">
              <div className="text-center">
                  <Building size={48} className="mx-auto mb-4 opacity-20"/>
                  <p>شما مدیریت هیچ سازمانی را بر عهده ندارید.</p>
              </div>
          </div>
      );
  }

  return (
    <div className="flex flex-col h-full bg-[#050505] overflow-hidden">
        
        {/* Header Section */}
        <div className="flex items-center justify-between px-8 py-6 border-b border-white/5 bg-[#09090b]">
            <div>
                <h1 className="text-2xl font-black text-white tracking-tight flex items-center gap-3">
                    <Building className="text-blue-500" size={28} />
                    {companyName || "سازمان من"}
                </h1>
                <p className="text-sm text-gray-500 mt-1 font-medium">مدیریت ساختار و اعضای سازمان</p>
            </div>
            
            <div className="flex items-center bg-[#121214] p-1 rounded-xl border border-white/5">
                <TabButton 
                    active={activeTab === 'users'} 
                    onClick={() => setActiveTab('users')} 
                    icon={Users} 
                    label="اعضا" 
                />
                <div className="w-px h-4 bg-white/5 mx-1" />
                <TabButton 
                    active={activeTab === 'depts'} 
                    onClick={() => setActiveTab('depts')} 
                    icon={Building} 
                    label="دپارتمان‌ها" 
                />
            </div>
        </div>

        {/* Content Area */}
        <div className="flex-1 p-6 overflow-hidden relative">
            {loading ? (
                <div className="absolute inset-0 flex items-center justify-center">
                    <Loader2 className="animate-spin text-blue-500" size={32} />
                </div>
            ) : (
                <AnimatePresence mode="wait">
                    <motion.div 
                        key={activeTab}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -10 }}
                        transition={{ duration: 0.2 }}
                        className="h-full"
                    >
                        {activeTab === 'users' ? (
                            <div className="h-full flex flex-col">
                                <div className="flex justify-between items-center mb-4">
                                    <div className="flex items-center gap-2 text-sm text-gray-400">
                                        <span className="font-bold text-white text-lg">{roster.length}</span> عضو فعال
                                    </div>
                                    <div className="flex gap-2">
                                        <button 
                                            onClick={refreshData} 
                                            className="p-2.5 text-gray-400 hover:text-white hover:bg-white/5 rounded-xl transition-colors"
                                        >
                                            <RefreshCw size={20} />
                                        </button>
                                        <button 
                                            onClick={() => setShowInviteModal(true)}
                                            className="bg-blue-600 hover:bg-blue-500 text-white px-5 py-2.5 rounded-xl font-bold flex items-center gap-2 shadow-lg shadow-blue-900/20 transition-all hover:scale-105"
                                        >
                                            <UserPlus size={18}/> افزودن عضو
                                        </button>
                                    </div>
                                </div>

                                <div className="flex-1 bg-[#0a0a0a] border border-white/10 rounded-2xl overflow-hidden relative">
                                    <UserList users={roster} onSelectUser={setSelectedUser} />
                                    
                                    {/* Using the same Drawer as Admin */}
                                    <UserDrawer 
                                        user={selectedUser} 
                                        onClose={() => setSelectedUser(null)} 
                                        departments={departments}
                                        onRefresh={refreshData}
                                        // Pass specific actions for Manager if needed
                                        onRemove={() => handleRemoveUser(selectedUser?.id)}
                                    />
                                </div>
                            </div>
                        ) : (
                            <div className="h-full flex flex-col">
                                <div className="flex justify-end mb-4">
                                    <button 
                                        onClick={refreshData} 
                                        className="p-2.5 text-gray-400 hover:text-white hover:bg-white/5 rounded-xl transition-colors"
                                    >
                                        <RefreshCw size={20} />
                                    </button>
                                </div>
                                <OrgBrowser 
                                    companyId={companyId!} 
                                    departments={departments} 
                                    onRefresh={refreshData} 
                                />
                            </div>
                        )}
                    </motion.div>
                </AnimatePresence>
            )}
        </div>

        {/* Modals */}
        {showInviteModal && companyId && (
            <QuickInviteModal 
                isOpen={true}
                onClose={() => setShowInviteModal(false)}
                companyId={companyId}
                onSuccess={refreshData}
            />
        )}
    </div>
  );
}

function TabButton({ active, onClick, icon: Icon, label }: any) {
    return (
        <button 
            onClick={onClick}
            className={clsx(
                "flex items-center gap-2 px-4 py-2 rounded-lg transition-all text-sm font-bold",
                active ? "bg-white/10 text-white shadow-sm" : "text-gray-500 hover:text-gray-300 hover:bg-white/5"
            )}
        >
            <Icon size={16} className={clsx(active ? "text-blue-400" : "text-gray-500")} /> 
            {label}
        </button>
    );
}