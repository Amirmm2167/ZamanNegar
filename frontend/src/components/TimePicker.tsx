"use client";

import { useState, useRef, useEffect } from "react";
import { clsx } from "clsx";
import { toPersianDigits } from "@/lib/utils";

interface TimePickerProps {
  value: string; // "HH:MM"
  onChange: (time: string) => void;
  onClose: () => void;
}

export default function TimePicker({ value, onChange, onClose }: TimePickerProps) {
  const [mode, setMode] = useState<"hour" | "minute">("hour");
  
  // Parse initial value
  const [initialH, initialM] = value.split(":").map(Number);
  const [hour, setHour] = useState(initialH || 0);
  const [minute, setMinute] = useState(initialM || 0);

  // Clock constants
  const RADIUS = 120;
  const INNER_RADIUS = 70; // For 13-24 hours (or 00-12 in 24h mode inner ring)

  const handleSave = () => {
    const formatted = `${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}`;
    onChange(formatted);
    onClose();
  };

  // Helper to calculate position for numbers
  const getPosition = (index: number, radius: number) => {
    const angle = (index * 30 - 90) * (Math.PI / 180);
    return {
      left: RADIUS + radius * Math.cos(angle),
      top: RADIUS + radius * Math.sin(angle),
    };
  };

  const handleClockClick = (e: React.MouseEvent<HTMLDivElement>, isMinute = false) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left - RADIUS;
    const y = e.clientY - rect.top - RADIUS;
    
    // Calculate angle
    let angle = Math.atan2(y, x) * (180 / Math.PI) + 90;
    if (angle < 0) angle += 360;

    if (!isMinute) {
      // HOUR LOGIC
      // Check distance to see if clicked inner or outer ring
      const dist = Math.sqrt(x * x + y * y);
      const isInner = dist < 90; // Threshold between rings
      
      let selectedHour = Math.round(angle / 30);
      if (selectedHour === 0 || selectedHour === 12) selectedHour = 0;
      
      // If we want 24h standard: 
      // Outer ring: 0-11, Inner ring: 12-23 OR vice versa based on design preference
      // Let's stick to standard 24h face:
      // Outer: 1-12, Inner: 13-00
      
      // Simplified robust logic:
      // If simple 24h clock: 
      // Inner (13-24/00), Outer (1-12)
      
      if (selectedHour === 0) selectedHour = 12; // Normalize 12 position
      
      if (isInner) {
         if (selectedHour === 12) selectedHour = 0;
         else selectedHour += 12;
      } else {
         if (selectedHour === 12) selectedHour = 12; 
      }
      
      // Edge case for 24:00/00:00 visual logic
      if (selectedHour === 24) selectedHour = 0;

      setHour(selectedHour);
      
      // Auto switch to minute
      setTimeout(() => setMode("minute"), 300);
    } else {
      // MINUTE LOGIC
      // Round to nearest 5 for easier clicking, but allow fine grain if needed
      // Let's snap to 6 degrees (1 minute)
      let selectedMinute = Math.round(angle / 6);
      if (selectedMinute === 60) selectedMinute = 0;
      setMinute(selectedMinute);
    }
  };

  // Render Hand Rotation
  const getHandRotation = () => {
    if (mode === "hour") {
      let h = hour;
      if (h >= 12) h -= 12;
      return h * 30;
    }
    return minute * 6;
  };

  const isInnerRing = mode === "hour" && (hour === 0 || hour > 12);

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="w-full max-w-sm bg-[#252526] rounded-xl shadow-2xl overflow-hidden text-gray-100" dir="ltr">
        
        {/* Header Display */}
        <div className="bg-[#333] p-6 flex justify-center items-center gap-2 text-5xl font-bold select-none">
          <button 
            onClick={() => setMode("hour")}
            className={clsx("transition-colors", mode === "hour" ? "text-blue-400" : "text-gray-400")}
          >
            {toPersianDigits(String(hour).padStart(2, "0"))}
          </button>
          <span className="text-gray-400 -mt-2">:</span>
          <button 
            onClick={() => setMode("minute")}
            className={clsx("transition-colors", mode === "minute" ? "text-blue-400" : "text-gray-400")}
          >
            {toPersianDigits(String(minute).padStart(2, "0"))}
          </button>
        </div>

        {/* Clock Face */}
        <div className="p-6 flex justify-center bg-[#1e1e1e]">
          <div 
            className="relative w-[240px] h-[240px] bg-[#2d2d2e] rounded-full shadow-inner cursor-pointer"
            onClick={(e) => handleClockClick(e, mode === "minute")}
          >
            {/* Center Dot */}
            <div className="absolute top-1/2 left-1/2 w-2 h-2 bg-blue-500 rounded-full -translate-x-1/2 -translate-y-1/2 z-20"></div>

            {/* Hand */}
            <div 
              className="absolute top-1/2 left-1/2 w-[2px] bg-blue-500 origin-bottom z-10 transition-transform duration-300 ease-out"
              style={{ 
                height: isInnerRing ? '70px' : '95px',
                transform: `translate(-50%, -100%) rotate(${getHandRotation()}deg)` 
              }}
            >
              {/* Hand Tip Circle */}
              <div className="absolute top-0 left-1/2 w-8 h-8 bg-blue-500/20 rounded-full -translate-x-1/2 -translate-y-1/2 flex items-center justify-center border border-blue-500">
                <div className="w-1 h-1 bg-blue-500 rounded-full"></div>
              </div>
            </div>

            {/* Numbers */}
            {mode === "hour" && (
              <>
                {/* Outer Ring (1-12) */}
                {[12, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11].map((h, i) => {
                  const pos = getPosition(i, 95);
                  return (
                    <div 
                      key={h}
                      className={clsx(
                        "absolute w-8 h-8 flex items-center justify-center rounded-full text-sm font-medium -translate-x-1/2 -translate-y-1/2 transition-colors",
                        hour === h ? "text-white" : "text-gray-400"
                      )}
                      style={{ left: pos.left, top: pos.top }}
                    >
                      {toPersianDigits(h)}
                    </div>
                  );
                })}
                {/* Inner Ring (13-00) */}
                {[0, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23].map((h, i) => {
                  const pos = getPosition(i, 70); // Closer to center
                  return (
                    <div 
                      key={h}
                      className={clsx(
                        "absolute w-6 h-6 flex items-center justify-center rounded-full text-xs font-medium -translate-x-1/2 -translate-y-1/2 transition-colors",
                        hour === h ? "text-white" : "text-gray-500"
                      )}
                      style={{ left: pos.left, top: pos.top }}
                    >
                      {toPersianDigits(h === 0 ? "00" : h)}
                    </div>
                  );
                })}
              </>
            )}

            {mode === "minute" && (
              [0, 5, 10, 15, 20, 25, 30, 35, 40, 45, 50, 55].map((m, i) => {
                const pos = getPosition(i, 95);
                return (
                  <div 
                    key={m}
                    className={clsx(
                      "absolute w-8 h-8 flex items-center justify-center rounded-full text-sm font-medium -translate-x-1/2 -translate-y-1/2 transition-colors",
                      minute === m ? "text-white" : "text-gray-400"
                    )}
                    style={{ left: pos.left, top: pos.top }}
                  >
                    {toPersianDigits(m)}
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Footer Actions */}
        <div className="flex justify-end p-4 gap-4 bg-[#252526]">
          <button onClick={onClose} className="text-sm font-bold text-gray-400 hover:text-white transition-colors">
            انصراف
          </button>
          <button onClick={handleSave} className="text-sm font-bold text-blue-400 hover:text-blue-300 transition-colors">
            تایید
          </button>
        </div>
      </div>
    </div>
  );
}