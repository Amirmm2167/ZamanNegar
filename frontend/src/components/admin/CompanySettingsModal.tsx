"use client";

import { useState, useEffect } from "react";
import { Save, Building, Users, Calendar, Settings, Trash2, RefreshCw, UserPlus } from "lucide-react";
import api from "@/lib/api";
import clsx from "clsx";
import { motion, AnimatePresence } from "framer-motion";
import ModalWrapper from "@/components/ui/ModalWrapper";

// --- NEW MODULES ---
import OrgBrowser from "@/components/organization/OrgBrowser";
import UserList from "@/components/roster/UserList";
import UserDrawer from "@/components/roster/UserDrawer";
import QuickInviteModal from "@/components/roster/QuickInviteModal";

interface CompanyModalProps {
  companyId: number | null;
  isOpen: boolean;
  onClose: () => void;
  onRefresh: () => void;
}

export default function CompanySettingsModal({ companyId, isOpen, onClose, onRefresh }: CompanyModalProps) {
  const [activeTab, setActiveTab] = useState<'general' | 'depts' | 'users' | 'events'>('users');
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<any>(null);
  
  // UI States for Roster Management
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [selectedUser, setSelectedUser] = useState<any>(null);

  useEffect(() => {
    if (companyId && isOpen) fetchDetails();
  }, [companyId, isOpen]);

  // Reset internal states when modal closes
  useEffect(() => {
    if (!isOpen) {
        setShowInviteModal(false);
        setSelectedUser(null);
        setActiveTab('users'); // Reset to default tab
    }
  }, [isOpen]);

  const fetchDetails = async () => {
    if (!companyId) return;
    setLoading(true);
    try {
      const [users, depts, events, details] = await Promise.all([
        api.get(`/companies/${companyId}/users`),
        api.get(`/departments/?company_id=${companyId}`),
        api.get(`/companies/${companyId}/events`),
        api.get(`/companies/${companyId}`)
      ]);
      
      setData({ 
        users: users.data, 
        depts: depts.data, 
        events: events.data, 
        info: details.data 
      });
    } catch (error) { 
      console.error("Failed to load company details"); 
    } finally { 
      setLoading(false); 
    }
  };

  // --- ACTIONS ---

  const handleUpdateGeneral = async () => {
    try { await api.put(`/companies/${companyId}`, { name: data.info.name }); alert("تغییرات ذخیره شد"); onRefresh(); } catch (e) { alert("خطا در ذخیره"); }
  };

  const handleDeleteCompany = async () => {
      const confirmName = prompt(`برای حذف سازمان "${data.info.name}"، نام آن را تایپ کنید:`);
      if (confirmName !== data.info.name) return alert("نام وارد شده صحیح نیست.");
      try { await api.delete(`/companies/${companyId}`); onRefresh(); onClose(); } catch (e) { alert("خطا در حذف"); }
  };

  // --- RENDERERS ---

  const renderContent = () => {
      switch (activeTab) {
          case 'depts':
              return (
                  <OrgBrowser 
                      companyId={companyId!} 
                      departments={data?.depts || []} 
                      onRefresh={fetchDetails} 
                  />
              );
          
          case 'users':
              return (
                  <div className="h-full flex flex-col relative overflow-hidden">
                      {/* Roster Toolbar */}
                      <div className="flex justify-between items-center mb-4 px-1">
                          <div className="flex items-center gap-2">
                              <h4 className="font-bold text-white text-lg">لیست اعضا</h4>
                              <span className="bg-white/10 text-xs px-2 py-0.5 rounded-full text-gray-400">
                                  {data?.users?.length || 0}
                              </span>
                          </div>
                          <button 
                              onClick={() => setShowInviteModal(true)}
                              className="bg-blue-600 hover:bg-blue-500 text-white px-4 py-2 rounded-xl text-sm font-bold flex items-center gap-2 shadow-lg shadow-blue-900/20 transition-all hover:scale-105"
                          >
                              <UserPlus size={16}/> عضو جدید
                          </button>
                      </div>
                      
                      {/* Roster Grid */}
                      <div className="flex-1 bg-[#0a0a0a] border border-white/10 rounded-2xl overflow-hidden relative">
                          {data?.users?.length > 0 ? (
                              <UserList 
                                  users={data.users} 
                                  onSelectUser={setSelectedUser} 
                              />
                          ) : (
                              <div className="absolute inset-0 flex flex-col items-center justify-center text-gray-600">
                                  <Users size={48} className="mb-4 opacity-20"/>
                                  <p className="text-sm">هنوز هیچ عضوی اضافه نشده است</p>
                              </div>
                          )}
                          
                          {/* Context Drawer (Slide-Over) */}
                          <UserDrawer 
                              user={selectedUser} 
                              onClose={() => setSelectedUser(null)} 
                              departments={data?.depts || []}
                              onRefresh={fetchDetails}
                          />
                      </div>
                  </div>
              );

          case 'events':
              return (
                <div className="flex flex-col h-full">
                    <h4 className="font-bold text-white mb-4 flex items-center gap-2"><Calendar size={18} className="text-blue-500"/> رویدادهای اخیر</h4>
                    <div className="flex-1 overflow-y-auto custom-scrollbar pr-2 pb-10 space-y-3">
                        {data?.events?.map((e: any) => (
                            <div key={e.id} className="p-4 bg-[#18181b] border border-white/5 rounded-xl relative overflow-hidden group hover:border-white/10 transition-colors">
                                <div className={clsx("absolute left-0 top-0 bottom-0 w-1", e.status === 'approved' ? "bg-emerald-500" : e.status === 'rejected' ? "bg-red-500" : "bg-amber-500")} />
                                <div className="pl-3">
                                    <div className="flex justify-between items-start">
                                        <div className="text-sm font-bold text-white">{e.title}</div>
                                        <span className="text-[10px] text-gray-500 font-mono">{new Date(e.start_time).toLocaleDateString('fa-IR')}</span>
                                    </div>
                                    <div className="mt-2 text-[10px] text-gray-400 border border-white/5 px-2 py-0.5 rounded w-fit">{e.status}</div>
                                </div>
                            </div>
                        ))}
                        {(!data?.events || data.events.length === 0) && (
                            <div className="text-center text-gray-600 text-xs py-10">هیچ رویدادی ثبت نشده است</div>
                        )}
                    </div>
                </div>
              );

          case 'general':
              return (
                <div className="space-y-6 max-w-xl mx-auto mt-10">
                    <div className="p-6 bg-white/5 rounded-2xl border border-white/10 flex items-center gap-5">
                        <div className="w-16 h-16 bg-blue-600/20 rounded-2xl flex items-center justify-center text-blue-400 shadow-inner">
                            <Building size={32} />
                        </div>
                        <div>
                            <h3 className="text-xl font-black text-white">{data?.info?.name}</h3>
                            <p className="text-xs text-gray-400 font-mono mt-1">System ID: {companyId}</p>
                        </div>
                    </div>
                    <div className="space-y-2">
                        <label className="text-sm text-gray-400 font-bold">نام سازمان</label>
                        <input 
                            value={data?.info?.name || ""}
                            onChange={(e) => setData({ ...data, info: { ...data.info, name: e.target.value } })}
                            className="w-full bg-black/40 border border-white/10 rounded-xl p-4 text-white focus:border-blue-500 outline-none transition-colors"
                        />
                    </div>
                    <div className="flex gap-3 pt-4">
                        <button onClick={handleUpdateGeneral} className="flex-1 py-3 bg-blue-600 hover:bg-blue-500 rounded-xl text-white font-bold flex items-center justify-center gap-2 transition-all">
                            <Save size={18} /> ذخیره تغییرات
                        </button>
                        <button onClick={handleDeleteCompany} className="py-3 px-6 bg-red-500/10 border border-red-500/20 text-red-400 hover:bg-red-500 hover:text-white rounded-xl font-bold transition-all">
                            <Trash2 size={18} />
                        </button>
                    </div>
                </div>
              );
      }
  };

  return (
    <>
      <ModalWrapper
        isOpen={isOpen}
        onClose={onClose}
        size="2xl"
        noPadding
      >
        <div className="flex h-full min-h-[700px]">
            
            {/* SIDEBAR */}
            <div className="w-64 bg-[#121214] border-l border-white/5 p-4 flex flex-col gap-2 shrink-0 z-20">
               <div className="mb-8 mt-2 px-2">
                  <h2 className="font-black text-lg text-white tracking-tight truncate">{data?.info?.name || "..."}</h2>
                  <p className="text-[10px] text-gray-500 mt-1 font-medium">پنل مدیریت یکپارچه</p>
               </div>
               
               <TabButton active={activeTab === 'users'} onClick={() => setActiveTab('users')} icon={Users} label="اعضا و دسترسی" />
               <TabButton active={activeTab === 'depts'} onClick={() => setActiveTab('depts')} icon={Building} label="ساختار سازمانی" />
               <TabButton active={activeTab === 'events'} onClick={() => setActiveTab('events')} icon={Calendar} label="رویدادها" />
               
               <div className="flex-1" />
               <div className="h-px bg-white/5 my-2" />
               <TabButton active={activeTab === 'general'} onClick={() => setActiveTab('general')} icon={Settings} label="تنظیمات پایه" />
            </div>

            {/* MAIN CONTENT */}
            <div className="flex-1 flex flex-col bg-[#09090b] relative">
               {/* Top Bar */}
               <div className="h-16 flex justify-between items-center px-8 border-b border-white/5 bg-[#09090b]/50 backdrop-blur-xl z-10">
                  <span className="text-xs text-gray-500 font-medium">
                      {activeTab === 'users' && "مدیریت لیست اعضا، نقش‌ها و جایگاه‌های سازمانی"}
                      {activeTab === 'depts' && "ویرایش نمودار درختی و جزئیات دپارتمان‌ها"}
                      {activeTab === 'events' && "مشاهده وضعیت و تاریخچه رویدادهای سازمان"}
                      {activeTab === 'general' && "ویرایش اطلاعات اصلی و حذف سازمان"}
                  </span>
                  <button onClick={fetchDetails} className="p-2 text-gray-400 hover:text-white hover:bg-white/5 rounded-lg transition-colors">
                      <RefreshCw size={18} className={clsx(loading && "animate-spin")}/>
                  </button>
               </div>

               {/* Tab Body */}
               <div className="flex-1 p-8 overflow-hidden relative">
                  {loading && !data ? (
                      <div className="absolute inset-0 flex items-center justify-center">
                          <div className="flex flex-col items-center gap-3">
                              <div className="animate-spin w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full"/>
                              <span className="text-xs text-gray-500">در حال دریافت اطلاعات...</span>
                          </div>
                      </div>
                  ) : (
                      <AnimatePresence mode="wait">
                          <motion.div 
                              key={activeTab}
                              initial={{ opacity: 0, x: -10 }}
                              animate={{ opacity: 1, x: 0 }}
                              exit={{ opacity: 0, x: 10 }}
                              transition={{ duration: 0.2 }}
                              className="h-full"
                          >
                              {renderContent()}
                          </motion.div>
                      </AnimatePresence>
                  )}
               </div>
            </div>
        </div>
      </ModalWrapper>

      {/* QUICK INVITE MODAL */}
      {showInviteModal && (
          <QuickInviteModal 
             isOpen={true} 
             onClose={() => setShowInviteModal(false)}
             companyId={companyId!}
             onSuccess={fetchDetails}
          />
      )}
    </>
  );
}

function TabButton({ active, onClick, icon: Icon, label }: any) {
    return (
        <button 
            onClick={onClick}
            className={clsx(
                "w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all text-sm font-medium relative overflow-hidden group",
                active ? "bg-blue-600/10 text-blue-400 shadow-inner ring-1 ring-blue-500/20" : "text-gray-400 hover:bg-white/5 hover:text-gray-200"
            )}
        >
            {active && <div className="absolute left-0 top-0 bottom-0 w-1 bg-blue-500" />}
            <Icon size={18} className={clsx(active ? "text-blue-400" : "text-gray-500 group-hover:text-gray-400 transition-colors")} /> 
            {label}
        </button>
    );
}