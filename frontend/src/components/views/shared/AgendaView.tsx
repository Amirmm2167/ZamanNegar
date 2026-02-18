"use client";

import { useState, useMemo, useRef } from "react";
import { 
  format, isToday, isTomorrow, isYesterday, 
  isSameDay 
} from "date-fns-jalali"; 
import { 
  getJalaliDay, 
  getJalaliMonthName, 
  toPersianDigits,
  getJalaliParts // Note: Ensure this is exported if used, or use getJalaliParts
} from "@/lib/jalali"; 
import { CalendarEvent, Department } from "@/types";
import { useAuthStore } from "@/stores/authStore";
import { useContextMenuStore } from "@/stores/contextMenuStore";
import { 
  CheckCircle2, XCircle, Clock, MapPin, 
  ChevronDown, ChevronUp, User, Target, Tag,
  AlertCircle, Loader2, Layers, ArrowRight // <--- ADDED MISSING IMPORTS
} from "lucide-react";
import clsx from "clsx";
import { motion, AnimatePresence } from "framer-motion";
import api from "@/lib/api";

interface AgendaViewProps {
  events: CalendarEvent[];
  departments: Department[];
  holidays: any[];
  onEventClick: (e: CalendarEvent) => void;
  onEventLongPress: (e: CalendarEvent) => void;
  onSlotClick?: (date: Date, hour: number) => void;
}

