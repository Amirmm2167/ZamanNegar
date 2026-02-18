"use client";

import { useState, useEffect } from "react";
import { CalendarEvent, Department } from "@/types";
import MobileMonthGrid from "./MobileMonthGrid";
import { getJalaliDay, toPersianDigits, isSameJalaliDay } from "@/lib/jalali";
import { Clock, MapPin, Plus } from "lucide-react";
import clsx from "clsx";
import { useContextMenuStore } from "@/stores/contextMenuStore";

interface MobileMonthViewProps {
  currentDate: Date; // From CalendarGrid (Month Navigation)
  events: CalendarEvent[];
  holidays: any[];
  departments: Department[];
  onEventClick: (e: CalendarEvent) => void;
  onSlotClick: (date: Date, hour: number) => void;
}

export default function MobileMonthView({
  currentDate,
  events,
  holidays,
  departments,
  onEventClick,
  onSlotClick
}: MobileMonthViewProps) {
  
  // State: The day user tapped on (Defaults to today if in current month, else 1st of month)
  const [selectedDate, setSelectedDate] = useState(new Date());
  const { openMenu } = useContextMenuStore();

  // Sync selection when month changes (User clicked Next/Prev Month)
  useEffect(() => {
    // If selected date is NOT in the new current month view, reset selection to start of that month
    // (Optional UX choice: keeps focus predictable)
    const isSameMonth = selectedDate.getMonth() === currentDate.getMonth() && selectedDate.getFullYear() === currentDate.getFullYear();
    if (!isSameMonth) {
        setSelectedDate(new Date(currentDate));
    }
  }, [currentDate]);

  // Filter events for the Bottom List
  const selectedEvents = events.filter(e => isSameJalaliDay(new Date(e.start_time), selectedDate))
                               .sort((a,b) => new Date(a.start_time).getTime() - new Date(b.start_time).getTime());

  // Get Holiday info for selected day
  const selectedHoliday = holidays.find(h => isSameJalaliDay(new Date(h.holiday_date), selectedDate));

  return (
    <div className="flex flex-col h-full bg-[#020205]">
      
      {/* TOP HALF: HEATMAP GRID (45%) */}
      <div className="h-[45%] min-h-[300px] shrink-0">
         <MobileMonthGrid 
            startDate={currentDate}
            selectedDate={selectedDate}
            events={events}
            holidays={holidays}
            departments={departments}
            onDateClick={setSelectedDate}
         />
      </div>

      {/* BOTTOM HALF: DAY DETAIL LIST (Remaining) */}
      <div className="flex-1 bg-[#18181b] rounded-t-2xl shadow-[0_-5px_20px_rgba(0,0,0,0.5)] overflow-hidden flex flex-col relative -mt-4 z-10 border-t border-white/5">
         
         {/* Day Header */}
         <div className="flex items-center justify-between p-4 border-b border-white/5 bg-white/[0.02]">
            <div className="flex items-center gap-3">
               <div className="flex flex-col items-center">
                  <span className="text-sm font-bold text-gray-400">
                    {selectedDate.toLocaleDateString('fa-IR', { weekday: 'long' })}
                  </span>
                  <span className="text-2xl font-bold text-white">
                    {toPersianDigits(getJalaliDay(selectedDate))}
                  </span>
               </div>
               {selectedHoliday && (
                  <div className="h-8 w-[1px] bg-white/10 mx-2" />
               )}
               {selectedHoliday && (
                  <span className="text-xs text-red-400 font-medium max-w-[150px] leading-tight">
                     {selectedHoliday.occasion}
                  </span>
               )}
            </div>

            {/* Add Event Button for this day */}
            <button 
                onClick={() => onSlotClick(selectedDate, 9)}
                className="w-10 h-10 bg-blue-600 rounded-full flex items-center justify-center text-white shadow-lg shadow-blue-900/30 active:scale-95 transition-transform"
            >
                <Plus size={20} />
            </button>
         </div>

         {/* Events List */}
         <div className="flex-1 overflow-y-auto p-4 space-y-3 custom-scrollbar">
            {selectedEvents.length === 0 ? (
               <div className="flex flex-col items-center justify-center h-32 text-gray-500 opacity-50 mt-10">
                  <p className="text-sm">هیچ رویدادی برای این روز ثبت نشده است</p>
               </div>
            ) : (
               selectedEvents.map(event => {
                  const dept = departments.find(d => d.id === event.department_id);
                  const color = dept?.color || "#6b7280";
                  const startTime = new Date(event.start_time);
                  const endTime = new Date(event.end_time);

                  return (
                     <div 
                        key={event.id}
                        onClick={() => onEventClick(event)}
                        onContextMenu={(e) => openMenu(e, 'event', event)}
                        className="bg-[#09090b] border border-white/5 p-4 rounded-xl relative overflow-hidden active:bg-white/5 transition-colors group"
                     >
                        <div className="absolute left-0 top-0 bottom-0 w-1" style={{ backgroundColor: color }} />
                        
                        <div className="flex justify-between items-start mb-2">
                           <h3 className="font-bold text-white text-sm group-hover:text-blue-300 transition-colors">{event.title}</h3>
                           {event.status === 'pending' && (
                              <span className="text-[10px] bg-yellow-500/10 text-yellow-500 px-2 py-0.5 rounded-full border border-yellow-500/20">
                                 بررسی
                              </span>
                           )}
                        </div>

                        <div className="flex items-center gap-4 text-xs text-gray-400">
                           <div className="flex items-center gap-1.5">
                              <Clock size={12} className={event.is_all_day ? "text-blue-400" : "text-gray-500"} />
                              {event.is_all_day ? (
                                 <span>تمام روز</span>
                              ) : (
                                 <span className="dir-ltr font-mono opacity-80">
                                    {toPersianDigits(startTime.toLocaleTimeString('fa-IR', {hour: '2-digit', minute:'2-digit'}))} 
                                    {" - "} 
                                    {toPersianDigits(endTime.toLocaleTimeString('fa-IR', {hour: '2-digit', minute:'2-digit'}))}
                                 </span>
                              )}
                           </div>
                           
                           {dept && (
                              <div className="flex items-center gap-1.5">
                                 <MapPin size={12} style={{ color }} />
                                 <span style={{ color }} className="opacity-90">{dept.name}</span>
                              </div>
                           )}
                        </div>
                     </div>
                  );
               })
            )}
            
            {/* Bottom spacer for FAB/Navbar */}
            <div className="h-16" />
         </div>
      </div>
    </div>
  );
}