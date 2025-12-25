"use client";

export default function ModernBackground() {
  return (
    <div className="fixed inset-0 z-0 overflow-hidden bg-[#020205]">
      {/* 1. Deep Base Layer */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,#0f172a_0%,#020205_100%)]" />

      {/* 2. Soft Mesh Highlights (The "Beautiful" Touch) */}
      <div 
        className="absolute top-[-20%] left-[-10%] w-[70%] h-[70%] rounded-full opacity-20 blur-[120px]" 
        style={{ background: 'radial-gradient(circle, #1e1b4b 0%, transparent 70%)' }}
      />
      <div 
        className="absolute bottom-[-10%] right-[-10%] w-[60%] h-[60%] rounded-full opacity-15 blur-[100px]" 
        style={{ background: 'radial-gradient(circle, #312e81 0%, transparent 70%)' }}
      />
      <div 
        className="absolute top-[20%] right-[10%] w-[40%] h-[40%] rounded-full opacity-10 blur-[130px]" 
        style={{ background: 'radial-gradient(circle, #4338ca 0%, transparent 70%)' }}
      />

  {/* 3. The Refined Noise Layer (Ultra-subtle) */}
      <div 
        className="absolute inset-0 opacity-[0.015] pointer-events-none mix-blend-overlay"
        style={{ 
          // baseFrequency="0.9" makes the grain much smaller and "silky"
          // opacity is dropped to 0.015 for extreme subtlety
          backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 250 250' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E")` 
        }}
      />
      
      {/* 4. Optional: Subtle Vignette to focus the center */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,transparent_0%,rgba(0,0,0,0.4)_100%)]" />
    </div>
  );
}