export default function AgendaView({
  events,
  departments,
  holidays,
  onEventClick,
  onEventLongPress,
}: AgendaViewProps) {
  
  const { user, currentRole } = useAuthStore();
  const { openMenu } = useContextMenuStore();
  const role = currentRole();
  const canApprove = role === 'manager' || role === 'evaluator' || user?.is_superadmin;

  const [expandedIds, setExpandedIds] = useState<number[]>([]);
  const [processingId, setProcessingId] = useState<number | null>(null);

  // --- 1. GROUPING LOGIC ---
  const groupedEvents = useMemo(() => {
    const groups = new Map<string, CalendarEvent[]>();
    
    // Sort by time first
    const sorted = [...events].sort((a, b) => 
      new Date(a.start_time).getTime() - new Date(b.start_time).getTime()
    );

    sorted.forEach(ev => {
      const dateKey = new Date(ev.start_time).toDateString(); // Group by standard Day
      if (!groups.has(dateKey)) {
        groups.set(dateKey, []);
      }
      groups.get(dateKey)?.push(ev);
    });

    return Array.from(groups.entries());
  }, [events]);

  // --- 2. HANDLERS ---
  
  const toggleExpand = (id: number, e: React.MouseEvent | React.TouchEvent) => {
    e.stopPropagation();
    setExpandedIds(prev => 
      prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
    );
  };

  const handleStatusChange = async (e: React.MouseEvent, event: CalendarEvent, status: 'approved' | 'rejected') => {
    e.stopPropagation();
    if (processingId) return;
    
    setProcessingId(event.id);
    try {
      await api.patch(`/events/${event.id}`, { status });
      window.dispatchEvent(new CustomEvent('refresh-calendar')); // Trigger global refresh
    } catch (err) {
      console.error(err);
    } finally {
      setProcessingId(null);
    }
  };

  // Mobile Long Press Logic
  const touchTimer = useRef<NodeJS.Timeout | null>(null);
  
  const handleTouchStart = (evObj: CalendarEvent) => {
    touchTimer.current = setTimeout(() => {
      if (navigator.vibrate) navigator.vibrate(50);
      onEventLongPress(evObj); // Triggers Edit Panel
    }, 600); // 600ms hold
  };

  const handleTouchEnd = () => {
    if (touchTimer.current) {
      clearTimeout(touchTimer.current);
      touchTimer.current = null;
    }
  };

  // --- 3. HELPER RENDERERS ---

  const renderDateHeader = (dateStr: string) => {
    const date = new Date(dateStr);
    const dayName = date.toLocaleDateString('fa-IR', { weekday: 'long' });
    const dayNum = toPersianDigits(getJalaliDay(date));
    const monthName = getJalaliMonthName(date);
    
    // Check Status
    let label = "";
    if (isToday(date)) label = "امروز";
    else if (isTomorrow(date)) label = "فردا";
    else if (isYesterday(date)) label = "دیروز";

    // Holiday Check
    const isoDate = date.toISOString().split('T')[0];
    const holiday = holidays.find(h => h.holiday_date.startsWith(isoDate));

    return (
      <div className="sticky top-0 z-20 bg-[#020205]/95 backdrop-blur-md border-b border-white/10 py-3 px-4 flex items-center justify-between shadow-sm">
        <div className="flex items-center gap-3">
          <span className={clsx(
            "text-lg font-bold w-10 h-10 flex items-center justify-center rounded-xl",
            isToday(date) ? "bg-blue-600 text-white shadow-blue-900/50 shadow-lg" : 
            holiday ? "bg-red-500/10 text-red-400" : "bg-white/5 text-gray-200"
          )}>
            {dayNum}
          </span>
          <div className="flex flex-col">
            <span className={clsx("text-sm font-bold", holiday ? "text-red-400" : "text-gray-200")}>
              {dayName} {label && <span className="text-xs font-normal opacity-70 mr-2">({label})</span>}
            </span>
            <span className="text-xs text-gray-500">{monthName}</span>
          </div>
        </div>
        {holiday && (
          <span className="text-[10px] bg-red-500/10 text-red-300 px-2 py-1 rounded-full border border-red-500/20 max-w-[150px] truncate">
            {holiday.occasion}
          </span>
        )}
      </div>
    );
  };

  return (
    <div className="h-full w-full overflow-y-auto custom-scrollbar pb-20">
      {groupedEvents.length === 0 ? (
        <div className="flex flex-col items-center justify-center h-full text-gray-500 gap-4 opacity-50">
          <Layers size={48} />
          <p>هیچ رویدادی در این بازه زمانی یافت نشد.</p>
        </div>
      ) : (
        <div className="flex flex-col gap-8 pb-10">
          {groupedEvents.map(([dateKey, dayEvents]) => (
            <div key={dateKey} className="flex flex-col">
              {renderDateHeader(dateKey)}
              
              <div className="px-4 pt-4 flex flex-col gap-3">
                {dayEvents.map(event => {
                  const dept = departments.find(d => d.id === event.department_id);
                  const color = dept?.color || "#6b7280";
                  const isExpanded = expandedIds.includes(event.id);
                  const isPending = event.status === 'pending';
                  
                  const startTime = new Date(event.start_time).toLocaleTimeString('fa-IR', {hour: '2-digit', minute:'2-digit'});
                  const endTime = new Date(event.end_time).toLocaleTimeString('fa-IR', {hour: '2-digit', minute:'2-digit'});

                  return (
                    <motion.div 
                      key={event.id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className={clsx(
                        "relative bg-[#18181b] border rounded-2xl overflow-hidden transition-all",
                        isPending ? "border-dashed border-yellow-500/30 bg-yellow-500/[0.02]" : "border-white/5 hover:border-white/10"
                      )}
                      onContextMenu={(e) => openMenu(e, 'event', event)}
                      onTouchStart={() => handleTouchStart(event)}
                      onTouchEnd={handleTouchEnd}
                      onClick={(e) => {
                        // Desktop: Edit Panel. Mobile: Expand.
                        if (window.innerWidth > 768) {
                           onEventClick(event);
                        } else {
                           toggleExpand(event.id, e);
                        }
                      }}
                    >
                      {/* Color Strip */}
                      <div className="absolute top-0 bottom-0 right-0 w-1.5" style={{ backgroundColor: color }} />

                      <div className="p-4 flex gap-4">
                        {/* Time Column */}
                        <div className="flex flex-col items-center gap-1 min-w-[50px] pt-1">
                          <span className="text-sm font-bold text-gray-200">{toPersianDigits(startTime)}</span>
                          <div className="w-0.5 h-3 bg-white/10 rounded-full" />
                          <span className="text-xs text-gray-500">{toPersianDigits(endTime)}</span>
                        </div>

                        {/* Content */}
                        <div className="flex-1 min-w-0">
                          <div className="flex justify-between items-start gap-2">
                            <h3 className={clsx("font-bold text-base truncate", isPending ? "text-yellow-100" : "text-white")}>
                              {event.title}
                            </h3>
                            {isPending && (
                              <div className="flex items-center gap-1 bg-yellow-500/20 text-yellow-400 text-[10px] px-2 py-0.5 rounded-full border border-yellow-500/30">
                                <AlertCircle size={12} />
                                <span>بررسی</span>
                              </div>
                            )}
                          </div>

                          <div className="flex items-center gap-2 mt-1 text-xs text-gray-400">
                            {dept && <span style={{ color }} className="font-medium">{dept.name}</span>}
                            {event.organizer && (
                              <>
                                <span className="w-1 h-1 bg-gray-600 rounded-full" />
                                <span className="flex items-center gap-1"><User size={10} /> {event.organizer}</span>
                              </>
                            )}
                          </div>

                          {/* Quick Admin Actions (Inline) */}
                          {canApprove && isPending && (
                            <div className="flex items-center gap-2 mt-3" onClick={e => e.stopPropagation()}>
                              <button 
                                onClick={(e) => handleStatusChange(e, event, 'approved')}
                                disabled={!!processingId}
                                className="flex-1 flex items-center justify-center gap-2 bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-400 border border-emerald-500/30 py-1.5 rounded-lg text-xs font-bold transition-colors"
                              >
                                {processingId === event.id ? <Loader2 className="animate-spin" size={14}/> : <CheckCircle2 size={14} />}
                                تایید
                              </button>
                              <button 
                                onClick={(e) => handleStatusChange(e, event, 'rejected')}
                                disabled={!!processingId}
                                className="flex-1 flex items-center justify-center gap-2 bg-red-600/20 hover:bg-red-600/30 text-red-400 border border-red-500/30 py-1.5 rounded-lg text-xs font-bold transition-colors"
                              >
                                {processingId === event.id ? <Loader2 className="animate-spin" size={14}/> : <XCircle size={14} />}
                                رد
                              </button>
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Accordion Details (Mobile mainly) */}
                      <AnimatePresence>
                        {isExpanded && (
                          <motion.div 
                            initial={{ height: 0 }} 
                            animate={{ height: 'auto' }} 
                            exit={{ height: 0 }}
                            className="bg-black/20 border-t border-white/5 overflow-hidden"
                          >
                            <div className="p-4 pt-2 text-xs text-gray-400 space-y-3">
                              {event.description && (
                                <p className="leading-relaxed text-gray-300">{event.description}</p>
                              )}
                              
                              <div className="flex flex-wrap gap-2">
                                {event.goal && (
                                  <div className="flex items-center gap-1 bg-white/5 px-2 py-1 rounded">
                                    <Target size={12} className="text-blue-400" />
                                    <span>{event.goal}</span>
                                  </div>
                                )}
                                {event.target_audience && (
                                  <div className="flex items-center gap-1 bg-white/5 px-2 py-1 rounded">
                                    <Tag size={12} className="text-purple-400" />
                                    <span>{event.target_audience}</span>
                                  </div>
                                )}
                              </div>

                              <div className="flex justify-end pt-2">
                                <button 
                                  onClick={(e) => { e.stopPropagation(); onEventClick(event); }}
                                  className="flex items-center gap-1 text-blue-400 hover:text-blue-300"
                                >
                                  ویرایش کامل <ArrowRight size={12} />
                                </button>
                              </div>
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>

                      {/* Expand Toggle Hint */}
                      <div className="absolute bottom-1 left-1/2 -translate-x-1/2 opacity-20">
                        {isExpanded ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}