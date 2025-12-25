"use client";

export default function ModernBackground() {
  return (
    <div className="fixed inset-0 z-0 overflow-hidden bg-[#050505]">
      {/* 1. Base Gradient (Windows 11 Depth) */}
      <div 
        className="absolute inset-0 bg-gradient-to-br from-[#000000] via-[#0a0a1a] to-[#1e1b4b] opacity-100" 
      />

      {/* 2. Soft Mesh Highlights */}
      <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] rounded-full bg-blue-900/20 blur-[120px]" />
      <div className="absolute bottom-[-5%] right-[-5%] w-[30%] h-[30%] rounded-full bg-indigo-900/20 blur-[100px]" />

      {/* 3. The Noise Layer (Windows 10/11 Grain) */}
      <div 
        className="absolute inset-0 opacity-[0.04] pointer-events-none contrast-150 brightness-100"
        style={{ 
          backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.8' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E")` 
        }}
      />
    </div>
  );
}