"use client";

import { useState, useEffect, useRef } from "react";
import { X, Plus, Trash2, CalendarOff, Calendar, Loader2 } from "lucide-react";
import api from "@/lib/api";
import GlassPane from "@/components/ui/GlassPane";
import DatePicker from "@/components/DatePicker";
import clsx from "clsx";

interface Holiday {
  id: number;
  occasion: string;
  holiday_date: string; // YYYY-MM-DD
}

interface HolidayModalProps {
  isOpen: boolean;
  onClose: () => void;
  onUpdate: () => void; 
}

export default function HolidayModal({ isOpen, onClose, onUpdate }: HolidayModalProps) {
  const [holidays, setHolidays] = useState<Holiday[]>([]);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  
  // Form
  const [occasion, setOccasion] = useState("");
  const [date, setDate] = useState("");
  const [showDatePicker, setShowDatePicker] = useState(false);

  const modalRef = useRef<HTMLDivElement>(null);

  // --- 1. Handlers for Close Logic ---
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isOpen && !showDatePicker) {
        onClose();
      }
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose, showDatePicker]);

  useEffect(() => {
    if (isOpen) {
      fetchHolidays();
      const today = new Date().toISOString().split('T')[0];
      setDate(today);
      setOccasion("");
    }
  }, [isOpen]);

  const fetchHolidays = async () => {
    try {
      setLoading(true);
      const res = await api.get<Holiday[]>("/holidays/");
      // Sort by date descending (newest first)
      setHolidays(res.data.sort((a, b) => new Date(b.holiday_date).getTime() - new Date(a.holiday_date).getTime()));
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!occasion || !date) return;

    try {
      setSubmitting(true);
      await api.post("/holidays/", { occasion, holiday_date: date });
      setOccasion("");
      await fetchHolidays();
      onUpdate(); 
    } catch (err) {
      console.error(err);
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm("آیا از حذف این تعطیلی اطمینان دارید؟")) return;
    try {
      await api.delete(`/holidays/${id}`);
      await fetchHolidays();
      onUpdate();
    } catch (err) {
      console.error(err);
    }
  };

  // Helper to show Jalali date in the list
  const formatJalali = (isoDate: string) => {
    return new Date(isoDate).toLocaleDateString("fa-IR", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  };

  if (!isOpen) return null;

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm transition-all"
      onClick={onClose} // Outside click
    >
      <div 
        className="w-full max-w-md animate-in fade-in zoom-in-95 duration-200" 
        dir="rtl"
        onClick={(e) => e.stopPropagation()} // Stop propagation
      >
        <GlassPane intensity="high" className="flex flex-col max-h-[85vh] rounded-2xl border border-white/10 shadow-2xl overflow-hidden">
          
          {/* Header */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-white/10 bg-white/5">
            <h3 className="text-lg font-bold text-gray-100 flex items-center gap-2">
              <CalendarOff size={20} className="text-red-400" />
              مدیریت تعطیلات
            </h3>
            <button onClick={onClose} className="p-1.5 text-gray-400 hover:text-white rounded-full hover:bg-white/10 transition-colors">
              <X size={20} />
            </button>
          </div>

          <div className="p-6 flex-1 overflow-y-auto custom-scrollbar space-y-6">
            
            {/* Add Form */}
            <form onSubmit={handleAdd} className="bg-black/20 p-4 rounded-xl border border-white/5 space-y-4">
              <div>
                <label className="text-xs text-gray-400 font-bold mb-1.5 block">عنوان مناسبت</label>
                <input
                  type="text"
                  value={occasion}
                  onChange={(e) => setOccasion(e.target.value)}
                  className="w-full px-4 py-2.5 bg-black/40 border border-white/10 rounded-xl text-white focus:border-red-500/50 outline-none transition-colors placeholder:text-gray-600"
                  placeholder="مثلا: عید نوروز"
                />
              </div>

              <div>
                <label className="text-xs text-gray-400 font-bold mb-1.5 block">تاریخ (شمسی)</label>
                <button
                  type="button"
                  onClick={() => setShowDatePicker(true)}
                  className="w-full flex items-center justify-between px-4 py-2.5 bg-black/40 border border-white/10 rounded-xl text-white hover:border-red-500/50 transition-colors"
                >
                  <span className="text-sm">{date ? formatJalali(date) : "انتخاب تاریخ..."}</span>
                  <Calendar size={16} className="text-gray-400" />
                </button>
              </div>

              <button
                type="submit"
                disabled={submitting || !occasion}
                className={clsx(
                  "w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-red-600 hover:bg-red-700 text-white rounded-xl font-bold shadow-lg shadow-red-900/20 transition-all",
                  (submitting || !occasion) && "opacity-50 cursor-not-allowed"
                )}
              >
                {submitting ? <Loader2 size={18} className="animate-spin" /> : <Plus size={18} />}
                <span>ثبت تعطیلی</span>
              </button>
            </form>

            {/* List */}
            <div className="space-y-3">
              <h4 className="text-xs font-bold text-gray-500 uppercase tracking-wider">لیست تعطیلات ثبت شده</h4>
              
              {loading && <div className="text-center py-4"><Loader2 className="animate-spin mx-auto text-red-500" /></div>}
              
              {!loading && holidays.length === 0 && (
                <div className="text-gray-500 text-sm text-center py-8 bg-white/5 rounded-xl border border-dashed border-white/10">
                  هیچ تعطیلی ثبت نشده است.
                </div>
              )}

              <div className="space-y-2">
                {holidays.map((h) => (
                  <div key={h.id} className="flex items-center justify-between p-3 bg-white/5 border border-white/5 rounded-xl group hover:border-white/10 transition-colors">
                    <div className="flex items-center gap-3">
                      <div className="w-1.5 h-8 bg-red-500/50 rounded-full"></div>
                      <div>
                        <div className="font-bold text-gray-200 text-sm">{h.occasion}</div>
                        <div className="text-xs text-gray-500 font-mono mt-0.5">
                          {formatJalali(h.holiday_date)}
                        </div>
                      </div>
                    </div>
                    <button 
                      onClick={() => handleDelete(h.id)} 
                      className="p-2 text-gray-500 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-all opacity-0 group-hover:opacity-100"
                      title="حذف"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                ))}
              </div>
            </div>

          </div>
        </GlassPane>
      </div>

      {/* Date Picker Overlay */}
      {showDatePicker && (
        <DatePicker 
          value={date} 
          onChange={(val) => setDate(val)} 
          onClose={() => setShowDatePicker(false)} 
        />
      )}
    </div>
  );
}