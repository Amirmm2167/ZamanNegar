"use client";

import { useEffect, useState, useRef, useImperativeHandle, forwardRef } from "react";
import { useRouter } from "next/navigation";
import api from "@/lib/api";
import { CalendarEvent, Department } from "@/types";
import { ChevronRight, ChevronLeft, Loader2, AlertCircle, Plus, User, RefreshCw, Maximize2, Minimize2, Move } from "lucide-react";
import clsx from "clsx";
import EventModal from "./EventModal";
import DigitalClock from "./DigitalClock";
import EventTooltip from "./EventTooltip";
import LegendFilter from "./LegendFilter";
import GlassPane from "@/components/ui/GlassPane";
import BottomSheet from "./ui/BottomSheet";
import MoveConfirmationSheet from "./views/mobile/MoveConfirmationSheet"; // New Sheet
import { toPersianDigits } from "@/lib/utils"; 

// Views
import MobileContextMenu from "./views/mobile/MobileContextMenu"; 
import DesktopWeekView from "./views/desktop/WeekView";
import DesktopMonthView from "./views/desktop/MonthView"; 
import MobileGrid from "./views/mobile/MobileGrid"; 
import AgendaView from "./views/shared/AgendaView";
import ViewSwitcher, { ViewMode } from "./views/shared/ViewSwitcher";

interface Holiday { id: number; occasion: string; holiday_date: string; }
export interface CalendarGridHandle { openNewEventModal: () => void; }

