"use client";

import { useEffect, useState, useRef, useImperativeHandle, forwardRef } from "react";
import { useRouter } from "next/navigation";
import api from "@/lib/api";
import { CalendarEvent, Department } from "@/types";
import { ChevronRight, ChevronLeft, Loader2, AlertCircle, Plus, User, RefreshCw, Maximize2, Minimize2 } from "lucide-react";
import clsx from "clsx";

// --- COMPONENTS ---
import EventModal from "./EventModal"; // Desktop Editor
import EventTooltip from "./EventTooltip"; // Desktop Hover
import LegendFilter from "./LegendFilter";
import GlassPane from "@/components/ui/GlassPane";

// Mobile UX Components
import InfiniteSwiper from "./ui/InfiniteSwiper";
import ExpandableBottomSheet from "./ui/ExpandableBottomSheet";
import MobileEventSheet from "./mobile/MobileEventSheet";

// Views
import DesktopWeekView from "./views/desktop/WeekView";
import DesktopMonthView from "./views/desktop/MonthView"; 
import MobileGrid from "./views/mobile/MobileGrid"; 
import AgendaView from "./views/shared/AgendaView";
import ViewSwitcher, { ViewMode } from "./views/shared/ViewSwitcher";

interface Holiday {
  id: number;
  occasion: string;
  holiday_date: string; 
}

export interface CalendarGridHandle {
  openNewEventModal: () => void;
}

