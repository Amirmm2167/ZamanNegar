"use client";

import { useEffect, useState, useMemo, useRef } from "react";
import { format, addMonths, subMonths, isSameDay, isAfter, startOfDay } from "date-fns-jalali";
import { Loader2, Calendar as CalendarIcon, MapPin, Clock, AlertCircle } from "lucide-react";
import api from "@/lib/api";
import { EventInstance } from "@/types";
import { useAuthStore } from "@/stores/authStore";
import { toPersianDigits } from "@/lib/utils";
import clsx from "clsx";

export default function AgendaView() {
  const { activeCompanyId } = useAuthStore();
  const [events, setEvents] = useState<EventInstance[]>([]);
  const [loading, setLoading] = useState(true);
  const scrollRef = useRef<HTMLDivElement>(null);

  // 1. Fetch Logic
  const fetchEvents = async () => {
    if (!activeCompanyId) return;
    setLoading(true);
    try {
      // Fetch window: 1 month back to 3 months forward
      // In Phase 3 (Virtualization), this will be dynamic
      const now = new Date();
      const start = subMonths(now, 1).toISOString();
      const end = addMonths(now, 3).toISOString();

      const response = await api.get<EventInstance[]>("/events/", {
        params: { start, end }
      });
      setEvents(response.data);
    } catch (error) {
      console.error("Failed to fetch events:", error);
    } finally {
      setLoading(false);
    }
  };

  // Refetch when Company Context changes
  useEffect(() => {
    fetchEvents();
  }, [activeCompanyId]);

  // 2. Group Events by Date (Persian)
  const groupedEvents = useMemo(() => {
    const groups: { date: Date; items: EventInstance[] }[] = [];
    
    if (events.length === 0) return [];

    // Sort by time
    const sorted = [...events].sort((a, b) => 
      new Date(a.start_time).getTime() - new Date(b.start_time).getTime()
    );

    let currentDateGroup: Date | null = null;
    let currentItems: EventInstance[] = [];

    sorted.forEach((event) => {
      const eventDate = new Date(event.start_time);
      
      if (!currentDateGroup || !isSameDay(eventDate, currentDateGroup)) {
        if (currentDateGroup) {
          groups.push({ date: currentDateGroup, items: currentItems });
        }
        currentDateGroup = eventDate;
        currentItems = [event];
      } else {
        currentItems.push(event);
      }
    });

    if (currentDateGroup) {
      groups.push({ date: currentDateGroup, items: currentItems });
    }

    return groups;
  }, [events]);

  // 3. Auto-Scroll to Today (On Load)
  useEffect(() => {
    if (!loading && groupedEvents.length > 0 && scrollRef.current) {
       // Find the "Today" or "Next Upcoming" group element
       // This is a simple implementation; Phase 3 will use virtualizer.scrollToIndex
       const todayId = `group-${format(new Date(), "yyyy-MM-dd")}`;
       const element = document.getElementById(todayId);
       
       if (element) {
         element.scrollIntoView({ behavior: "smooth", block: "start" });
       }
    }
  }, [loading, groupedEvents]);

  // --- Render Helpers ---

  const getDayLabel = (date: Date) => {
    if (isSameDay(date, new Date())) return "امروز";
    return format(date, "EEEE");
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'approved': return 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400';
      case 'rejected': return 'bg-red-500/10 border-red-500/20 text-red-400';
      case 'cancelled': return 'bg-gray-500/10 border-gray-500/20 text-gray-400 line-through';
      default: return 'bg-blue-500/10 border-blue-500/20 text-blue-400'; // Pending
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-blue-500">
        <Loader2 className="animate-spin mb-2" size={32} />
        <span className="text-sm font-medium">در حال دریافت برنامه...</span>
      </div>
    );
  }

  if (events.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-gray-500">
        <div className="w-16 h-16 bg-white/5 rounded-full flex items-center justify-center mb-4">
           <CalendarIcon size={32} className="opacity-50" />
        </div>
        <p className="text-lg font-medium text-gray-300">هیچ رویدادی یافت نشد</p>
        <p className="text-sm mt-1">برای این بازه زمانی برنامه‌ای ثبت نشده است.</p>
        <button 
           onClick={fetchEvents}
           className="mt-6 px-4 py-2 bg-blue-600/20 text-blue-400 rounded-xl hover:bg-blue-600/30 transition-colors text-sm"
        >
          تلاش مجدد
        </button>
      </div>
    );
  }

  return (
    <div ref={scrollRef} className="h-full overflow-y-auto custom-scrollbar p-4 space-y-6 pb-24">
      {groupedEvents.map((group) => {
        const isToday = isSameDay(group.date, new Date());
        const groupId = `group-${format(group.date, "yyyy-MM-dd")}`;
        
        return (
          <div key={groupId} id={groupId} className={clsx("relative", isToday && "bg-blue-500/5 -mx-4 px-4 py-2 rounded-xl border-y border-blue-500/10")}>
            
            {/* Sticky Date Header */}
            <div className="sticky top-0 z-10 bg-[#0a0c10]/95 backdrop-blur-sm py-3 mb-2 flex items-center gap-3 border-b border-white/5">
              <div className={clsx("text-2xl font-bold", isToday ? "text-blue-500" : "text-white")}>
                {toPersianDigits(format(group.date, "d"))}
              </div>
              <div className="flex flex-col">
                <span className={clsx("text-sm font-bold", isToday ? "text-blue-400" : "text-gray-300")}>
                   {getDayLabel(group.date)}
                </span>
                <span className="text-xs text-gray-500">
                   {format(group.date, "MMMM yyyy")}
                </span>
              </div>
              {isToday && (
                <span className="mr-auto text-xs bg-blue-500 text-white px-2 py-0.5 rounded-full">
                  امروز
                </span>
              )}
            </div>

            {/* Events List */}
            <div className="space-y-3">
              {group.items.map((event) => {
                const startTime = new Date(event.start_time);
                const endTime = new Date(event.end_time);
                
                return (
                  <div 
                    key={event.id}
                    className={clsx(
                      "group relative p-4 rounded-2xl border transition-all hover:scale-[1.01] cursor-pointer",
                      getStatusColor(event.status),
                      "bg-opacity-50 hover:bg-opacity-70"
                    )}
                  >
                     {/* Time Column */}
                     <div className="flex justify-between items-start mb-2">
                        <div className="flex items-center gap-2 text-sm font-bold">
                           <Clock size={16} />
                           {event.is_all_day ? (
                             <span>تمام روز</span>
                           ) : (
                             <span>
                               {toPersianDigits(format(startTime, "HH:mm"))} - {toPersianDigits(format(endTime, "HH:mm"))}
                             </span>
                           )}
                        </div>
                        
                        {/* Status Badge (if not approved/pending default) */}
                        {event.status !== 'approved' && event.status !== 'pending' && (
                           <div className="flex items-center gap-1 text-xs px-2 py-1 rounded bg-black/20">
                              <AlertCircle size={12} />
                              <span>{event.status === 'rejected' ? 'رد شده' : 'لغو شده'}</span>
                           </div>
                        )}
                     </div>

                     {/* Title */}
                     <h3 className="text-base font-bold text-white mb-1 group-hover:text-blue-200 transition-colors">
                       {event.title}
                     </h3>
                     
                     {/* Metadata Placeholders (Since Instance doesn't have them yet, we show generic info) */}
                     {/* Phase 3: We will fetch full details on click */}
                     <div className="flex items-center gap-4 text-xs opacity-70 mt-2">
                        {event.department_id && (
                           <div className="flex items-center gap-1">
                              <MapPin size={12} />
                              <span>دپارتمان {toPersianDigits(event.department_id)}</span>
                           </div>
                        )}
                        {/* Add more icons here if needed */}
                     </div>
                     
                  </div>
                );
              })}
            </div>
          </div>
        );
      })}
      
      {/* End of List Indicator */}
      <div className="text-center py-8 text-xs text-gray-600">
         پایان لیست رویدادها
      </div>
    </div>
  );
}