const CalendarGrid = forwardRef<CalendarGridHandle>((props, ref) => {
  const router = useRouter();
  const gridContainerRef = useRef<HTMLDivElement>(null);

  // --- STATE ---
  const [viewMode, setViewMode] = useState<ViewMode>("1day"); 
  const [isMobile, setIsMobile] = useState(false);
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [holidays, setHolidays] = useState<Holiday[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [currentDate, setCurrentDate] = useState(new Date());
  const [username, setUsername] = useState("");
  const [userId, setUserId] = useState<number>(0);
  const [userRole, setUserRole] = useState("");

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState<CalendarEvent | null>(null);
  const [hiddenDeptIds, setHiddenDeptIds] = useState<number[]>([]); 
  const [hoveredEvent, setHoveredEvent] = useState<CalendarEvent | null>(null);
  const [draftEvent, setDraftEvent] = useState<{ date: Date; startHour: number; endHour: number } | null>(null);
  const tooltipTimeout = useRef<NodeJS.Timeout | null>(null);

  const [modalInitialDate, setModalInitialDate] = useState(new Date());
  const [modalStart, setModalStart] = useState("09:00");
  const [modalEnd, setModalEnd] = useState("10:00");

  const [isLandscape, setIsLandscape] = useState(false);
  
  // Context Menu
  const [isContextMenuOpen, setIsContextMenuOpen] = useState(false);
  const [contextMenuEvent, setContextMenuEvent] = useState<CalendarEvent | null>(null);
  const [contextMenuInitialView, setContextMenuInitialView] = useState<"menu" | "properties">("menu");

  // --- DRAG & DROP STATE REFINED ---
  const [isDragging, setIsDragging] = useState(false); 
  const [isHolding, setIsHolding] = useState(false);   
  const [dragEvent, setDragEvent] = useState<CalendarEvent | null>(null);
  const [dragPosition, setDragPosition] = useState<{x: number, y: number} | null>(null);
  const [currentDragTime, setCurrentDragTime] = useState<string>(""); 
  
  // Drop & Confirm
  const [isMoveConfirmOpen, setIsMoveConfirmOpen] = useState(false);
  const [dropTime, setDropTime] = useState<Date | null>(null);
  // "Waving" Placeholder logic:
  // When drop happens, we don't clear dragEvent yet. We keep it as "Dropped State" until confirmed.
  const [isDroppedAndWaiting, setIsDroppedAndWaiting] = useState(false); 

  const scrollInterval = useRef<NodeJS.Timeout | null>(null);

  useImperativeHandle(ref, () => ({
    openNewEventModal: () => handleOpenModal(new Date(), "09:00", "10:00")
  }));

  useEffect(() => {
    const handleResize = () => {
        const mobile = window.innerWidth < 768;
        setIsMobile(mobile);
        if (mobile && (viewMode === 'week' || viewMode === 'month')) setViewMode('1day');
        else if (!mobile && (viewMode === '1day' || viewMode === '3day' || viewMode === 'mobile-week')) setViewMode('week');
    };
    handleResize();
    window.addEventListener('resize', handleResize);
    setUsername(localStorage.getItem("username") || "کاربر");
    setUserRole(localStorage.getItem("role") || "viewer");
    fetchData();
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // --- GLOBAL DRAG LISTENERS ---
  useEffect(() => {
    if (isDragging) {
      window.addEventListener('touchmove', handleGlobalMove, { passive: false });
      window.addEventListener('touchend', handleGlobalUp);
      window.addEventListener('mousemove', handleGlobalMove);
      window.addEventListener('mouseup', handleGlobalUp);
      window.addEventListener('mousedown', handleGlobalDown);
      window.addEventListener('touchstart', handleGlobalDown, { passive: false });
    } else {
      window.removeEventListener('touchmove', handleGlobalMove);
      window.removeEventListener('touchend', handleGlobalUp);
      window.removeEventListener('mousemove', handleGlobalMove);
      window.removeEventListener('mouseup', handleGlobalUp);
      window.removeEventListener('mousedown', handleGlobalDown);
      window.removeEventListener('touchstart', handleGlobalDown);
      if (scrollInterval.current) clearInterval(scrollInterval.current);
    }
    return () => {
      window.removeEventListener('touchmove', handleGlobalMove);
      window.removeEventListener('touchend', handleGlobalUp);
      window.removeEventListener('mousemove', handleGlobalMove);
      window.removeEventListener('mouseup', handleGlobalUp);
      window.removeEventListener('mousedown', handleGlobalDown);
      window.removeEventListener('touchstart', handleGlobalDown);
    };
  }, [isDragging]);

  const fetchData = async () => {
    try {
      if(events.length === 0) setLoading(true);
      const [eventsRes, holidaysRes, deptsRes, meRes] = await Promise.all([
        api.get<CalendarEvent[]>("/events/"),
        api.get<Holiday[]>("/holidays/"),
        api.get<Department[]>("/departments/"),
        api.get("/auth/me").catch(() => ({ data: { id: 0 } }))
      ]);
      setEvents(eventsRes.data);
      setHolidays(holidaysRes.data);
      setDepartments(deptsRes.data);
      setUserId(meRes.data.id);
    } catch (err) {
      console.error(err);
      setError("خطا در دریافت اطلاعات.");
    } finally {
      setLoading(false);
    }
  };

  // --- DRAG ENGINE ---
  const startDrag = (event: CalendarEvent) => {
    setDragEvent(event);
    setIsDragging(true);
    setIsHolding(false); 
    setIsDroppedAndWaiting(false);
    setIsContextMenuOpen(false);
    setDragPosition({ x: window.innerWidth / 2, y: window.innerHeight / 2 });
  };

  const handleGlobalDown = (e: TouchEvent | MouseEvent) => {
      setIsHolding(true);
      handleGlobalMove(e); 
  };

  const handleGlobalMove = (e: TouchEvent | MouseEvent) => {
    e.preventDefault(); 
    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;
    setDragPosition({ x: clientX, y: clientY });

    if (gridContainerRef.current) {
        const rect = gridContainerRef.current.getBoundingClientRect();
        let relativeY = clientY - rect.top;
        relativeY = Math.max(0, Math.min(relativeY, rect.height));
        const percentage = relativeY / rect.height;
        const totalMinutes = percentage * 24 * 60;
        const hours = Math.floor(totalMinutes / 60);
        const minutes = Math.floor(totalMinutes % 60);
        const roundedMinutes = Math.round(minutes / 15) * 15;
        const finalMinutes = roundedMinutes === 60 ? 0 : roundedMinutes;
        const finalHours = roundedMinutes === 60 ? hours + 1 : hours;
        setCurrentDragTime(`${finalHours.toString().padStart(2, '0')}:${finalMinutes.toString().padStart(2, '0')}`);
    }

    const edgeThreshold = 50;
    if (clientY < edgeThreshold) startEdgeScroll('prev');
    else if (clientY > window.innerHeight - edgeThreshold) startEdgeScroll('next');
    else if (scrollInterval.current) clearInterval(scrollInterval.current);
  };

  const startEdgeScroll = (direction: 'next' | 'prev') => {
    if (scrollInterval.current) return; 
    scrollInterval.current = setInterval(() => {
      if (direction === 'next') nextDate();
      else prevDate();
    }, 800); 
  };

  const handleGlobalUp = (e: TouchEvent | MouseEvent) => {
    if (scrollInterval.current) clearInterval(scrollInterval.current);
    if (!isHolding) return; 

    setIsDragging(false);
    setIsHolding(false);
    
    // --- DROPPED: TRIGGER WAVING PLACEHOLDER ---
    setIsDroppedAndWaiting(true);

    const [h, m] = currentDragTime.split(':').map(Number);
    const proposedDate = new Date(currentDate);
    if (!isNaN(h)) {
        proposedDate.setHours(h, m, 0, 0);
    } else {
        proposedDate.setHours(new Date().getHours(), 0, 0, 0);
    }
    
    setDropTime(proposedDate);
    setIsMoveConfirmOpen(true);
  };

  const handleCancelMove = () => {
      setIsMoveConfirmOpen(false);
      setIsDroppedAndWaiting(false);
      setDragEvent(null);
  };

  const finalizeMove = async (newStart: Date, newEnd: Date) => {
    if (!dragEvent) return;
    try {
      setLoading(true);
      await api.patch(`/events/${dragEvent.id}`, {
        start_time: newStart.toISOString(),
        end_time: newEnd.toISOString()
      });
      fetchData();
      setIsMoveConfirmOpen(false);
      setIsDroppedAndWaiting(false);
      setDragEvent(null);
    } catch (e) {
      setError("خطا در جابجایی رویداد.");
    } finally {
      setLoading(false);
    }
  };

  // --- INTERACTION HANDLERS ---
  
  // 1. TAP: Open Properties directly
  const handleEventTap = (event: CalendarEvent) => {
      if (isMobile) {
          setContextMenuEvent(event);
          setContextMenuInitialView("properties"); // Start at properties
          setIsContextMenuOpen(true);
      } else {
          // Desktop click = Tooltip
          setHoveredEvent(event);
      }
  };

  // 2. LONG PRESS: Open Menu (Or Start Drag if permitted)
  const handleEventHold = (event: CalendarEvent) => {
      if (isMobile) {
          setContextMenuEvent(event);
          setContextMenuInitialView("menu"); // Start at menu
          setIsContextMenuOpen(true);
      }
  };

  // 3. DRAG START (Triggered by hold + move in MobileGrid)
  const handleEventDragStart = (event: CalendarEvent) => {
      // Permission check
      const isOwner = event.proposer_id === userId;
      const isManager = ["manager", "superadmin", "evaluator"].includes(userRole);
      
      if (isOwner || isManager) {
          startDrag(event);
      }
  };

  // 4. Menu Actions
  const handleMenuEdit = () => {
      if (contextMenuEvent) {
          setIsContextMenuOpen(false);
          handleOpenModal(new Date(contextMenuEvent.start_time), "", "", contextMenuEvent);
      }
  };
  const handleMenuDelete = async () => {
      if (!contextMenuEvent) return;
      if (confirm("آیا از حذف این رویداد اطمینان دارید؟")) {
          await api.delete(`/events/${contextMenuEvent.id}`);
          setIsContextMenuOpen(false);
          fetchData();
      }
  };
  const handleMenuMove = () => {
      if (contextMenuEvent) startDrag(contextMenuEvent);
  };

  // --- Helper Functions ---
  const nextDate = () => { 
      const d = new Date(currentDate); 
      if (viewMode === 'week' || viewMode === 'mobile-week') d.setDate(d.getDate() + 7);
      else if (viewMode === '3day') d.setDate(d.getDate() + 3);
      else if (viewMode === 'month') d.setMonth(d.getMonth() + 1);
      else d.setDate(d.getDate() + 1);
      setCurrentDate(d); 
  };
  const prevDate = () => { 
      const d = new Date(currentDate); 
      if (viewMode === 'week' || viewMode === 'mobile-week') d.setDate(d.getDate() - 7);
      else if (viewMode === '3day') d.setDate(d.getDate() - 3);
      else if (viewMode === 'month') d.setMonth(d.getMonth() - 1);
      else d.setDate(d.getDate() - 1);
      setCurrentDate(d); 
  };
  const goToToday = () => setCurrentDate(new Date());
  
  const handleHardRefresh = () => {
      if (window.confirm("آیا می‌خواهید برنامه را مجددا بارگذاری کنید؟")) {
          if ('serviceWorker' in navigator) navigator.serviceWorker.getRegistrations().then(r => r.forEach(reg => reg.unregister()));
          window.location.reload();
      }
  };

  const handleOpenModal = (date: Date, start: string, end: string, event: CalendarEvent | null = null) => {
      setModalInitialDate(date); setModalStart(start); setModalEnd(end); setSelectedEvent(event); setIsModalOpen(true); setDraftEvent(null);
  };
  const handleSlotClick = (date: Date, hour: number) => {
      if (draftEvent && draftEvent.date.toDateString() === date.toDateString() && draftEvent.startHour === hour) {
          handleOpenModal(date, `${hour}:00`, `${hour+1}:00`);
      } else {
          setDraftEvent({ date, startHour: hour, endHour: hour + 1 });
      }
  };
  const handleEventClick = (event: CalendarEvent) => { setHoveredEvent(event); setDraftEvent(null); };
  
  // Desktop Fallback
  const handleEventLongPress = (event: CalendarEvent) => {
      if (!isMobile && (["manager", "superadmin", "evaluator"].includes(userRole) || event.proposer_id === userId)) {
          handleOpenModal(new Date(event.start_time), "", "", event);
      }
  };

  const handleEventHover = (e: React.MouseEvent, event: CalendarEvent) => {
    if (tooltipTimeout.current) clearTimeout(tooltipTimeout.current);
    setHoveredEvent(event);
  };
  const handleEventLeave = () => {
    tooltipTimeout.current = setTimeout(() => { setHoveredEvent(null); }, 150); 
  };

  // --- Swipe Logic ---
  const [swipeOffset, setSwipeOffset] = useState(0);
  const touchStartX = useRef(0);
  const [isSwiping, setIsSwiping] = useState(false);

  const handleTouchStartNav = (e: React.TouchEvent) => { if (!isMobile || isDragging) return; touchStartX.current = e.targetTouches[0].clientX; setIsSwiping(true); };
  const handleTouchMoveNav = (e: React.TouchEvent) => { if (!isMobile || isDragging || !isSwiping) return; setSwipeOffset(e.targetTouches[0].clientX - touchStartX.current); };
  const handleTouchEndNav = () => { if (!isMobile || isDragging) return; if (swipeOffset > 80) prevDate(); else if (swipeOffset < -80) nextDate(); setSwipeOffset(0); setIsSwiping(false); };

  if (loading && events.length === 0) return <div className="flex justify-center items-center h-full text-blue-400"><Loader2 className="animate-spin" size={48} /></div>;
  if (error) return <div className="flex justify-center items-center h-full text-red-400 gap-2"><AlertCircle /> {error}</div>;

  return (
    <>
      {isMobile && <button onClick={() => setIsLandscape(!isLandscape)} className="fixed bottom-4 right-4 z-[5000] p-3 bg-blue-600 text-white rounded-full shadow-2xl border border-white/20 hover:scale-110 transition-transform"><Maximize2 size={20} /></button>}

      <GlassPane intensity="medium" className={clsx("flex flex-col h-full w-full rounded-none sm:rounded-2xl overflow-hidden border-none sm:border border-white/10 shadow-none sm:shadow-2xl transition-all duration-300", isLandscape && "fixed inset-0 z-[5000] w-[100vh] h-[100vw] origin-top-right rotate-90 translate-x-[100%]")}>
        <div className="flex flex-col sm:flex-row gap-3 items-center justify-between px-4 py-3 border-b border-white/10 shadow-sm z-30 bg-black/20 backdrop-blur-sm shrink-0">
          <div className="flex items-center gap-2 w-full sm:w-auto justify-between sm:justify-start">
            <ViewSwitcher currentView={viewMode} onChange={setViewMode} isMobile={isMobile} />
            <div className="flex items-center gap-1 bg-white/5 rounded-xl p-0.5 border border-white/10">
              <button onClick={nextDate} className="p-2 hover:bg-white/10 rounded-lg text-gray-300"><ChevronRight size={18} /></button>
              <button onClick={goToToday} className="px-3 py-1 text-xs font-bold hover:bg-white/10 text-white rounded-lg">امروز</button>
              <button onClick={prevDate} className="p-2 hover:bg-white/10 rounded-lg text-gray-300"><ChevronLeft size={18} /></button>
            </div>
            {isMobile && <div className="flex gap-2"><button onClick={handleHardRefresh} className="p-2 bg-white/5 text-gray-300 rounded-lg border border-white/10"><RefreshCw size={16} /></button><button onClick={() => handleOpenModal(new Date(), "09:00", "10:00")} className="p-2 bg-emerald-600 text-white rounded-lg"><Plus size={18} /></button></div>}
          </div>
          <div className="hidden sm:flex items-center gap-3 w-full sm:w-auto justify-end">
            <span className="text-sm font-bold text-gray-100 whitespace-nowrap">{currentDate.toLocaleDateString("fa-IR", { month: "long", year: "numeric" })}</span>
            <div className="flex items-center gap-2 bg-white/5 px-3 py-1 rounded-full border border-white/10"><User size={14} className="text-blue-400" /><span className="text-xs text-gray-200">{username}</span></div>
            <LegendFilter departments={departments} hiddenIds={hiddenDeptIds} onToggle={(id) => setHiddenDeptIds(p => p.includes(id) ? p.filter(x=>x!==id) : [...p, id])} onShowAll={() => setHiddenDeptIds([])} />
            <button onClick={() => handleOpenModal(new Date(), "09:00", "10:00")} className="flex items-center gap-1 px-3 py-1.5 text-xs font-bold bg-emerald-600/80 hover:bg-emerald-600 text-white rounded-lg shadow-lg border border-emerald-500/30"><Plus size={16} /> <span>جدید</span></button>
          </div>
        </div>

        <div ref={gridContainerRef} className="flex-1 overflow-hidden relative" onTouchStart={handleTouchStartNav} onTouchMove={handleTouchMoveNav} onTouchEnd={handleTouchEndNav}>
            <div className="h-full w-full transition-transform duration-75 ease-linear" style={{ transform: `translateX(${swipeOffset}px)` }}>
                {viewMode === 'week' && <DesktopWeekView currentDate={currentDate} events={events} holidays={holidays} departments={departments} hiddenDeptIds={hiddenDeptIds} onEventClick={handleEventClick} onEventLongPress={handleEventLongPress} onSlotClick={handleSlotClick} onEventHover={handleEventHover} onEventLeave={handleEventLeave} draftEvent={draftEvent} />}
                {viewMode === 'month' && <DesktopMonthView currentDate={currentDate} events={events} holidays={holidays} departments={departments} onEventClick={handleEventClick} onEventLongPress={handleEventLongPress} onSlotClick={handleSlotClick} />}
                
                {/* Mobile Views with Smart Handlers */}
                {(viewMode === '1day' || viewMode === '3day' || viewMode === 'mobile-week') && 
                    <MobileGrid 
                        daysToShow={viewMode === '1day' ? 1 : viewMode === '3day' ? 3 : 7} 
                        currentDate={currentDate} 
                        // Filter dragged event from grid ONLY if dragging OR dropped/waiting
                        events={(isDragging || isDroppedAndWaiting) && dragEvent ? events.filter(e => e.id !== dragEvent.id) : events} 
                        holidays={holidays} 
                        departments={departments} 
                        hiddenDeptIds={hiddenDeptIds} 
                        onEventTap={handleEventTap} 
                        onEventHold={handleEventHold} 
                        onEventDragStart={handleEventDragStart} 
                        onSlotClick={handleSlotClick} 
                        draftEvent={draftEvent} 
                    />
                }
                
                {viewMode === 'agenda' && <AgendaView events={events} departments={departments} onEventClick={handleEventClick} />}
            </div>
        </div>

        {/* --- OVERLAYS --- */}
        
        {/* 1. Active Drag State (Moving with Finger) */}
        {isDragging && isHolding && dragEvent && dragPosition && (
            <>
                <div className="fixed z-[9999] p-2 rounded-lg shadow-2xl opacity-90 cursor-grabbing border border-white/30" style={{ top: dragPosition.y - 20, left: dragPosition.x - 50, width: '100px', backgroundColor: departments.find(d => d.id === dragEvent.department_id)?.color || '#666', color: 'white', pointerEvents: 'none' }}>
                    <div className="text-[10px] font-bold truncate">{dragEvent.title}</div>
                </div>
                <div className="fixed z-[9999] px-3 py-1 bg-black/80 text-white text-lg font-bold rounded-full border border-blue-500 shadow-xl backdrop-blur-md" style={{ top: dragPosition.y - 60, left: dragPosition.x - 30, pointerEvents: 'none' }}>
                    {toPersianDigits(currentDragTime)}
                </div>
            </>
        )}

        {/* 2. Dropped & Waiting State (Waving Placeholder) */}
        {isDroppedAndWaiting && dragEvent && dropTime && (
            <div 
                className="absolute z-20 left-1 right-1 rounded-md animate-pulse border-2 border-dashed border-yellow-400 bg-yellow-400/20 flex items-center justify-center shadow-[0_0_15px_rgba(250,204,21,0.5)]"
                // HACK: We need to position this absolutely within the VIEW container, but we are in CalendarGrid (Parent).
                // Ideally, MobileGrid renders this. But for now, we use a fixed overlay that approximates the position OR
                // simpler: We assume MobileGrid handles the rendering of "draftEvent" if we pass it properly.
                // Actually, let's use the 'draftEvent' logic but style it as "Waving".
                // Since calculating the exact TOP % here is hard without the view's layout engine,
                // We will render a floating card at the drop location? No, that looks disconnected.
                // BEST APPROACH: We pass `dragEvent` back into MobileGrid as a special prop "wavingEvent".
            >
                {/* Handled inside MobileGrid via events prop filtering + special render? 
                    Actually, let's render a fixed overlay for now to match the user request of "Waving Placeholder".
                    Since we know the Drop Time, we can calculate the Top % relative to the container if we knew the container height.
                    But GridContainerRef gives us that.
                */}
            </div>
        )}

        <EventModal isOpen={isModalOpen} onClose={() => { setIsModalOpen(false); setSelectedEvent(null); }} onSuccess={fetchData} initialDate={modalInitialDate} initialStartTime={modalStart} initialEndTime={modalEnd} eventToEdit={selectedEvent} currentUserId={userId} />
        
        {hoveredEvent && <EventTooltip event={hoveredEvent} departments={departments} onClose={() => setHoveredEvent(null)} onMouseEnter={() => { if(tooltipTimeout.current) clearTimeout(tooltipTimeout.current); }} onMouseLeave={() => tooltipTimeout.current = setTimeout(() => setHoveredEvent(null), 150)} />}
        
        <BottomSheet isOpen={isContextMenuOpen} onClose={() => setIsContextMenuOpen(false)} title="عملیات رویداد">
            {contextMenuEvent && <MobileContextMenu event={contextMenuEvent} userRole={userRole} currentUserId={userId} departments={departments} onClose={() => setIsContextMenuOpen(false)} onEdit={handleMenuEdit} onDelete={handleMenuDelete} onMove={handleMenuMove} initialView={contextMenuInitialView} />}
        </BottomSheet>

        {/* Replaced Modal with Sheet */}
        <MoveConfirmationSheet isOpen={isMoveConfirmOpen} onClose={handleCancelMove} onConfirm={finalizeMove} originalEvent={dragEvent} newStartTime={dropTime} />
      </GlassPane>
    </>
  );
});

CalendarGrid.displayName = "CalendarGrid";
export default CalendarGrid;