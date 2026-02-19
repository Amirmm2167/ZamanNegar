"use client";

import { useState, Fragment } from "react";
import { Bell, ChevronLeft, Building2, Info, Loader2 } from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import api from "@/lib/api";
import { useAuthStore } from "@/stores/authStore";
import clsx from "clsx";
import { Dialog, Transition } from "@headlessui/react";

interface Notification {
  id: number;
  title: string;
  message: string;
  type: "company" | "system" | "personal";
  is_read: boolean;
  reference_id?: string;
  created_at: string;
}

export default function NotificationBell({ isMobile }: { isMobile?: boolean }) {
  const [isOpen, setIsOpen] = useState(false);
  const queryClient = useQueryClient();
  const { fetchSession } = useAuthStore();

  // 1. Poll Notifications every 30s
  const { data: notifications = [] } = useQuery<Notification[]>({
    queryKey: ['notifications'],
    queryFn: () => api.get("/notifications/").then(res => res.data),
    refetchInterval: 30000 
  });

  const unreadCount = notifications.filter(n => !n.is_read).length;

  // 2. Actions
  const markReadMutation = useMutation({
    mutationFn: (id: number) => api.post(`/notifications/${id}/read`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['notifications'] })
  });

  const inviteMutation = useMutation({
    mutationFn: async ({ companyId, action }: { companyId: number, action: 'accept' | 'reject' }) => {
        return api.post(`/notifications/invites/${companyId}/${action}`);
    },
    onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: ['notifications'] });
        fetchSession(); // Refresh contexts
    }
  });

  const handleAction = (notif: Notification, action: 'accept' | 'reject') => {
     if (!notif.reference_id?.startsWith('invite_')) return;
     const companyId = parseInt(notif.reference_id.split('_')[1]);
     inviteMutation.mutate({ companyId, action });
  };

  return (
    <>
      {/* --- THE BELL BUTTON --- */}
      <button 
        onClick={() => setIsOpen(true)}
        className={clsx(
          "text-gray-400 hover:text-white transition-colors relative rounded-lg active:bg-white/10",
          isMobile ? "p-1.5" : "p-2 hover:bg-white/5"
        )}
      >
        <Bell className={isMobile ? "w-[18px] h-[18px]" : "w-5 h-5"} />
        {unreadCount > 0 && (
          <span className={clsx(
            "absolute bg-red-500 rounded-full border border-[#0a0c10] flex items-center justify-center text-white",
            isMobile ? "top-1.5 right-1.5 w-2 h-2" : "top-2 right-2 w-2 h-2 border-2",
          )} />
        )}
      </button>

      {/* --- THE SLIDE-OUT DRAWER (Using HeadlessUI Portal) --- */}
      <Transition appear show={isOpen} as={Fragment}>
        <Dialog as="div" className="relative z-[200]" onClose={() => setIsOpen(false)} dir="rtl">
          
          {/* Backdrop */}
          <Transition.Child
            as={Fragment}
            enter="ease-out duration-300"
            enterFrom="opacity-0"
            enterTo="opacity-100"
            leave="ease-in duration-200"
            leaveFrom="opacity-100"
            leaveTo="opacity-0"
          >
            <div className="fixed inset-0 bg-black/50 backdrop-blur-sm" />
          </Transition.Child>

          {/* Drawer Panel */}
          <div className="fixed inset-0 overflow-hidden">
            <div className="absolute inset-0 overflow-hidden">
              <div className="pointer-events-none fixed inset-y-0 left-0 flex max-w-full">
                <Transition.Child
                  as={Fragment}
                  enter="transform transition ease-out duration-300"
                  enterFrom="-translate-x-full"
                  enterTo="translate-x-0"
                  leave="transform transition ease-in duration-200"
                  leaveFrom="translate-x-0"
                  leaveTo="-translate-x-full"
                >
                  <Dialog.Panel className="pointer-events-auto w-screen max-w-[320px] bg-[#09090b]/95 backdrop-blur-xl border-r border-white/10 flex flex-col shadow-2xl h-full">
                    
                    <div className="p-5 border-b border-white/10 flex justify-between items-center bg-white/[0.02]">
                        <h3 className="font-bold text-white flex items-center gap-2">
                            <Bell className="text-blue-500" size={18} /> اعلان‌ها
                        </h3>
                        <button onClick={() => setIsOpen(false)} className="p-2 hover:bg-white/10 rounded-lg text-gray-400 transition-colors">
                            <ChevronLeft size={18} />
                        </button>
                    </div>

                    <div className="flex-1 overflow-y-auto p-4 space-y-3 custom-scrollbar">
                        {notifications.length === 0 ? (
                            <div className="text-center py-10 text-gray-500 text-sm">هیچ پیام جدیدی ندارید</div>
                        ) : (
                            notifications.map(n => (
                                <div 
                                    key={n.id} 
                                    className={clsx(
                                        "p-4 rounded-xl border transition-all relative group cursor-pointer",
                                        n.is_read ? "bg-white/[0.02] border-white/5 opacity-60" : "bg-[#18181b] border-white/10 shadow-lg"
                                    )}
                                    onClick={() => !n.is_read && markReadMutation.mutate(n.id)}
                                >
                                    <div className="flex items-start gap-3">
                                        <div className={clsx("p-2 rounded-full shrink-0", 
                                            n.type === 'company' ? "bg-blue-500/10 text-blue-400" : "bg-gray-700/30 text-gray-400"
                                        )}>
                                            {n.type === 'company' ? <Building2 size={16} /> : <Info size={16} />}
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <h4 className="text-sm font-bold text-gray-200 mb-1">{n.title}</h4>
                                            <p className="text-xs text-gray-400 leading-relaxed">{n.message}</p>
                                            
                                            {/* Invitation Actions */}
                                            {n.reference_id?.startsWith('invite_') && !n.is_read && (
                                                <div className="mt-3 flex gap-2">
                                                    <button 
                                                        onClick={(e) => { e.stopPropagation(); handleAction(n, 'accept'); }}
                                                        disabled={inviteMutation.isPending}
                                                        className="flex-1 py-1.5 bg-emerald-600/20 text-emerald-400 border border-emerald-600/30 rounded-lg text-xs font-bold hover:bg-emerald-600 hover:text-white transition-colors flex items-center justify-center"
                                                    >
                                                        {inviteMutation.isPending ? <Loader2 size={12} className="animate-spin" /> : "قبول"}
                                                    </button>
                                                    <button 
                                                        onClick={(e) => { e.stopPropagation(); handleAction(n, 'reject'); }}
                                                        disabled={inviteMutation.isPending}
                                                        className="flex-1 py-1.5 bg-red-600/20 text-red-400 border border-red-600/30 rounded-lg text-xs font-bold hover:bg-red-600 hover:text-white transition-colors flex items-center justify-center"
                                                    >
                                                        {inviteMutation.isPending ? <Loader2 size={12} className="animate-spin" /> : "رد"}
                                                    </button>
                                                </div>
                                            )}
                                            
                                            <span className="text-[10px] text-gray-600 mt-2 block">
                                                {new Date(n.created_at).toLocaleTimeString('fa-IR')}
                                            </span>
                                        </div>
                                        {!n.is_read && <div className="w-2 h-2 rounded-full bg-blue-500 shrink-0 mt-1.5" />}
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                  </Dialog.Panel>
                </Transition.Child>
              </div>
            </div>
          </div>
        </Dialog>
      </Transition>
    </>
  );
}