"use client";

import { useState, useRef, useEffect } from "react";
import clsx from "clsx";
import { toPersianDigits } from "@/lib/utils";
import ModalWrapper from "@/components/ui/ModalWrapper"; // Using your wrapper
import { Clock } from "lucide-react";

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
  const INNER_RADIUS = 70; 

  const handleSave = () => {
    const formatted = `${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}`;
    onChange(formatted);
    onClose();
  };

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
    
    let angle = Math.atan2(y, x) * (180 / Math.PI) + 90;
    if (angle < 0) angle += 360;

    if (!isMinute) {
      // HOUR LOGIC
      const dist = Math.sqrt(x * x + y * y);
      const isInner = dist < 90; 
      
      let selectedHour = Math.round(angle / 30);
      if (selectedHour === 0) selectedHour = 12; 
      
      if (isInner) {
         if (selectedHour === 12) selectedHour = 0;
         else selectedHour += 12;
      } else {
         if (selectedHour === 12) selectedHour = 12; 
      }
      
      if (selectedHour === 24) selectedHour = 0;

      setHour(selectedHour);
      setTimeout(() => setMode("minute"), 300);
    } else {
      // MINUTE LOGIC
      let selectedMinute = Math.round(angle / 6);
      if (selectedMinute === 60) selectedMinute = 0;
      setMinute(selectedMinute);
    }
  };

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
    <ModalWrapper isOpen={true} onClose={onClose} size="sm" title={
        <div className="flex items-center gap-2">
            <Clock size={20} className="text-blue-500"/>
            <span>انتخاب زمان</span>
        </div>
    }>
      <div className="flex flex-col items-center pb-6" dir="ltr">
        
        {/* Digital Display */}
        <div className="flex justify-center items-center gap-2 text-5xl font-bold select-none my-6">
          <button 
            onClick={() => setMode("hour")}
            className={clsx("transition-colors px-2 py-1 rounded hover:bg-white/5", mode === "hour" ? "text-blue-400" : "text-gray-400")}
          >
            {toPersianDigits(String(hour).padStart(2, "0"))}
          </button>
          <span className="text-gray-500 -mt-2 animate-pulse">:</span>
          <button 
            onClick={() => setMode("minute")}
            className={clsx("transition-colors px-2 py-1 rounded hover:bg-white/5", mode === "minute" ? "text-blue-400" : "text-gray-400")}
          >
            {toPersianDigits(String(minute).padStart(2, "0"))}
          </button>
        </div>

        {/* Analog Clock */}
        <div className="relative w-[240px] h-[240px] bg-[#252526] rounded-full shadow-[inset_0_0_20px_rgba(0,0,0,0.5)] cursor-pointer select-none ring-4 ring-[#1e1e1e]"
             onClick={(e) => handleClockClick(e, mode === "minute")}
        >
            {/* Center Dot */}
            <div className="absolute top-1/2 left-1/2 w-3 h-3 bg-blue-500 rounded-full -translate-x-1/2 -translate-y-1/2 z-20 shadow-lg shadow-blue-500/50"></div>

            {/* Hand */}
            <div 
              className="absolute top-1/2 left-1/2 w-[2px] bg-blue-500 origin-bottom z-10 transition-transform duration-300 ease-out shadow-[0_0_10px_rgba(59,130,246,0.5)]"
              style={{ 
                height: isInnerRing ? '70px' : '95px',
                transform: `translate(-50%, -100%) rotate(${getHandRotation()}deg)` 
              }}
            >
              <div className="absolute top-0 left-1/2 w-8 h-8 bg-blue-500/20 rounded-full -translate-x-1/2 -translate-y-1/2 flex items-center justify-center border border-blue-500 backdrop-blur-sm">
                <div className="w-1.5 h-1.5 bg-blue-500 rounded-full"></div>
              </div>
            </div>

            {/* Numbers */}
            {mode === "hour" && (
              <>
                {[12, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11].map((h, i) => {
                  const pos = getPosition(i, 95);
                  return (
                    <div key={h} className={clsx("absolute w-8 h-8 flex items-center justify-center rounded-full text-sm font-bold -translate-x-1/2 -translate-y-1/2 transition-colors", hour === h ? "text-white scale-125" : "text-gray-400")} style={{ left: pos.left, top: pos.top }}>
                      {toPersianDigits(h)}
                    </div>
                  );
                })}
                {[0, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23].map((h, i) => {
                  const pos = getPosition(i, 70);
                  return (
                    <div key={h} className={clsx("absolute w-6 h-6 flex items-center justify-center rounded-full text-xs font-medium -translate-x-1/2 -translate-y-1/2 transition-colors", hour === h ? "text-white scale-125" : "text-gray-500")} style={{ left: pos.left, top: pos.top }}>
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
                  <div key={m} className={clsx("absolute w-8 h-8 flex items-center justify-center rounded-full text-sm font-bold -translate-x-1/2 -translate-y-1/2 transition-colors", minute === m ? "text-white scale-125" : "text-gray-400")} style={{ left: pos.left, top: pos.top }}>
                    {toPersianDigits(m)}
                  </div>
                );
              })
            )}
        </div>

        {/* Actions */}
        <div className="flex gap-3 w-full px-8 mt-8" dir="rtl">
            <button onClick={onClose} className="flex-1 py-3 bg-white/5 hover:bg-white/10 text-gray-300 rounded-xl font-bold transition-colors">
                انصراف
            </button>
            <button onClick={handleSave} className="flex-1 py-3 bg-blue-600 hover:bg-blue-500 text-white rounded-xl font-bold shadow-lg shadow-blue-900/20 transition-all hover:scale-105">
                تایید زمان
            </button>
        </div>
      </div>
    </ModalWrapper>
  );
}