"use client";

import { X, User as UserIcon, Phone, Building, Shield } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useEffect, useState } from "react";

interface UserDrawerProps {
  user: any | null;
  onClose: () => void;
  departments: any[];
  onRefresh?: () => void;
  onRemove?: () => void;
}

export default function UserDrawer({ user, onClose, departments, onRefresh, onRemove }: UserDrawerProps) {
  return (
    <AnimatePresence>
      {user && (
        <>
          {/* Backdrop (Invisible but catches clicks) */}
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 z-40 bg-black/20 backdrop-blur-[1px]"
          />

          {/* Drawer Panel */}
          <motion.div
            initial={{ x: "100%" }}
            animate={{ x: 0 }}
            exit={{ x: "100%" }}
            transition={{ type: "spring", damping: 30, stiffness: 300 }}
            className="absolute top-0 right-0 bottom-0 w-[400px] z-50 bg-[#121214] border-r border-white/10 shadow-2xl flex flex-col"
          >
             {/* Header */}
             <div className="h-20 border-b border-white/5 flex items-center justify-between px-6 bg-[#18181b]">
                <span className="text-sm font-bold text-gray-400">جزئیات عضو</span>
                <button onClick={onClose} className="p-2 hover:bg-white/5 rounded-full text-gray-400 hover:text-white"><X size={20}/></button>
             </div>

             <div className="p-6 flex flex-col gap-6 overflow-y-auto">
                
                {/* Profile Header */}
                <div className="flex flex-col items-center text-center">
                    <div className="w-24 h-24 bg-gradient-to-tr from-blue-600 to-purple-600 rounded-3xl flex items-center justify-center text-3xl font-bold text-white mb-4 shadow-xl shadow-blue-900/20">
                        {user.display_name?.[0]}
                    </div>
                    <h3 className="text-xl font-bold text-white">{user.display_name}</h3>
                    <p className="text-sm text-gray-500 font-mono mt-1">{user.phone_number}</p>
                </div>

                {/* Placement Card */}
                <div className="bg-[#0a0a0a] border border-white/5 rounded-2xl p-4 space-y-4">
                    <div className="flex items-center gap-3 text-gray-300 border-b border-white/5 pb-3">
                        <Building size={18} className="text-blue-500" />
                        <span className="text-sm font-bold">جایگاه سازمانی</span>
                    </div>
                    
                    <div>
                        <label className="text-xs text-gray-500 mb-1.5 block">دپارتمان فعلی</label>
                        <select 
                            className="w-full bg-[#18181b] border border-white/10 rounded-xl px-3 py-2.5 text-sm text-white outline-none focus:border-blue-500"
                            defaultValue={user.department_id || ""}
                        >
                            <option value="">(بدون دپارتمان)</option>
                            {departments.map((d: any) => (
                                <option key={d.id} value={d.id}>{d.name}</option>
                            ))}
                        </select>
                    </div>
                </div>

                {/* Role Card */}
                <div className="bg-[#0a0a0a] border border-white/5 rounded-2xl p-4 space-y-4">
                    <div className="flex items-center gap-3 text-gray-300 border-b border-white/5 pb-3">
                        <Shield size={18} className="text-emerald-500" />
                        <span className="text-sm font-bold">سطح دسترسی</span>
                    </div>
                    
                    <div>
                        <label className="text-xs text-gray-500 mb-1.5 block">نقش کاربری</label>
                        <select 
                            className="w-full bg-[#18181b] border border-white/10 rounded-xl px-3 py-2.5 text-sm text-white outline-none focus:border-blue-500"
                            defaultValue={user.role}
                        >
                            <option value="viewer">مشاهده‌گر (Viewer)</option>
                            <option value="proposer">پیشنهاد دهنده (Proposer)</option>
                            <option value="evaluator">ارزیاب (Evaluator)</option>
                            <option value="manager">مدیر (Manager)</option>
                        </select>
                    </div>
                </div>

                {/* Actions */}
                <div className="mt-auto pt-6 border-t border-white/5">
                    <button className="w-full py-3 bg-blue-600 hover:bg-blue-500 text-white rounded-xl font-bold transition-colors">
                        ذخیره تغییرات
                    </button>
                </div>
                {onRemove && (
                    <button 
                        onClick={onRemove}
                        className="w-full py-3 bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/20 rounded-xl font-bold transition-colors"
                    >
                        حذف کاربر از سازمان
                    </button>
                )}

             </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}