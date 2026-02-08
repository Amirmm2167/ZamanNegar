"use client";

import { useEffect, useState, useMemo, useRef } from "react";
import { format, addMonths, subMonths, isSameDay } from "date-fns-jalali";
import { Loader2, Calendar as CalendarIcon, MapPin, Clock, AlertCircle } from "lucide-react";
import { useVirtualizer } from "@tanstack/react-virtual"; // <--- NEW
import api from "@/lib/api";
import { EventInstance } from "@/types";
import { useAuthStore } from "@/stores/authStore";
import { toPersianDigits } from "@/lib/utils";
import clsx from "clsx";

// Flattened Type for Virtualization
type AgendaItem = 
  | { type: 'header'; date: Date; id: string; label: string; monthLabel: string; isToday: boolean }
  | { type: 'event'; data: EventInstance; id: string };

export default function AgendaView({ 
  onEventClick 
}: { 
  onEventClick?: (event: EventInstance) => void 
}) {
  const { activeCompanyId } = useAuthStore();
  const [events, setEvents] = useState<EventInstance[]>([]);
  const [loading, setLoading] = useState(true);
  const parentRef = useRef<HTMLDivElement>(null);

  // 1. Fetch Logic (Wider Range for Virtualization)
  const fetchEvents = async () => {
    if (!activeCompanyId) return;
    setLoading(true);
    try {
      const now = new Date();
      // Fetch 2 months back to 6 months forward to allow long scrolling
      const start = subMonths(now, 2).toISOString();
      const end = addMonths(now, 6).toISOString();

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

  useEffect(() => {
    fetchEvents();
  }, [activeCompanyId]);

  // 2. Flatten Data for Virtualizer
  const { items, todayIndex } = useMemo(() => {
    const flatList: AgendaItem[] = [];
    let foundTodayIndex = -1;
    
    if (events.length === 0) return { items: [], todayIndex: -1 };

    const sorted = [...events].sort((a, b) => 
      new Date(a.start_time).getTime() - new Date(b.start_time).getTime()
    );

    let currentDateGroup: Date | null = null;

    sorted.forEach((event) => {
      const eventDate = new Date(event.start_time);
      const isToday = isSameDay(eventDate, new Date());

      // New Group Header
      if (!currentDateGroup || !isSameDay(eventDate, currentDateGroup)) {
        currentDateGroup = eventDate;
        
        // Track Today's Header Index
        if (isToday && foundTodayIndex === -1) {
            foundTodayIndex = flatList.length;
        }

        flatList.push({
          type: 'header',
          date: eventDate,
          id: `header-${eventDate.toISOString()}`,
          label: isToday ? "امروز" : format(eventDate, "EEEE"),
          monthLabel: format(eventDate, "MMMM yyyy"),
          isToday
        });
      }

      // Event Item
      flatList.push({
        type: 'event',
        data: event,
        id: `event-${event.id}`
      });
    });

    return { items: flatList, todayIndex: foundTodayIndex };
  }, [events]);

  // 3. Virtualizer Setup
  const rowVirtualizer = useVirtualizer({
    count: items.length,
    getScrollElement: () => parentRef.current,
    estimateSize: (index) => items[index].type === 'header' ? 60 : 100, // Estimate heights
    overscan: 5,
  });

  // 4. Auto-Scroll to Today
  useEffect(() => {
    if (!loading && todayIndex !== -1 && rowVirtualizer) {
       rowVirtualizer.scrollToIndex(todayIndex, { align: 'start' });
    }
  }, [loading, todayIndex]); // Run once when loaded

  // --- Render Helpers ---
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'approved': return 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400';
      case 'rejected': return 'bg-red-500/10 border-red-500/20 text-red-400';
      case 'cancelled': return 'bg-gray-500/10 border-gray-500/20 text-gray-400 line-through';
      default: return 'bg-blue-500/10 border-blue-500/20 text-blue-400';
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
        <button onClick={fetchEvents} className="mt-6 px-4 py-2 bg-blue-600/20 text-blue-400 rounded-xl hover:bg-blue-600/30 transition-colors text-sm">
          تلاش مجدد
        </button>
      </div>
    );
  }

  return (
    <div 
      ref={parentRef} 
      className="h-full overflow-y-auto custom-scrollbar px-4 pb-24"
    >
      <div
        style={{
          height: `${rowVirtualizer.getTotalSize()}px`,
          width: '100%',
          position: 'relative',
        }}
      >
        {rowVirtualizer.getVirtualItems().map((virtualRow) => {
          const item = items[virtualRow.index];
          
          return (
            <div
              key={item.id}
              style={{
                position: 'absolute',
                top: 0,
                left: 0,
                width: '100%',
                height: `${virtualRow.size}px`,
                transform: `translateY(${virtualRow.start}px)`,
              }}
              className="py-1" // Gap between items
            >
              
              {/* HEADER ITEM */}
              {item.type === 'header' && (
                <div className={clsx("flex items-center gap-3 py-3 border-b border-white/5", item.isToday ? "text-blue-500" : "text-white")}>
                  <div className="text-2xl font-bold">
                    {toPersianDigits(format(item.date, "d"))}
                  </div>
                  <div className="flex flex-col">
                    <span className={clsx("text-sm font-bold", item.isToday ? "text-blue-400" : "text-gray-300")}>
                       {item.label}
                    </span>
                    <span className="text-xs text-gray-500">
                       {item.monthLabel}
                    </span>
                  </div>
                  {item.isToday && (
                    <span className="mr-auto text-xs bg-blue-500 text-white px-2 py-0.5 rounded-full">
                      امروز
                    </span>
                  )}
                </div>
              )}

              {/* EVENT ITEM */}
              {item.type === 'event' && (
                <div 
                  onClick={() => onEventClick?.(item.data)}
                  className={clsx(
                    "group relative p-4 rounded-2xl border transition-all hover:scale-[1.01] cursor-pointer h-full",
                    getStatusColor(item.data.status),
                    "bg-opacity-50 hover:bg-opacity-70"
                  )}
                >
                   <div className="flex justify-between items-start mb-1">
                      <div className="flex items-center gap-2 text-sm font-bold">
                         <Clock size={16} />
                         {item.data.is_all_day ? (
                           <span>تمام روز</span>
                         ) : (
                           <span>
                             {toPersianDigits(format(new Date(item.data.start_time), "HH:mm"))} - {toPersianDigits(format(new Date(item.data.end_time), "HH:mm"))}
                           </span>
                         )}
                      </div>
                      
                      {item.data.status !== 'approved' && item.data.status !== 'pending' && (
                         <div className="flex items-center gap-1 text-xs px-2 py-1 rounded bg-black/20">
                            <AlertCircle size={12} />
                            <span>{item.data.status === 'rejected' ? 'رد شده' : 'لغو شده'}</span>
                         </div>
                      )}
                   </div>

                   <h3 className="text-base font-bold text-white group-hover:text-blue-200 transition-colors truncate">
                     {item.data.title}
                   </h3>
                   
                   <div className="flex items-center gap-4 text-xs opacity-70 mt-1">
                      {item.data.department_id && (
                         <div className="flex items-center gap-1">
                            <MapPin size={12} />
                            <span>دپارتمان {toPersianDigits(item.data.department_id)}</span>
                         </div>
                      )}
                   </div>
                </div>
              )}

            </div>
          );
        })}
      </div>
    </div>
  );
}