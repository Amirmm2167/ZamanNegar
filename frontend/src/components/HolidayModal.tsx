"use client";

import { useState, useEffect } from "react";
import { X, Plus, Trash2, CalendarOff } from "lucide-react";
import api from "@/lib/api";

interface Holiday {
  id: number;
  occasion: string;
  holiday_date: string; // YYYY-MM-DD
}

interface HolidayModalProps {
  isOpen: boolean;
  onClose: () => void;
  onUpdate: () => void; // To refresh the calendar grid if needed
}

export default function HolidayModal({ isOpen, onClose, onUpdate }: HolidayModalProps) {
  const [holidays, setHolidays] = useState<Holiday[]>([]);
  const [loading, setLoading] = useState(false);
  
  // Form
  const [occasion, setOccasion] = useState("");
  const [date, setDate] = useState("");

  useEffect(() => {
    if (isOpen) {
      fetchHolidays();
      // Default to today
      const today = new Date().toISOString().split('T')[0];
      setDate(today);
      setOccasion("");
    }
  }, [isOpen]);

  const fetchHolidays = async () => {
    try {
      setLoading(true);
      const res = await api.get<Holiday[]>("/holidays/");
      // Sort by date
      setHolidays(res.data.sort((a, b) => new Date(a.holiday_date).getTime() - new Date(b.holiday_date).getTime()));
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
      setLoading(true);
      await api.post("/holidays/", { occasion, holiday_date: date });
      setOccasion("");
      await fetchHolidays();
      onUpdate(); // Tell parent to refresh grid
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm("حذف شود؟")) return;
    try {
      setLoading(true);
      await api.delete(`/holidays/${id}`);
      await fetchHolidays();
      onUpdate();
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div className="w-full max-w-md bg-[#252526] border border-gray-700 rounded-xl shadow-2xl overflow-hidden flex flex-col max-h-[80vh]" dir="rtl">
        
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-700 bg-[#2d2d2e]">
          <h3 className="text-lg font-bold text-gray-100 flex items-center gap-2">
            <CalendarOff size={20} className="text-red-400" />
            مدیریت تعطیلات
          </h3>
          <button onClick={onClose} className="p-1 text-gray-400 hover:text-white rounded-full">
            <X size={20} />
          </button>
        </div>

        <div className="p-6 flex-1 overflow-y-auto space-y-6">
          
          {/* Add Form */}
          <form onSubmit={handleAdd} className="bg-[#1e1e1e] p-4 rounded-lg border border-gray-700 space-y-3">
            <div>
              <label className="text-xs text-gray-500 mb-1 block">نام مناسبت</label>
              <input
                type="text"
                value={occasion}
                onChange={(e) => setOccasion(e.target.value)}
                className="w-full px-3 py-2 bg-[#2d2d2e] border border-gray-600 rounded text-white focus:border-blue-500 outline-none"
                placeholder="مثلا: عید نوروز"
              />
            </div>
            <div>
              <label className="text-xs text-gray-500 mb-1 block">تاریخ</label>
              <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="w-full px-3 py-2 bg-[#2d2d2e] border border-gray-600 rounded text-white focus:border-blue-500 outline-none"
              />
            </div>
            <button
              type="submit"
              disabled={loading || !occasion}
              className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-md transition-colors disabled:opacity-50"
            >
              <Plus size={16} />
              <span>افزودن تعطیلی</span>
            </button>
          </form>

          {/* List */}
          <div className="space-y-2">
            <h4 className="text-sm font-bold text-gray-400">لیست تعطیلات شرکت</h4>
            {holidays.length === 0 ? (
              <p className="text-gray-500 text-sm text-center py-4">تعطیلی ثبت نشده است.</p>
            ) : (
              holidays.map((h) => (
                <div key={h.id} className="flex items-center justify-between p-3 bg-[#1e1e1e] border border-gray-700 rounded-lg group">
                  <div>
                    <div className="font-medium text-red-200">{h.occasion}</div>
                    <div className="text-xs text-gray-500">
                      {new Date(h.holiday_date).toLocaleDateString("fa-IR")}
                    </div>
                  </div>
                  <button onClick={() => handleDelete(h.id)} className="p-1.5 text-red-400 hover:bg-red-900/30 rounded opacity-0 group-hover:opacity-100 transition-opacity">
                    <Trash2 size={16} />
                  </button>
                </div>
              ))
            )}
          </div>

        </div>
      </div>
    </div>
  );
}