"use client";

import { useState, useEffect } from "react";
import { X, MessageSquare, Send, Loader2 } from "lucide-react";
import api from "@/lib/api";
import clsx from "clsx";
import GlassPane from "./ui/GlassPane";

interface IssueModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function IssueModal({ isOpen, onClose }: IssueModalProps) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setTitle("");
      setDescription("");
    }
  }, [isOpen]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !description.trim()) return;
    
    setLoading(true);
    try {
      await api.post("/issues/", { title, description });
      alert("گزارش شما با موفقیت ثبت شد. با تشکر!");
      onClose();
    } catch (err) {
      console.error(err);
      alert("خطا در ارسال گزارش.");
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    // High Z-Index to ensure visibility
    <div 
      className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm"
      onClick={onClose}
      style={{ direction: "rtl" }}
    >
      <div 
        className="w-full max-w-md animate-in fade-in zoom-in-95 duration-200" 
        onClick={(e) => e.stopPropagation()} 
      >
        <GlassPane intensity="high" className="rounded-2xl overflow-hidden border border-white/10 shadow-2xl">
            
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-white/10 bg-white/5">
                <h3 className="text-lg font-bold text-gray-100 flex items-center gap-2">
                    <MessageSquare className="text-yellow-500" size={20} />
                    گزارش مشکل / بازخورد
                </h3>
                <button onClick={onClose} className="text-gray-400 hover:text-white transition-colors p-1 hover:bg-white/10 rounded-full">
                    <X size={20} />
                </button>
            </div>

            {/* Body */}
            <form onSubmit={handleSubmit} className="p-6 space-y-5">
                <div className="space-y-2">
                    <label className="block text-xs text-gray-400 font-bold">موضوع</label>
                    <input 
                        type="text" 
                        value={title}
                        onChange={(e) => setTitle(e.target.value)}
                        className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-white outline-none focus:border-yellow-500/50 focus:bg-black/60 transition-all placeholder:text-gray-600"
                        placeholder="مثلا: باگ در ثبت رویداد..."
                        autoFocus
                        required
                    />
                </div>
                
                <div className="space-y-2">
                    <label className="block text-xs text-gray-400 font-bold">توضیحات تکمیلی</label>
                    <textarea 
                        rows={5}
                        value={description}
                        onChange={(e) => setDescription(e.target.value)}
                        className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-white outline-none focus:border-yellow-500/50 focus:bg-black/60 transition-all resize-none placeholder:text-gray-600"
                        placeholder="لطفاً جزئیات مشکل یا پیشنهاد خود را بنویسید..."
                        required
                    />
                </div>

                <div className="pt-2 flex justify-end gap-3">
                    <button 
                        type="button" 
                        onClick={onClose} 
                        className="px-4 py-2 rounded-xl text-sm text-gray-400 hover:text-white hover:bg-white/5 transition-colors"
                    >
                        انصراف
                    </button>
                    <button 
                        type="submit" 
                        disabled={loading}
                        className={clsx(
                            "px-6 py-2 rounded-xl text-sm font-bold text-black bg-yellow-500 hover:bg-yellow-400 shadow-lg shadow-yellow-500/20 transition-all flex items-center gap-2",
                            loading && "opacity-50 cursor-not-allowed"
                        )}
                    >
                        {loading ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
                        <span>{loading ? "در حال ارسال..." : "ارسال بازخورد"}</span>
                    </button>
                </div>
            </form>
        </GlassPane>
      </div>
    </div>
  );
}