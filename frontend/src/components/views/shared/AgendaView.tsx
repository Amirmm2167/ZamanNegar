"use client";

import { CalendarEvent, Department } from "@/types";

interface AgendaViewProps {
  events: CalendarEvent[];
  departments: Department[];
  onEventClick: (e: CalendarEvent) => void;
}

export default function AgendaView({ events, departments, onEventClick }: AgendaViewProps) {
  const sortedEvents = [...events].sort((a, b) => new Date(a.start_time).getTime() - new Date(b.start_time).getTime());

  const grouped: { [key: string]: CalendarEvent[] } = {};
  sortedEvents.forEach(ev => {
      const day = new Date(ev.start_time).toLocaleDateString("fa-IR", { weekday: 'long', day: 'numeric', month: 'long' });
      if (!grouped[day]) grouped[day] = [];
      grouped[day].push(ev);
  });

  return (
    <div className="h-full w-full overflow-y-auto custom-scrollbar p-4 space-y-6">
        {Object.entries(grouped).map(([dayStr, evs]) => (
            <div key={dayStr} className="space-y-2">
                <div className="sticky top-0 bg-[#020205]/80 backdrop-blur-md py-2 border-b border-white/10 z-10">
                    <h3 className="text-sm font-bold text-blue-400">{dayStr}</h3>
                </div>
                {evs.map(ev => {
                    const dept = departments.find(d => d.id === ev.department_id);
                    const startTime = new Date(ev.start_time).toLocaleTimeString("fa-IR", { hour: '2-digit', minute: '2-digit' });
                    const endTime = new Date(ev.end_time).toLocaleTimeString("fa-IR", { hour: '2-digit', minute: '2-digit' });
                    
                    return (
                        <div 
                            key={ev.id} 
                            onClick={() => onEventClick(ev)}
                            className="bg-white/5 border border-white/5 rounded-xl p-3 flex items-center gap-4 hover:bg-white/10 transition-colors cursor-pointer active:scale-95 duration-200"
                        >
                            <div className="flex flex-col items-center min-w-[50px] border-l border-white/10 pl-3 text-gray-400">
                                <span className="text-sm font-bold text-white">{startTime}</span>
                                <span className="text-[10px]">{endTime}</span>
                            </div>
                            <div className="flex-1">
                                <div className="font-bold text-sm text-gray-200">{ev.title}</div>
                                {dept && <div className="text-[10px] px-2 py-0.5 rounded-full inline-block mt-1" style={{ backgroundColor: dept.color + '40', color: dept.color }}>{dept.name}</div>}
                            </div>
                        </div>
                    );
                })}
            </div>
        ))}
        {sortedEvents.length === 0 && (
            <div className="text-center text-gray-500 mt-10">هیچ رویدادی برای نمایش وجود ندارد.</div>
        )}
    </div>
  );
}