const CalendarGrid = forwardRef<CalendarGridHandle>((props, ref) => {
  const router = useRouter();

  // --- 1. GLOBAL STATE ---
  const [viewMode, setViewMode] = useState<ViewMode>("1day"); 
  const [isMobile, setIsMobile] = useState(false);
  const [isLandscape, setIsLandscape] = useState(false); // Mobile Fullscreen toggle

  // Data
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [holidays, setHolidays] = useState<Holiday[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  
  // User Context
  const [username, setUsername] = useState("");
  const [userId, setUserId] = useState<number>(0);
  const [userRole, setUserRole] = useState("");

  // Navigation State
  const [currentDate, setCurrentDate] = useState(new Date());
  const [currentIndex, setCurrentIndex] = useState(0); // 0 = Today (Virtual Index for Swiper)

  // --- 2. INTERACTION STATE ---
  
  // Desktop Interactions
  const [isModalOpen, setIsModalOpen] = useState(false); // Desktop Editor
  const [selectedEvent, setSelectedEvent] = useState<CalendarEvent | null>(null);
  const [hoveredEvent, setHoveredEvent] = useState<CalendarEvent | null>(null);
  const tooltipTimeout = useRef<NodeJS.Timeout | null>(null);

  // Mobile Sheet Interactions
  const [isSheetOpen, setIsSheetOpen] = useState(false);
  const [isSheetExpanded, setIsSheetExpanded] = useState(false);
  const [sheetEvent, setSheetEvent] = useState<CalendarEvent | null>(null); // Existing Event
  const [sheetDraft, setSheetDraft] = useState<{ date: Date; startHour: number; endHour: number } | null>(null); // New Draft

  // Filtering
  const [hiddenDeptIds, setHiddenDeptIds] = useState<number[]>([]); 

  // Modal Defaults (Desktop)
  const [modalInitialDate, setModalInitialDate] = useState(new Date());
  const [modalStart, setModalStart] = useState("09:00");
  const [modalEnd, setModalEnd] = useState("10:00");

  useImperativeHandle(ref, () => ({
    openNewEventModal: () => {
        if (isMobile) {
            const now = new Date();
            handleSlotClick(now, now.getHours());
        } else {
            handleOpenDesktopModal(new Date(), "09:00", "10:00");
        }
    }
  }));

  // --- 3. INITIALIZATION & RESIZE ---
  useEffect(() => {
    const handleResize = () => {
        const mobile = window.innerWidth < 768;
        setIsMobile(mobile);
        // Smart View Switch on Resize
        if (mobile && (viewMode === 'week' || viewMode === 'month')) {
            setViewMode('1day');
        } else if (!mobile && (viewMode === '1day' || viewMode === '3day' || viewMode === 'mobile-week')) {
            setViewMode('week');
        }
    };
    
    handleResize(); // Run once
    window.addEventListener('resize', handleResize);

    // Auth & Data
    setUsername(localStorage.getItem("username") || "کاربر");
    setUserRole(localStorage.getItem("role") || "viewer");
    fetchData();

    return () => window.removeEventListener('resize', handleResize);
  }, []);

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

  // --- 4. NAVIGATION LOGIC (Infinite Swiper Math) ---
  const getDateForIndex = (index: number) => {
      const d = new Date(); // Always calculate relative to "Real Today"
      let diff = 0;
      
      if (viewMode === '1day') {
          diff = index; // 1 day per step
      } else if (viewMode === '3day') {
          diff = index; // 1 day per step (Continuous Ribbon Effect)
      } else if (viewMode === 'mobile-week') {
          diff = index * 7; // 1 week per step
      }
      
      d.setDate(d.getDate() + diff);
      return d;
  };

  const handleSwipeChange = (newIndex: number) => {
      setCurrentIndex(newIndex);
      setCurrentDate(getDateForIndex(newIndex));
  };

  // Explicit Nav Buttons (Arrows)
  const nextDate = () => {
      if (isMobile && viewMode !== 'agenda') {
          handleSwipeChange(currentIndex + 1);
      } else {
          // Desktop / Agenda Logic
          const d = new Date(currentDate);
          if (viewMode === 'week') d.setDate(d.getDate() + 7);
          else if (viewMode === 'month') d.setMonth(d.getMonth() + 1);
          else d.setDate(d.getDate() + 1);
          setCurrentDate(d);
      }
  };

  const prevDate = () => {
      if (isMobile && viewMode !== 'agenda') {
          handleSwipeChange(currentIndex - 1);
      } else {
          const d = new Date(currentDate);
          if (viewMode === 'week') d.setDate(d.getDate() - 7);
          else if (viewMode === 'month') d.setMonth(d.getMonth() - 1);
          else d.setDate(d.getDate() - 1);
          setCurrentDate(d);
      }
  };

  const goToToday = () => {
      setCurrentIndex(0);
      setCurrentDate(new Date());
  };

  const handleHardRefresh = () => {
      if (window.confirm("آیا می‌خواهید برنامه را مجددا بارگذاری کنید؟")) {
          if ('serviceWorker' in navigator) {
              navigator.serviceWorker.getRegistrations().then(regs => regs.forEach(r => r.unregister()));
          }
          window.location.reload();
      }
  };

  // --- 5. INTERACTION HANDLERS ---

  // Desktop: Open Modal
  const handleOpenDesktopModal = (date: Date, start: string, end: string, event: CalendarEvent | null = null) => {
      setModalInitialDate(date); 
      setModalStart(start); 
      setModalEnd(end); 
      setSelectedEvent(event); 
      setIsModalOpen(true);
  };

  // Mobile: Tap Slot -> Open Sheet (Create Draft)
  const handleSlotClick = (date: Date, hour: number) => {
      if(isMobile) {
          // Reset Event
          setSheetEvent(null);
          // Set Draft (This triggers the "Waving Placeholder" in MobileGrid)
          setSheetDraft({ date, startHour: hour, endHour: hour + 1 });
          // Open Sheet in Peek Mode
          setIsSheetExpanded(false); 
          setIsSheetOpen(true);
      } else {
          // Desktop behavior
          handleOpenDesktopModal(date, `${hour}:00`, `${hour+1}:00`);
      }
  };

  // Mobile: Tap Event -> Open Sheet (View/Edit)
  const handleEventTap = (event: CalendarEvent) => {
      setSheetEvent(event);
      setSheetDraft(null); // Clear draft
      setIsSheetExpanded(false); // Open in Peek
      setIsSheetOpen(true);
  };

  // Desktop Hover
  const handleEventHover = (e: React.MouseEvent, event: CalendarEvent) => {
    if (tooltipTimeout.current) clearTimeout(tooltipTimeout.current);
    setHoveredEvent(event);
  };
  const handleEventLeave = () => {
    tooltipTimeout.current = setTimeout(() => { setHoveredEvent(null); }, 150); 
  };

  // Permission Logic for Sheet
  const canEditSheet = (sheetEvent && (sheetEvent.proposer_id === userId || ["manager", "superadmin"].includes(userRole))) || (!sheetEvent); // New drafts are always editable

  // --- 6. RENDER ---
  if (loading && events.length === 0) return <div className="flex justify-center items-center h-full text-blue-400"><Loader2 className="animate-spin" size={48} /></div>;
  if (error) return <div className="flex justify-center items-center h-full text-red-400 gap-2"><AlertCircle /> {error}</div>;

  return (
    <>
      {/* Mobile Landscape Toggle (Floating) */}
      {isMobile && (
        <button 
            onClick={() => setIsLandscape(!isLandscape)}
            className="fixed bottom-24 right-4 z-[5000] p-3 bg-blue-600 text-white rounded-full shadow-2xl border border-white/20 hover:scale-110 transition-transform"
        >
            {isLandscape ? <Minimize2 size={20} /> : <Maximize2 size={20} />}
        </button>
      )}

      <GlassPane intensity="medium" className={clsx(
          "flex flex-col h-full w-full rounded-none sm:rounded-2xl overflow-hidden border-none sm:border border-white/10 shadow-none sm:shadow-2xl transition-all duration-300",
          isLandscape && "fixed inset-0 z-[5000] w-[100vh] h-[100vw] origin-top-right rotate-90 translate-x-[100%]"
      )}>
        
        {/* --- HEADER --- */}
        <div className="flex flex-col sm:flex-row gap-3 items-center justify-between px-4 py-3 border-b border-white/10 shadow-sm z-30 bg-black/20 backdrop-blur-sm shrink-0">
          
          {/* Controls (Left) */}
          <div className="flex items-center gap-2 w-full sm:w-auto justify-between sm:justify-start">
            <ViewSwitcher currentView={viewMode} onChange={setViewMode} isMobile={isMobile} />

            <div className="flex items-center gap-1 bg-white/5 rounded-xl p-0.5 border border-white/10">
              <button onClick={nextDate} className="p-2 hover:bg-white/10 rounded-lg text-gray-300"><ChevronRight size={18} /></button>
              <button onClick={goToToday} className="px-3 py-1 text-xs font-bold hover:bg-white/10 text-white rounded-lg">امروز</button>
              <button onClick={prevDate} className="p-2 hover:bg-white/10 rounded-lg text-gray-300"><ChevronLeft size={18} /></button>
            </div>

            {/* Mobile Actions */}
            {isMobile && (
                <div className="flex gap-2">
                    <button onClick={handleHardRefresh} className="p-2 bg-white/5 text-gray-300 rounded-lg border border-white/10"><RefreshCw size={16} /></button>
                    <button onClick={() => { const n = new Date(); handleSlotClick(n, n.getHours()); }} className="p-2 bg-emerald-600 text-white rounded-lg"><Plus size={18} /></button>
                </div>
            )}
          </div>

          {/* Info (Right) - Desktop Only */}
          <div className="hidden sm:flex items-center gap-3 w-full sm:w-auto justify-end">
            <span className="text-sm font-bold text-gray-100 whitespace-nowrap">
              {currentDate.toLocaleDateString("fa-IR", { month: "long", year: "numeric" })}
            </span>
            <div className="flex items-center gap-2 bg-white/5 px-3 py-1 rounded-full border border-white/10">
               <User size={14} className="text-blue-400" />
               <span className="text-xs text-gray-200">{username}</span>
            </div>
            <LegendFilter departments={departments} hiddenIds={hiddenDeptIds} onToggle={(id) => setHiddenDeptIds(p => p.includes(id) ? p.filter(x=>x!==id) : [...p, id])} onShowAll={() => setHiddenDeptIds([])} />
            <button 
              onClick={() => handleOpenDesktopModal(new Date(), "09:00", "10:00")}
              className="flex items-center gap-1 px-3 py-1.5 text-xs font-bold bg-emerald-600/80 hover:bg-emerald-600 text-white rounded-lg shadow-lg border border-emerald-500/30"
            >
              <Plus size={16} /> <span>جدید</span>
            </button>
          </div>
        </div>

        {/* --- MAIN CONTENT AREA --- */}
        <div className="flex-1 overflow-hidden relative">
            
            {/* 1. Desktop Views */}
            {!isMobile && viewMode === 'week' && (
                <DesktopWeekView 
                    currentDate={currentDate} 
                    events={events} 
                    holidays={holidays} 
                    departments={departments} 
                    hiddenDeptIds={hiddenDeptIds} 
                    onEventClick={(ev) => handleOpenDesktopModal(new Date(ev.start_time), "", "", ev)} 
                    onEventLongPress={()=>{}}
                    onSlotClick={(d, h) => handleOpenDesktopModal(d, `${h}:00`, `${h+1}:00`)} 
                    onEventHover={handleEventHover} 
                    onEventLeave={handleEventLeave} 
                    draftEvent={null} 
                />
            )}
            {!isMobile && viewMode === 'month' && (
                <DesktopMonthView 
                    currentDate={currentDate} 
                    events={events} 
                    holidays={holidays} 
                    departments={departments} 
                    onEventClick={(ev) => handleOpenDesktopModal(new Date(ev.start_time), "", "", ev)} 
                    onEventLongPress={()=>{}}
                    onSlotClick={(d, h) => handleOpenDesktopModal(d, `${h}:00`, `${h+1}:00`)}
                />
            )}
            
            {/* 2. Mobile Infinite Ribbon (1D, 3D, 7D) */}
            {isMobile && (viewMode === '1day' || viewMode === '3day' || viewMode === 'mobile-week') && (
                <InfiniteSwiper 
                    currentIndex={currentIndex} 
                    onChange={handleSwipeChange}
                    renderItem={(offset) => {
                        // Logic: Panel index determines its date relative to today
                        const panelIndex = currentIndex + offset;
                        const panelDate = getDateForIndex(panelIndex);
                        
                        return (
                            <MobileGrid 
                                daysToShow={viewMode === '1day' ? 1 : viewMode === '3day' ? 3 : 7} 
                                startDate={panelDate} 
                                events={events} 
                                holidays={holidays} 
                                departments={departments} 
                                hiddenDeptIds={hiddenDeptIds} 
                                onEventTap={handleEventTap} 
                                onSlotClick={handleSlotClick} 
                                // Only show waving draft on the CURRENT panel (offset 0)
                                draftEvent={offset === 0 && isSheetOpen ? sheetDraft : null} 
                                
                                // Placeholder handlers (DnD removed)
                                onEventHold={handleEventTap}
                                onEventDragStart={()=>{}} 
                            />
                        );
                    }}
                />
            )}
            
            {/* 3. Agenda View (Shared) */}
            {viewMode === 'agenda' && (
                <AgendaView events={events} departments={departments} onEventClick={isMobile ? handleEventTap : (ev) => handleOpenDesktopModal(new Date(ev.start_time), "", "", ev)} />
            )}
        </div>

        {/* --- OVERLAYS --- */}

        {/* Mobile: Expandable Sheet */}
        <ExpandableBottomSheet 
            isOpen={isSheetOpen} 
            onClose={() => { setIsSheetOpen(false); setSheetDraft(null); }}
            mode={canEditSheet ? "edit" : "view"}
            isExpanded={isSheetExpanded}
            onExpandChange={setIsSheetExpanded}
        >
            <MobileEventSheet 
                event={sheetEvent} 
                draftSlot={sheetDraft} 
                isExpanded={isSheetExpanded}
                canEdit={canEditSheet}
                onClose={() => { setIsSheetOpen(false); setSheetDraft(null); }}
                onRefresh={fetchData}
            />
        </ExpandableBottomSheet>

        {/* Desktop: Modal & Tooltip */}
        <EventModal 
            isOpen={isModalOpen} 
            onClose={() => { setIsModalOpen(false); setSelectedEvent(null); }} 
            onSuccess={fetchData} 
            initialDate={modalInitialDate} 
            initialStartTime={modalStart} 
            initialEndTime={modalEnd} 
            eventToEdit={selectedEvent} 
            currentUserId={userId} 
        />
        
        {hoveredEvent && (
            <EventTooltip 
                event={hoveredEvent} 
                departments={departments} 
                onClose={() => setHoveredEvent(null)} 
                onMouseEnter={() => { if(tooltipTimeout.current) clearTimeout(tooltipTimeout.current); }} 
                onMouseLeave={() => tooltipTimeout.current = setTimeout(() => setHoveredEvent(null), 150)} 
            />
        )}
      </GlassPane>
    </>
  );
});

CalendarGrid.displayName = "CalendarGrid";
export default CalendarGrid;