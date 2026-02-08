"use client";

import { useState } from "react";
import api from "@/lib/api";
import { Radio, Send, Users, Globe, Building } from "lucide-react";
import DatePicker from "@/components/DatePicker";

export default function AdminBroadcasts() {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [date, setDate] = useState("");
  const [scope, setScope] = useState<"system" | "company">("system");
  const [loading, setLoading] = useState(false);

  const handleBroadcast = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title || !date) return;
    setLoading(true);

    try {
      // Create EventMaster with SYSTEM scope
      await api.post("/events/", {
        title,
        description,
        start_time: new Date(date).toISOString(),
        end_time: new Date(new Date(date).getTime() + 3600000).toISOString(), // +1 hour
        is_all_day: true,
        scope: scope, 
        target_rules: scope === "system" ? { include_all: true } : {}, // Simplified rule
        company_id: null
      });
      alert("رویداد سراسری با موفقیت ثبت شد!");
      setTitle("");
      setDescription("");
    } catch (err) {
      alert("خطا در ارسال رویداد");
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex items-center gap-3">
        <div className="p-3 bg-purple-500/20 rounded-xl text-purple-400">
          <Radio size={24} />
        </div>
        <div>
          <h2 className="text-2xl font-bold text-white">مرکز اعلان و رویدادهای سراسری</h2>
          <p className="text-sm text-gray-400">ارسال رویداد به تقویم تمام یا بخشی از سازمان‌ها</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Form */}
        <div className="lg:col-span-2 bg-[#1e1e1e] p-6 rounded-2xl border border-white/5">
           <form onSubmit={handleBroadcast} className="space-y-5">
              <div>
                 <label className="text-xs text-gray-500 mb-1 block">عنوان رویداد</label>
                 <input 
                   value={title}
                   onChange={e => setTitle(e.target.value)}
                   className="w-full bg-black/20 border border-white/10 rounded-xl px-4 py-3 text-white focus:border-purple-500 outline-none transition-colors"
                   placeholder="مثلا: جلسه عمومی مدیران"
                 />
              </div>
              <div>
                 <label className="text-xs text-gray-500 mb-1 block">توضیحات</label>
                 <textarea 
                   rows={4}
                   value={description}
                   onChange={e => setDescription(e.target.value)}
                   className="w-full bg-black/20 border border-white/10 rounded-xl px-4 py-3 text-white focus:border-purple-500 outline-none transition-colors"
                   placeholder="جزئیات رویداد..."
                 />
              </div>
              <div className="grid grid-cols-2 gap-4">
                 <div>
                    <label className="text-xs text-gray-500 mb-1 block">تاریخ اجرا</label>
                    <div onClick={() => {}} className="relative"> 
                       {/* Simplified: In real app use state to toggle DatePicker */}
                       <input 
                          type="date"
                          value={date}
                          onChange={e => setDate(e.target.value)}
                          className="w-full bg-black/20 border border-white/10 rounded-xl px-4 py-3 text-white focus:border-purple-500 outline-none"
                       />
                    </div>
                 </div>
                 <div>
                    <label className="text-xs text-gray-500 mb-1 block">دامنه انتشار</label>
                    <div className="flex bg-black/20 rounded-xl p-1 border border-white/10">
                       <button
                         type="button"
                         onClick={() => setScope("system")}
                         className={`flex-1 py-2 rounded-lg text-xs font-bold flex items-center justify-center gap-2 transition-all ${scope === 'system' ? 'bg-purple-600 text-white shadow-lg' : 'text-gray-500 hover:text-white'}`}
                       >
                          <Globe size={14} /> کل سیستم
                       </button>
                       <button
                         type="button"
                         onClick={() => setScope("company")}
                         className={`flex-1 py-2 rounded-lg text-xs font-bold flex items-center justify-center gap-2 transition-all ${scope === 'company' ? 'bg-purple-600 text-white shadow-lg' : 'text-gray-500 hover:text-white'}`}
                       >
                          <Building size={14} /> انتخابی
                       </button>
                    </div>
                 </div>
              </div>

              <button 
                type="submit" 
                disabled={loading}
                className="w-full bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-500 hover:to-blue-500 text-white font-bold py-3 rounded-xl shadow-lg shadow-purple-900/20 flex items-center justify-center gap-2 transition-all"
              >
                 <Send size={18} />
                 {loading ? "در حال ارسال..." : "انتشار رویداد"}
              </button>
           </form>
        </div>

        {/* Info / Preview */}
        <div className="bg-[#1e1e1e] p-6 rounded-2xl border border-white/5 flex flex-col items-center text-center justify-center space-y-4">
           <div className="w-20 h-20 rounded-full bg-gradient-to-br from-purple-500/20 to-blue-500/20 flex items-center justify-center relative">
              <Users size={32} className="text-white opacity-80" />
              <div className="absolute inset-0 border-2 border-dashed border-white/10 rounded-full animate-[spin_10s_linear_infinite]"></div>
           </div>
           <div>
              <h3 className="text-white font-bold">هدف: تمام کاربران</h3>
              <p className="text-xs text-gray-400 mt-2 leading-relaxed">
                 با انتشار در سطح سیستم، این رویداد در تقویم تمامی سازمان‌ها و دپارتمان‌ها به صورت قفل شده نمایش داده خواهد شد.
              </p>
           </div>
        </div>
      </div>
    </div>
  );
}