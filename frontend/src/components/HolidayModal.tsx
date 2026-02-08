"use client";
import { useState } from "react";
import { X, Calendar, Check, Loader2 } from "lucide-react";
import api from "@/lib/api";
import DatePicker from "@/components/DatePicker";

export default function HolidayModal({ isOpen, onClose, onSuccess }: any) {
  const [occasion, setOccasion] = useState("");
  const [date, setDate] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPicker, setShowPicker] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if(!date) return alert("تاریخ الزامی است");
    setLoading(true);
    try {
      await api.post("/superadmin/holidays", { occasion, holiday_date: date });
      onSuccess();
      setOccasion(""); setDate("");
    } catch (err) {
      alert("خطا");
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
       <div className="w-full max-w-md bg-[#18181b] border border-white/10 rounded-2xl p-6 shadow-2xl">
          <div className="flex justify-between items-center mb-6">
             <h3 className="text-xl font-bold text-white flex gap-2 items-center"><Calendar size={20} className="text-red-500"/> ثبت تعطیلی</h3>
             <button onClick={onClose}><X className="text-gray-400 hover:text-white" /></button>
          </div>
          <form onSubmit={handleSubmit} className="space-y-4">
             <div>
                <label className="text-xs text-gray-400 mb-1 block">عنوان مناسبت</label>
                <input value={occasion} onChange={e=>setOccasion(e.target.value)} className="w-full bg-black/30 border border-white/10 rounded-xl px-4 py-3 text-white focus:border-red-500 outline-none" required placeholder="مثلا: نوروز" />
             </div>
             <div>
                <label className="text-xs text-gray-400 mb-1 block">تاریخ</label>
                <div onClick={() => setShowPicker(true)} className="w-full bg-black/30 border border-white/10 rounded-xl px-4 py-3 text-white cursor-pointer hover:bg-white/5">
                   {date || "انتخاب تاریخ"}
                </div>
             </div>
             <button disabled={loading} className="w-full bg-red-600 hover:bg-red-500 text-white font-bold py-3 rounded-xl flex items-center justify-center gap-2">
                {loading ? <Loader2 className="animate-spin" /> : <Check />} ثبت
             </button>
          </form>
       </div>
       {showPicker && (
          <div className="fixed inset-0 z-[200]">
             <DatePicker value={date} onChange={setDate} onClose={() => setShowPicker(false)} />
          </div>
       )}
    </div>
  );
}