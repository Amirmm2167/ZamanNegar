import { CalendarEvent } from "@/types";

export interface VisualEvent extends CalendarEvent {
  right: number;
  width: number;
  laneIndex: number;
  totalLanes: number; 
}

// 👇 Internal interface to make TS happy about the helper properties
interface ProcessedEvent extends VisualEvent {
  _start: number;
  _end: number;
}

export function calculateEventLayout(events: CalendarEvent[]): VisualEvent[] {
  // 1. Sort
  const sorted = [...events].sort((a, b) => {
    const startA = new Date(a.start_time).getTime();
    const startB = new Date(b.start_time).getTime();
    if (startA !== startB) return startA - startB;
    const endA = new Date(a.end_time).getTime();
    const endB = new Date(b.end_time).getTime();
    return (endB - startB) - (endA - startA);
  });

  // Intermediate storage with CORRECT type
  const tempEvents: ProcessedEvent[] = [];

  // 2. Assign Lanes (Packing)
  sorted.forEach(event => {
    const startDate = new Date(event.start_time);
    const endDate = new Date(event.end_time);
    const startMinutes = startDate.getHours() * 60 + startDate.getMinutes();
    const endMinutes = endDate.getHours() * 60 + endDate.getMinutes();
    const duration = endMinutes - startMinutes;

    // Create the object with the explicit type
    const visualEvent: ProcessedEvent = {
      ...event,
      right: (startMinutes / 1440) * 100,
      width: (duration / 1440) * 100,
      laneIndex: 0,
      totalLanes: 1, // Default
      // Helper for collision check (using minutes)
      _start: startMinutes,
      _end: endMinutes
    };

    const usedLanes = new Set<number>();
    
    // Find collisions with already placed events
    // Now 'e' is correctly typed as ProcessedEvent, so e._end works!
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

  // 3. Calculate "Total Lanes" per Cluster (To size height)
  const finalEvents = tempEvents.map(ev => {
    const cluster = tempEvents.filter(other => 
      (ev._start < other._end) && (ev._end > other._start)
    );
    
    const maxLane = Math.max(...cluster.map(e => e.laneIndex));
    
    return {
      ...ev,
      totalLanes: maxLane + 1
    };
  });

  return finalEvents;
}