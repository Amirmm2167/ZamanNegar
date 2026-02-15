"use client";

import { useState, useEffect } from "react";
import { Bell, Check, X, Building2, Info, ChevronLeft, ChevronRight } from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import api from "@/lib/api";
import { useAuthStore } from "@/stores/authStore";
import clsx from "clsx";
import { motion, AnimatePresence } from "framer-motion";

interface Notification {
  id: number;
  title: string;
  message: string;
  type: "company" | "system" | "personal";
  is_read: boolean;
  reference_id?: string;
  created_at: string;
}

export default function NotificationsRail() {
  const [isOpen, setIsOpen] = useState(false);
  const queryClient = useQueryClient();
  const { fetchSession } = useAuthStore(); // To refresh available_contexts after accept

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
        fetchSession(); // Refresh user contexts (add the new company)
        alert("عملیات با موفقیت انجام شد.");
    },
    onError: () => alert("خطا در پردازش درخواست")
  });

  const handleAction = (notif: Notification, action: 'accept' | 'reject') => {
     if (!notif.reference_id?.startsWith('invite_')) return;
     const companyId = parseInt(notif.reference_id.split('_')[1]);
     inviteMutation.mutate({ companyId, action });
  };

  return (
    <>
      {/* Trigger Button (Fixed to Layout) */}
      <button 
        onClick={() => setIsOpen(!isOpen)}
        className="fixed top-6 left-6 z-40 p-3 bg-[#18181b]/80 backdrop-blur-md border border-white/10 rounded-xl text-gray-400 hover:text-white hover:bg-white/10 transition-all group"
      >
        <div className="relative">
            <Bell size={20} />
            {unreadCount > 0 && (
                <span className="absolute -top-2 -right-2 w-4 h-4 bg-red-500 rounded-full text-[10px] text-white flex items-center justify-center animate-pulse">
                    {unreadCount}
                </span>
            )}
        </div>
      </button>

      {/* The Rail Panel */}
      <AnimatePresence>
        {isOpen && (
            <motion.div 
                initial={{ x: -320, opacity: 0 }}
                animate={{ x: 0, opacity: 1 }}
                exit={{ x: -320, opacity: 0 }}
                className="fixed top-0 left-0 bottom-0 w-80 bg-[#09090b]/95 backdrop-blur-xl border-r border-white/10 z-50 flex flex-col shadow-2xl"
            >
                <div className="p-5 border-b border-white/10 flex justify-between items-center">
                    <h3 className="font-bold text-white flex items-center gap-2">
                        <Bell className="text-blue-500" size={18} /> اعلان‌ها
                    </h3>
                    <button onClick={() => setIsOpen(false)} className="p-2 hover:bg-white/5 rounded-lg text-gray-400">
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
                                    "p-4 rounded-xl border transition-all relative group",
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
                                                    className="flex-1 py-1.5 bg-emerald-600/20 text-emerald-400 border border-emerald-600/30 rounded-lg text-xs font-bold hover:bg-emerald-600 hover:text-white transition-colors"
                                                >
                                                    قبول
                                                </button>
                                                <button 
                                                    onClick={(e) => { e.stopPropagation(); handleAction(n, 'reject'); }}
                                                    className="flex-1 py-1.5 bg-red-600/20 text-red-400 border border-red-600/30 rounded-lg text-xs font-bold hover:bg-red-600 hover:text-white transition-colors"
                                                >
                                                    رد
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
            </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}