import { CalendarEvent } from "@/types";

export interface VisualEvent extends CalendarEvent {
  right: number;
  width: number;
  laneIndex: number;
  totalLanes: number; 
}

// Internal interface for processing
interface ProcessedEvent extends VisualEvent {
  _start: number;
  _end: number;
}

export function calculateEventLayout(events: CalendarEvent[]): VisualEvent[] {
  if (events.length === 0) return [];

  // 1. Sort events by start time, then by duration (longest first)
  const sorted = [...events].sort((a, b) => {
    const startA = new Date(a.start_time).getTime();
    const startB = new Date(b.start_time).getTime();
    if (startA !== startB) return startA - startB;
    
    const endA = new Date(a.end_time).getTime();
    const endB = new Date(b.end_time).getTime();
    return (endB - startB) - (endA - startA);
  });

  const tempEvents: ProcessedEvent[] = [];

  // 2. Assign Lanes (Greedy Packing)
  sorted.forEach(event => {
    const startDate = new Date(event.start_time);
    const endDate = new Date(event.end_time);
    
    // Normalize to minutes of the day
    const startMinutes = startDate.getHours() * 60 + startDate.getMinutes();
    let endMinutes = endDate.getHours() * 60 + endDate.getMinutes();
    
    // Handle events ending at midnight (00:00) of next day as 1440
    if (endMinutes === 0 && endDate.getDate() !== startDate.getDate()) {
        endMinutes = 1440;
    }
    // Handle minimal height for visibility
    if (endMinutes <= startMinutes) endMinutes = startMinutes + 15;

    const visualEvent: ProcessedEvent = {
      ...event,
      right: 0, // Placeholder, calculated in step 3
      width: 0, // Placeholder, calculated in step 3
      laneIndex: 0,
      totalLanes: 1, 
      _start: startMinutes,
      _end: endMinutes
    };

    // Find used lanes by checking overlaps with already placed events
    const usedLanes = new Set<number>();
    const collidingEvents = tempEvents.filter(e => 
      (visualEvent._start < e._end) && (visualEvent._end > e._start)
    );

    collidingEvents.forEach(e => usedLanes.add(e.laneIndex));

    // Find first free lane
    let lane = 0;
    while (usedLanes.has(lane)) {
      lane++;
    }
    visualEvent.laneIndex = lane;
    tempEvents.push(visualEvent);
  });

  // 3. Calculate Visual Dimensions (Width & Right Position)
  const finalEvents = tempEvents.map(ev => {
    // Find the "cluster" of mutually overlapping events to determine shared width
    const cluster = tempEvents.filter(other => 
      (ev._start < other._end) && (ev._end > other._start)
    );
    
    // The max lane index in this cluster determines the total columns needed
    const maxLane = Math.max(...cluster.map(e => e.laneIndex));
    const totalLanes = maxLane + 1;
    
    // Calculate width as a percentage of the day column
    const width = 100 / totalLanes;
    
    // Calculate Right position (RTL: Lane 0 is rightmost)
    // Lane 0 -> Right 0%
    // Lane 1 -> Right 50% (if 2 lanes)
    const right = ev.laneIndex * width;

    return {
      ...ev,
      totalLanes,
      width,
      right
    };
  });

  return finalEvents;
}