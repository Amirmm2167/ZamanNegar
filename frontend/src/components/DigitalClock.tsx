"use client";

import { useState, useEffect } from "react";
import { toPersianDigits } from "@/lib/utils";

export default function DigitalClock() {
  const [time, setTime] = useState<Date | null>(null);

  useEffect(() => {
    setTime(new Date());
    const interval = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(interval);
  }, []);

  // Placeholder to prevent layout shift before load
  if (!time) return <div className="w-[120px] h-[40px]"></div>;

  return (
    <div className="flex flex-col items-end leading-tight w-[120px]"> {/* Fixed Width */}
      <span className="text-xl font-bold font-mono tracking-wider tabular-nums text-gray-100">
        {toPersianDigits(time.toLocaleTimeString("fa-IR", { hour12: false }))}
      </span>
      <span className="text-xs text-gray-400">
        {time.toLocaleDateString("fa-IR", { weekday: 'long', day: 'numeric', month: 'long' })}
      </span>
    </div>
  );
}