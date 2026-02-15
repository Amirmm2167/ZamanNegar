"use client";

import { useState, useEffect } from "react";
import { Building, Users, Calendar, Settings, RefreshCw, UserPlus } from "lucide-react";
import api from "@/lib/api";
import clsx from "clsx";
import { motion, AnimatePresence } from "framer-motion";
import ModalWrapper from "@/components/ui/ModalWrapper";

// New Modules
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
  const [activeTab, setActiveTab] = useState<'general' | 'depts' | 'users' | 'events'>('users'); // Default to users for roster management
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<any>(null);
  
  // UI States
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [selectedUser, setSelectedUser] = useState<any>(null); // For Drawer

  useEffect(() => {
    if (companyId && isOpen) fetchDetails();
  }, [companyId, isOpen]);

  // Reset internal states on close
  useEffect(() => {
    if (!isOpen) {
        setShowInviteModal(false);
        setSelectedUser(null);
        setActiveTab('users');
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
      setData({ users: users.data, depts: depts.data, events: events.data, info: details.data });
    } catch (error) { console.error("Failed to load"); } 
    finally { setLoading(false); }
  };

  const renderContent = () => {
      switch (activeTab) {
          case 'depts':
              return <OrgBrowser companyId={companyId!} departments={data?.depts || []} onRefresh={fetchDetails} />;
          case 'users':
              return (
                  <div className="h-full flex flex-col relative overflow-hidden">
                      {/* Toolbar */}
                      <div className="flex justify-between items-center mb-4 px-1">
                          <h4 className="font-bold text-white">اعضای سازمان ({data?.users?.length || 0})</h4>
                          <button 
                              onClick={() => setShowInviteModal(true)}
                              className="bg-blue-600 hover:bg-blue-500 text-white px-4 py-2 rounded-xl text-sm font-bold flex items-center gap-2 shadow-lg shadow-blue-900/20"
                          >
                              <UserPlus size={16}/> عضو جدید
                          </button>
                      </div>
                      
                      {/* Grid */}
                      <div className="flex-1 bg-[#0a0a0a] border border-white/10 rounded-2xl overflow-hidden relative">
                          <UserList users={data?.users || []} onSelectUser={setSelectedUser} />
                          
                          {/* Slide-Over Drawer */}
                          <UserDrawer 
                              user={selectedUser} 
                              onClose={() => setSelectedUser(null)} 
                              departments={data?.depts || []}
                          />
                      </div>
                  </div>
              );
          case 'general':
              return <div className="text-gray-500 text-center mt-20">تنظیمات عمومی (Placeholder)</div>;
          default:
              return null;
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
            <div className="w-64 bg-[#121214] border-l border-white/5 p-4 flex flex-col gap-2 shrink-0">
               <div className="mb-8 mt-2 px-2">
                  <h2 className="font-black text-xl text-white tracking-tight">{data?.info?.name || "..."}</h2>
                  <p className="text-[10px] text-gray-500 mt-1 font-mono uppercase">System ID: {companyId}</p>
               </div>
               
               <TabButton active={activeTab === 'users'} onClick={() => setActiveTab('users')} icon={Users} label="اعضا و دسترسی" />
               <TabButton active={activeTab === 'depts'} onClick={() => setActiveTab('depts')} icon={Building} label="ساختار سازمانی" />
               <TabButton active={activeTab === 'events'} onClick={() => setActiveTab('events')} icon={Calendar} label="رویدادها" />
               <div className="flex-1" />
               <TabButton active={activeTab === 'general'} onClick={() => setActiveTab('general')} icon={Settings} label="تنظیمات پایه" />
            </div>

            {/* MAIN AREA */}
            <div className="flex-1 flex flex-col bg-[#09090b] relative">
               {/* Top Bar */}
               <div className="h-16 flex justify-between items-center px-8 border-b border-white/5">
                  <span className="text-xs text-gray-500 font-medium">
                      {activeTab === 'users' && "مدیریت لیست اعضا و نقش‌ها"}
                      {activeTab === 'depts' && "ویرایش نمودار درختی و دپارتمان‌ها"}
                  </span>
                  <button onClick={fetchDetails} className="p-2 text-gray-400 hover:text-white transition-colors">
                      <RefreshCw size={18} className={clsx(loading && "animate-spin")}/>
                  </button>
               </div>

               {/* Dynamic Tab Content */}
               <div className="flex-1 p-8 overflow-hidden relative">
                  {loading && !data ? (
                      <div className="absolute inset-0 flex items-center justify-center"><div className="animate-spin w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full"/></div>
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
                active ? "bg-white/10 text-white shadow-inner" : "text-gray-400 hover:bg-white/5 hover:text-gray-200"
            )}
        >
            {active && <div className="absolute left-0 top-0 bottom-0 w-1 bg-blue-500" />}
            <Icon size={18} className={clsx(active ? "text-blue-400" : "text-gray-500 group-hover:text-gray-400")} /> 
            {label}
        </button>
    );
}