"use client";

import { useState, useEffect } from "react";
import { CalendarEvent } from "@/types";
import { AlignLeft, Calendar as CalendarIcon, Clock, Flag, Target, Trash2, Check } from "lucide-react";
import { toPersianDigits } from "@/lib/utils";
import api from "@/lib/api";
import { useMutation } from "@tanstack/react-query";
import clsx from "clsx";
import DatePicker from "@/components/DatePicker";
import TimePicker from "@/components/TimePicker";

interface MobileEventSheetProps {
  event: CalendarEvent | null;
  draftSlot: { date: Date; startHour: number; endHour: number } | null;
  isExpanded: boolean;
  canEdit: boolean;
  onClose: () => void;
  onRefresh: () => void;
  isEditing?: boolean;
}

export default function MobileEventSheet({
  event,
  draftSlot,
  isExpanded,
  canEdit,
  onClose,
  onRefresh,
  isEditing = false,
}: MobileEventSheetProps) {
  const [mode, setMode] = useState<"view" | "edit">("view");
  const [formData, setFormData] = useState<Partial<CalendarEvent>>({});
  const [loading, setLoading] = useState(false);
  
  // Picker visibility states to satisfy the onClose requirement logic if needed
  // For now, we just pass empty functions to satisfy the prop requirement 
  // as the pickers in this sheet seem to be inline or managed differently.
  // Actually, DatePicker usually opens a modal. Let's add state if we want real closing.
  // But based on the code provided, they seem inline. We will pass a no-op.

  useEffect(() => {
    if (isEditing || !event) {
        setMode("edit");
    } else {
        setMode("view");
    }
  }, [isEditing, event]);

  useEffect(() => {
    if (event) {
      setFormData({ ...event });
    } else if (draftSlot) {
      const start = new Date(draftSlot.date);
      start.setHours(draftSlot.startHour, 0, 0);
      const end = new Date(draftSlot.date);
      end.setHours(draftSlot.endHour, 0, 0);

      setFormData({
        title: "",
        start_time: start.toISOString(),
        end_time: end.toISOString(),
        is_all_day: false,
      });
    }
  }, [event, draftSlot]);

  const saveMutation = useMutation({
    mutationFn: (data: any) => {
      if (event?.id) return api.patch(`/events/${event.id}`, data);
      return api.post("/events/", data);
    },
    onSuccess: () => {
      onRefresh();
      onClose();
    },
  });

  const deleteMutation = useMutation({
    mutationFn: () => api.delete(`/events/${event!.id}`),
    onSuccess: () => {
      onRefresh();
      onClose();
    },
  });

  const handleSave = () => {
    setLoading(true);
    saveMutation.mutate(formData);
  };

  // Fixed Helper
  const formatDateTime = (iso: string) => {
    if (!iso) return { date: "-", time: "-" };
    const d = new Date(iso);
    return {
        date: d.toLocaleDateString("fa-IR"),
        time: toPersianDigits(d.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" }))
    };
  };

  if (mode === "view" && event) {
    const start = formatDateTime(event.start_time);
    const end = formatDateTime(event.end_time);

    return (
      <div className="h-full flex flex-col p-6 space-y-6">
        <div className="flex justify-between items-start">
           <div>
              <h2 className="text-2xl font-bold text-white leading-snug">{event.title}</h2>
              <div className="flex items-center gap-2 mt-2">
                 <span className={`w-2 h-2 rounded-full ${event.status === 'approved' ? 'bg-emerald-500' : 'bg-yellow-500'}`} />
                 <span className="text-sm text-gray-400">
                    {event.status === 'approved' ? 'تایید شده' : event.status === 'rejected' ? 'رد شده' : 'در انتظار بررسی'}
                 </span>
              </div>
           </div>
           {canEdit && (
             <button onClick={() => setMode("edit")} className="p-2 bg-white/10 rounded-full text-blue-400 hover:bg-white/20 transition-colors">
                <AlignLeft size={20} />
             </button>
           )}
        </div>

        <div className="bg-white/5 border border-white/10 rounded-2xl p-4 flex flex-col gap-4">
            <div className="flex justify-between items-center">
                <div className="flex items-center gap-3">
                    <div className="p-2 bg-blue-500/20 text-blue-400 rounded-lg"><CalendarIcon size={18} /></div>
                    <div className="flex flex-col">
                        <span className="text-xs text-gray-500">تاریخ</span>
                        <span className="font-bold">{start.date}</span>
                    </div>
                </div>
                {event.is_all_day && <span className="text-xs bg-blue-500/20 text-blue-300 px-2 py-1 rounded">تمام روز</span>}
            </div>
            <div className="h-px bg-white/10 w-full" />
            <div className="flex justify-between items-center">
                <div className="flex items-center gap-3">
                    <div className="p-2 bg-purple-500/20 text-purple-400 rounded-lg"><Clock size={18} /></div>
                    <div className="flex flex-col">
                        <span className="text-xs text-gray-500">زمان</span>
                        <span className="font-bold font-mono dir-ltr">{start.time} - {end.time}</span>
                    </div>
                </div>
            </div>
        </div>

        {event.description && (
            <div className="space-y-2">
                <h3 className="text-sm font-bold text-gray-400">توضیحات</h3>
                <p className="text-gray-300 leading-relaxed text-sm bg-black/20 p-3 rounded-xl border border-white/5">
                    {event.description}
                </p>
            </div>
        )}

        <div className="grid grid-cols-2 gap-3">
            {event.goal && (
                <div className="bg-white/5 p-3 rounded-xl border border-white/5">
                    <div className="text-xs text-yellow-500/80 mb-1 flex items-center gap-1"><Flag size={12}/> هدف</div>
                    <div className="text-sm text-gray-300 truncate">{event.goal}</div>
                </div>
            )}
            {(event as any).target_audience && (
                <div className="bg-white/5 p-3 rounded-xl border border-white/5">
                    <div className="text-xs text-blue-500/80 mb-1 flex items-center gap-1"><Target size={12}/> مخاطبین</div>
                    <div className="text-sm text-gray-300 truncate">{(event as any).target_audience}</div>
                </div>
            )}
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col relative">
       <div className="flex items-center justify-between px-6 py-4 border-b border-white/10 bg-[#09090b]/50 backdrop-blur-md sticky top-0 z-10">
          <h3 className="font-bold text-white">{event ? "ویرایش رویداد" : "رویداد جدید"}</h3>
          {event && (
             <button onClick={() => setMode("view")} className="text-sm text-gray-400 hover:text-white">لغو</button>
          )}
       </div>

       <div className="flex-1 overflow-y-auto custom-scrollbar p-6 space-y-6">
          <div className="space-y-2">
             <label className="text-xs text-gray-400 font-bold">عنوان</label>
             <input 
                value={formData.title || ""}
                onChange={(e) => setFormData({...formData, title: e.target.value})}
                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white focus:border-blue-500 outline-none transition-colors"
                placeholder="نام رویداد..."
             />
          </div>

          <div className="space-y-4">
             <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                   <label className="text-xs text-gray-400">تاریخ شروع</label>
                   <DatePicker 
                      value={formData.start_time?.split("T")[0] || ""}
                      onChange={(d) => {
                         const time = formData.start_time?.split("T")[1] || "09:00:00";
                         setFormData({...formData, start_time: `${d}T${time}`});
                      }}
                      onClose={() => {}} // Added dummy handler
                   />
                </div>
                <div className="space-y-2">
                   <label className="text-xs text-gray-400">ساعت شروع</label>
                   <TimePicker 
                      value={formData.start_time ? new Date(formData.start_time).toLocaleTimeString("en-GB", {hour:"2-digit", minute:"2-digit"}) : "09:00"}
                      onChange={(t) => {
                         const date = formData.start_time?.split("T")[0] || new Date().toISOString().split("T")[0];
                         setFormData({...formData, start_time: `${date}T${t}:00`});
                      }}
                      onClose={() => {}} // Added dummy handler
                   />
                </div>
             </div>

             <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                   <label className="text-xs text-gray-400">تاریخ پایان</label>
                   <DatePicker 
                      value={formData.end_time?.split("T")[0] || ""}
                      onChange={(d) => {
                         const time = formData.end_time?.split("T")[1] || "10:00:00";
                         setFormData({...formData, end_time: `${d}T${time}`});
                      }}
                      onClose={() => {}} // Added dummy handler
                   />
                </div>
                <div className="space-y-2">
                   <label className="text-xs text-gray-400">ساعت پایان</label>
                   <TimePicker 
                      value={formData.end_time ? new Date(formData.end_time).toLocaleTimeString("en-GB", {hour:"2-digit", minute:"2-digit"}) : "10:00"}
                      onChange={(t) => {
                         const date = formData.end_time?.split("T")[0] || new Date().toISOString().split("T")[0];
                         setFormData({...formData, end_time: `${date}T${t}:00`});
                      }}
                      onClose={() => {}} // Added dummy handler
                   />
                </div>
             </div>
          </div>

          <div className="space-y-2">
             <label className="text-xs text-gray-400 font-bold">توضیحات</label>
             <textarea 
                value={formData.description || ""}
                onChange={(e) => setFormData({...formData, description: e.target.value})}
                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white focus:border-blue-500 outline-none h-24 resize-none"
                placeholder="توضیحات تکمیلی..."
             />
          </div>
       </div>

       <div className="p-4 border-t border-white/10 bg-[#09090b] flex gap-3">
          {event && (
             <button 
               onClick={() => { if(confirm('حذف شود؟')) deleteMutation.mutate(); }}
               className="p-3 bg-red-500/10 text-red-400 rounded-xl hover:bg-red-500/20"
             >
                <Trash2 size={20} />
             </button>
          )}
          <button 
             onClick={handleSave}
             disabled={loading || !formData.title}
             className={clsx(
                "flex-1 bg-blue-600 text-white rounded-xl font-bold py-3 flex items-center justify-center gap-2 hover:bg-blue-500 transition-colors",
                (loading || !formData.title) && "opacity-50 cursor-not-allowed"
             )}
          >
             {loading ? "در حال ذخیره..." : (
                <>
                   <Check size={18} />
                   {event ? "ذخیره تغییرات" : "ثبت رویداد"}
                </>
             )}
          </button>
       </div>
    </div>
  );
}