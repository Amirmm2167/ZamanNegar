"use client";

import { useState, useEffect } from "react";
import { CalendarEvent } from "@/types";
import { toPersianDigits } from "@/lib/utils";
import { Clock, Calendar as CalIcon, AlignLeft, Check, X } from "lucide-react";
import api from "@/lib/api";

interface MobileEventSheetProps {
  event: CalendarEvent | null; // Null if it's a draft
  draftSlot: { date: Date; startHour: number; endHour: number } | null;
  isExpanded: boolean;
  canEdit: boolean;
  onClose: () => void;
  onRefresh: () => void;
}

export default function MobileEventSheet({
  event,
  draftSlot,
  isExpanded,
  canEdit,
  onClose,
  onRefresh
}: MobileEventSheetProps) {
  // Form State
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [loading, setLoading] = useState(false);

  // Initialize
  useEffect(() => {
    if (event) {
      setTitle(event.title);
      setDescription(event.description || "");
    } else {
      setTitle("");
      setDescription("");
    }
  }, [event, draftSlot]);

  // Calculate Display Time
  const startTime = event ? new Date(event.start_time) : (draftSlot ? new Date(draftSlot.date) : new Date());
  const endTime = event ? new Date(event.end_time) : (draftSlot ? new Date(draftSlot.date) : new Date());
  
  if (draftSlot && !event) {
      startTime.setHours(draftSlot.startHour, 0, 0, 0);
      endTime.setHours(draftSlot.endHour, 0, 0, 0);
  }

  const handleSave = async () => {
    if (!title.trim()) return alert("عنوان الزامی است");
    setLoading(true);
    try {
        const payload = {
            title,
            description,
            start_time: startTime.toISOString(),
            end_time: endTime.toISOString(),
            // Default props for draft
            is_all_day: false,
            status: "pending" 
        };

        if (event) {
            await api.patch(`/events/${event.id}`, payload);
        } else {
            await api.post("/events/", payload);
        }
        onRefresh();
        onClose();
    } catch (e) {
        alert("خطا در ذخیره سازی");
    } finally {
        setLoading(false);
    }
  };

  // --- RENDER ---

  // 1. SUMMARY VIEW (Collapsed)
  if (!isExpanded) {
    return (
      <div className="p-6 flex flex-col h-full justify-between">
        <div>
            <div className="flex items-center gap-3 mb-2 text-blue-400">
                <Clock size={20} />
                <span className="text-lg font-bold">
                    {toPersianDigits(startTime.toLocaleTimeString("fa-IR", {hour:'2-digit', minute:'2-digit'}))} - 
                    {toPersianDigits(endTime.toLocaleTimeString("fa-IR", {hour:'2-digit', minute:'2-digit'}))}
                </span>
            </div>
            <h2 className="text-2xl font-bold text-white mb-1">
                {event ? event.title : "رویداد جدید"}
            </h2>
            <p className="text-sm text-gray-400">
                {new Date(startTime).toLocaleDateString("fa-IR", { weekday: 'long', day: 'numeric', month: 'long' })}
            </p>
        </div>

        {/* Quick Actions */}
        <div className="grid grid-cols-2 gap-3 mt-4">
            <button onClick={onClose} className="py-3 rounded-xl bg-white/5 text-gray-300 font-bold">بستن</button>
            {canEdit && (
                <button className="py-3 rounded-xl bg-blue-600/20 text-blue-400 font-bold border border-blue-500/30">
                    {/* Visual cue only, gesture handles it */}
                    ویرایش (بالا بکشید)
                </button>
            )}
        </div>
      </div>
    );
  }

  // 2. FULL SCREEN EDITOR (Expanded)
  return (
    <div className="p-6 space-y-6">
       <div className="flex items-center justify-between">
           <h2 className="text-xl font-bold text-white">{event ? "ویرایش رویداد" : "ایجاد رویداد"}</h2>
           {loading && <span className="text-xs text-blue-400 animate-pulse">در حال ذخیره...</span>}
       </div>

       {canEdit ? (
           <div className="space-y-4">
               <div>
                   <label className="text-xs text-gray-500 mb-1 block">عنوان</label>
                   <input 
                      value={title}
                      onChange={(e) => setTitle(e.target.value)}
                      className="w-full bg-white/5 border border-white/10 rounded-xl p-4 text-white focus:border-blue-500 outline-none"
                      placeholder="عنوان رویداد..."
                   />
               </div>
               
               <div>
                   <label className="text-xs text-gray-500 mb-1 block">توضیحات</label>
                   <textarea 
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                      className="w-full bg-white/5 border border-white/10 rounded-xl p-4 text-white focus:border-blue-500 outline-none h-32 resize-none"
                      placeholder="توضیحات تکمیلی..."
                   />
               </div>

               {/* Add TimePickers here if needed, keeping it simple for now as requested */}

               <div className="pt-4 flex gap-3">
                   <button onClick={onClose} className="flex-1 py-4 rounded-xl bg-red-500/10 text-red-400 font-bold">لغو</button>
                   <button onClick={handleSave} className="flex-1 py-4 rounded-xl bg-blue-600 text-white font-bold shadow-lg shadow-blue-900/40">
                       {loading ? "..." : "ذخیره تغییرات"}
                   </button>
               </div>
           </div>
       ) : (
           // View Only Mode
           <div className="space-y-4 text-gray-300">
               <div className="p-4 bg-white/5 rounded-xl border border-white/10">
                   <h3 className="font-bold text-white mb-2 text-lg">{event?.title}</h3>
                   <div className="flex gap-2 text-sm text-gray-400">
                       <Clock size={16} />
                       <span>{startTime.toLocaleTimeString()} - {endTime.toLocaleTimeString()}</span>
                   </div>
               </div>
               
               <div className="p-4 bg-white/5 rounded-xl border border-white/10 flex gap-3">
                   <AlignLeft size={20} className="text-gray-500" />
                   <p className="leading-relaxed">{event?.description || "توضیحات ندارد."}</p>
               </div>
           </div>
       )}
    </div>
  );
}