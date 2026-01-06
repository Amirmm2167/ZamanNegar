"use client";

import { CalendarEvent, Department } from "@/types";
import { Clock, AlignLeft, Calendar as CalendarIcon, Edit2, Users, Target, User } from "lucide-react";
import { toPersianDigits } from "@/lib/jalali";

interface QuickViewSheetProps {
  event: CalendarEvent;
  departments: Department[];
  onEdit: () => void;
  onClose: () => void;
}

export default function QuickViewSheet({ event, departments, onEdit, onClose }: QuickViewSheetProps) {
  const start = new Date(event.start_time);
  const end = new Date(event.end_time);
  
  const dept = departments.find(d => d.id === event.department_id);
  
  const formatTime = (date: Date) => 
    toPersianDigits(date.toLocaleTimeString("fa-IR", { hour: '2-digit', minute: '2-digit', hour12: false }));
    
  const formatDate = (date: Date) =>
    new Intl.DateTimeFormat("fa-IR", { weekday: 'long', day: 'numeric', month: 'long' }).format(date);

  return (
    <div className="p-6 flex flex-col gap-5 text-right pb-10" dir="rtl">
      {/* Header */}
      <div className="flex justify-between items-start">
         <div className="flex-1">
             <div className="flex items-center gap-2 mb-1">
                 {dept && (
                     <span 
                        className="text-[10px] px-2 py-0.5 rounded-full font-bold"
                        style={{ backgroundColor: `${dept.color}20`, color: dept.color }}
                     >
                        {dept.name}
                     </span>
                 )}
                 {event.status === 'pending' && (
                     <span className="text-[10px] px-2 py-0.5 rounded-full bg-yellow-500/20 text-yellow-500 font-bold">
                        در انتظار تایید
                     </span>
                 )}
             </div>
             <h2 className="text-xl font-black text-white leading-tight">{event.title}</h2>
         </div>
      </div>

      {/* Time & Date */}
      <div className="flex flex-col gap-2 p-4 bg-white/5 rounded-2xl border border-white/5">
          <div className="flex items-center gap-3 text-gray-300">
              <CalendarIcon size={18} className="text-blue-400" />
              <span className="text-sm font-medium">{formatDate(start)}</span>
          </div>
          <div className="flex items-center gap-3 text-gray-300">
              <Clock size={18} className="text-orange-400" />
              <div className="flex items-center gap-2 text-sm font-bold">
                  <span>{formatTime(start)}</span>
                  <span className="text-gray-500 text-xs">تا</span>
                  <span>{formatTime(end)}</span>
              </div>
          </div>
      </div>

      {/* Meta Data Grid */}
      <div className="grid grid-cols-2 gap-3">
          {event.organizer && (
             <div className="p-3 bg-white/5 rounded-xl border border-white/5 flex flex-col gap-1">
                 <div className="flex items-center gap-2 text-gray-500 text-xs">
                    <User size={14} />
                    <span>برگزارکننده</span>
                 </div>
                 <span className="text-sm text-gray-200 truncate">{event.organizer}</span>
             </div>
          )}
          {event.target_audience && (
             <div className="p-3 bg-white/5 rounded-xl border border-white/5 flex flex-col gap-1">
                 <div className="flex items-center gap-2 text-gray-500 text-xs">
                    <Users size={14} />
                    <span>مخاطبین</span>
                 </div>
                 <span className="text-sm text-gray-200 truncate">{event.target_audience}</span>
             </div>
          )}
      </div>

      {/* Description */}
      {event.description && (
          <div className="flex gap-3">
              <AlignLeft size={20} className="text-gray-500 mt-1 shrink-0" />
              <p className="text-sm text-gray-300 leading-relaxed whitespace-pre-wrap">
                  {event.description}
              </p>
          </div>
      )}

      {/* Actions */}
      <button 
        onClick={onEdit}
        className="mt-4 w-full py-3.5 bg-blue-600 hover:bg-blue-500 text-white rounded-xl font-bold flex items-center justify-center gap-2 shadow-lg transition-all active:scale-[0.98]"
      >
          <Edit2 size={18} />
          <span>ویرایش و جزئیات کامل</span>
      </button>
    </div>
  );
}