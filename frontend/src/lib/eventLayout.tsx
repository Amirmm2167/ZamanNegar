import { CalendarEvent } from "@/types";

export interface VisualEvent extends CalendarEvent {
  // Positioning (0-100%)
  startPercent: number; // Top (Vertical) or Right (Horizontal/RTL)
  sizePercent: number;  // Height (Vertical) or Width (Horizontal)
  
  // Cross-Axis (Lanes)
  laneIndex: number;
  totalLanes: number;
}

type LayoutDirection = 'vertical' | 'horizontal';

/**
 * Calculates the visual position of events for both Vertical (Mobile) and Horizontal (Desktop) views.
 * Uses a column-packing/graph-coloring algorithm to handle overlaps efficiently.
 */
export function calculateEventLayout(events: CalendarEvent[], direction: LayoutDirection = 'vertical'): VisualEvent[] {
  if (events.length === 0) return [];

  // 1. Normalize Events (Convert time to 0-1440 minutes)
  const processed = events.map(e => {
    const start = new Date(e.start_time);
    const end = new Date(e.end_time);
    
    let startMin = start.getHours() * 60 + start.getMinutes();
    let endMin = end.getHours() * 60 + end.getMinutes();
    
    // Handle wrapping/midnight (e.g., ends next day)
    if (endMin <= startMin) endMin = 1440; 
    // Minimum duration of 15 minutes for visibility
    if (endMin - startMin < 15) endMin = startMin + 15;

    return {
      ...e,
      _start: startMin,
      _end: endMin,
      _duration: endMin - startMin
    };
  }).sort((a, b) => {
    // Sort by start time primary, duration secondary (longest first for better packing)
    if (a._start !== b._start) return a._start - b._start;
    return b._duration - a._duration;
  });

  const finalEvents: VisualEvent[] = [];
  const columns: typeof processed[] = [];
  let lastEnd = -1;

  // 2. Pack into Columns/Lanes (Graph Coloring)
  processed.forEach(ev => {
    // If this event starts after the last group finished, process the group
    if (ev._start >= lastEnd) {
      packGroup(columns, finalEvents, direction);
      columns.length = 0;
      lastEnd = -1;
    }

    // Try to place in an existing lane/column
    let placed = false;
    for (let i = 0; i < columns.length; i++) {
      const col = columns[i];
      if (col.length === 0 || col[col.length - 1]._end <= ev._start) {
        col.push(ev);
        placed = true;
        break;
      }
    }

    // If no space, create a new lane
    if (!placed) {
      columns.push([ev]);
    }

    if (ev._end > lastEnd) {
      lastEnd = ev._end;
    }
  });

  // Process the final group
  if (columns.length > 0) {
    packGroup(columns, finalEvents, direction);
  }

  return finalEvents;
}

/**
 * Calculates dimensions for a group of overlapping events.
 * Distributes width/height evenly among lanes.
 */
function packGroup(columns: any[][], output: VisualEvent[], direction: LayoutDirection) {
  const n = columns.length;
  for (let i = 0; i < n; i++) {
    const col = columns[i];
    for (const ev of col) {
      // Primary Axis (Time): 0 to 1440 mins -> 0% to 100%
      const startP = (ev._start / 1440) * 100;
      const sizeP = (ev._duration / 1440) * 100;

      // Secondary Axis (Lanes): Distribute evenly
      // In RTL Horizontal, we don't necessarily invert here because CSS 'right' handles it.
      
      output.push({
        ...ev,
        startPercent: startP,
        sizePercent: sizeP,
        laneIndex: i,
        totalLanes: n
      });
    }
  }
}