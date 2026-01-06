"use client";

import clsx from "clsx";

interface SkeletonGridProps {
  daysToShow: 1 | 3 | 7;
}

export default function SkeletonGrid({ daysToShow }: SkeletonGridProps) {
  const days = Array.from({ length: daysToShow });

  return (
    <div className="flex flex-col h-full w-full bg-[#121212] relative overflow-hidden animate-in fade-in duration-500">
      {/* HEADER SKELETON */}
      <div className="flex flex-row gap-0 border-b border-white/10 h-14 bg-white/5 shrink-0 z-20">
         {/* Time Column Header Placeholder */}
         <div className="w-10 border-l border-white/10 bg-black/20" />
         
         {days.map((_, i) => (
            <div key={i} className="flex-1 flex flex-col items-center justify-center border-r border-white/10 gap-1">
                {/* Weekday Name Blob */}
                <div className="w-8 h-3 bg-white/10 rounded-full animate-pulse" />
                {/* Date Number Blob */}
                <div className="w-6 h-6 bg-white/10 rounded-full animate-pulse delay-75" />
            </div>
         ))}
      </div>

      {/* BODY SKELETON */}
      <div className="flex-1 flex flex-row relative overflow-hidden">
        {/* Time Column */}
        <div className="w-10 flex flex-col border-l border-white/10 bg-black/20 shrink-0">
            {Array.from({ length: 12 }).map((_, h) => (
                <div key={h} className="h-[60px] border-b border-white/5 flex items-start justify-center pt-2">
                     <div className="w-4 h-2 bg-white/5 rounded animate-pulse" />
                </div>
            ))}
        </div>

        {/* Grid Columns */}
        {days.map((_, i) => (
            <div key={i} className="flex-1 border-r border-white/10 h-full relative">
                {/* Horizontal Lines */}
                {Array.from({ length: 12 }).map((_, h) => (
                    <div key={h} className="h-[60px] border-b border-white/5" />
                ))}

                {/* Fake Event Skeletons - Randomly placed for realism */}
                <div 
                    className="absolute left-1 right-1 h-[50px] bg-white/5 rounded border-r-2 border-white/10 animate-pulse" 
                    style={{ top: `${(i + 1) * 100 + 20}px` }}
                />
                <div 
                    className="absolute left-1 right-1 h-[80px] bg-white/5 rounded border-r-2 border-white/10 animate-pulse delay-100" 
                    style={{ top: `${(i + 3) * 100 + 10}px` }}
                />
            </div>
        ))}
      </div>
    </div>
  );
}