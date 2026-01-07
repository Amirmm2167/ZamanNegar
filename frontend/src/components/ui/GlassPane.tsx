"use client";

import clsx from "clsx";
import { HTMLAttributes } from "react";

interface GlassPaneProps extends HTMLAttributes<HTMLDivElement> {
  intensity?: "low" | "medium" | "high";
  children: React.ReactNode;
}

export default function GlassPane({ 
  intensity = "medium", 
  className, 
  children,
  ...props 
}: GlassPaneProps) {
  
  const intensityStyles = {
    low: "bg-[#18181b]/40 backdrop-blur-lg border-white/5",
    medium: "bg-[#18181b]/60 backdrop-blur-xl backdrop-saturate-150 border-white/5 shadow-xl", // The 2026 Standard
    high: "bg-[#18181b]/80 backdrop-blur-2xl backdrop-saturate-200 border-white/10 shadow-2xl",
  };

  return (
    <div 
      className={clsx(
        "border rounded-3xl transition-all duration-300",
        intensityStyles[intensity],
        className
      )}
      {...props}
    >
      {children}
    </div>
  );
}