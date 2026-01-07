"use client";

import { useState } from "react";
import { X, MessageSquare, AlertTriangle, Send } from "lucide-react";

interface IssueModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (title: string, desc: string) => void;
}

export default function IssueModal({ isOpen, onClose, onSubmit }: IssueModalProps) {
  const [title, setTitle] = useState("");
  const [desc, setDesc] = useState("");

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 sm:p-6" dir="rtl">
      <div 
        className="absolute inset-0 bg-black/70 backdrop-blur-md"
        onClick={onClose}
      />
      
      <div className="relative w-full max-w-md bg-[#18181b]/95 backdrop-blur-2xl border border-yellow-500/20 rounded-3xl shadow-[0_0_50px_rgba(234,179,8,0.1)] overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        
        {/* Header (Yellow Accent for Issues) */}
        <div className="px-6 py-5 border-b border-white/5 bg-yellow-500/5 flex justify-between items-center">
          <h2 className="text-lg font-bold text-yellow-500 flex items-center gap-2">
            <AlertTriangle size={20} />
            گزارش مشکل
          </h2>
          <button onClick={onClose} className="text-gray-400 hover:text-white transition-colors">
            <X size={20} />
          </button>
        </div>

        <div className="p-6 space-y-4">
          <div className="space-y-2">
             <label className="text-xs text-gray-400">موضوع</label>
             <input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="w-full bg-black/40 border border-white/10 rounded-xl py-3 px-4 text-white focus:border-yellow-500/50 focus:outline-none transition-colors"
                placeholder="مثلاً: خطا در ثبت رویداد"
                autoFocus
             />
          </div>
          
          <div className="space-y-2">
             <label className="text-xs text-gray-400">توضیحات</label>
             <textarea
                value={desc}
                onChange={(e) => setDesc(e.target.value)}
                className="w-full bg-black/40 border border-white/10 rounded-xl py-3 px-4 text-white focus:border-yellow-500/50 focus:outline-none min-h-[120px] resize-none"
                placeholder="لطفاً جزئیات را بنویسید..."
             />
          </div>
        </div>

        <div className="p-5 border-t border-white/5 bg-black/20 flex gap-3">
          <button
             onClick={() => onSubmit(title, desc)}
             disabled={!title || !desc}
             className="flex-1 bg-yellow-600 hover:bg-yellow-500 disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold py-3 rounded-xl shadow-[0_0_15px_rgba(234,179,8,0.3)] flex justify-center items-center gap-2 transition-all"
          >
             <Send size={18} />
             ارسال گزارش
          </button>
        </div>

      </div>
    </div>
  );
}