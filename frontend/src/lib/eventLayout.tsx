import { CalendarEvent } from "@/types";

export interface VisualEvent extends CalendarEvent {
  right: number;
  width: number;
  laneIndex: number;
  totalLanes: number; // <--- NEW: Tells us how to size the height
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

  // Intermediate storage
  const tempEvents: (VisualEvent & { endsAt: number })[] = [];

  // 2. Assign Lanes (Packing)
  sorted.forEach(event => {
    const startDate = new Date(event.start_time);
    const endDate = new Date(event.end_time);
    const startMinutes = startDate.getHours() * 60 + startDate.getMinutes();
    const endMinutes = endDate.getHours() * 60 + endDate.getMinutes();
    const duration = endMinutes - startMinutes;

    const visualEvent = {
      ...event,
      right: (startMinutes / 1440) * 100,
      width: (duration / 1440) * 100,
      laneIndex: 0,
      totalLanes: 1, // Default
      // Helper for collision check (using minutes)
      _start: startMinutes,
      _end: endMinutes
    };

    // Find Lane
    let placed = false;
    // Check existing lanes for space
    // We need to track lanes differently. 
    // Simple greedy approach: check previous events in temp array
    
    const usedLanes = new Set<number>();
    
    // Find collisions with already placed events
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
    tempEvents.push(visualEvent as any);
  });

  // 3. Calculate "Total Lanes" per Cluster (To size height)
  // For every event, find the max lane index used by ANY event it collides with.
  const finalEvents = tempEvents.map(ev => {
    // Find all events that overlap with THIS event
    const cluster = tempEvents.filter(other => 
      (ev._start < other._end) && (ev._end > other._start)
    );
    
    // The total height divisor is (Max Lane Index in Cluster) + 1
    const maxLane = Math.max(...cluster.map(e => e.laneIndex));
    
    return {
      ...ev,
      totalLanes: maxLane + 1
    };
  });

  return finalEvents;
}