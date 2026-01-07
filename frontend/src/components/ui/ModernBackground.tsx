"use client";

import { motion } from "framer-motion";

export default function ModernBackground() {
  return (
    <div className="fixed inset-0 z-[-1] overflow-hidden bg-[#050505]">
      
      {/* 1. Static Noise Texture (The "Expensive" Feel) */}
      <div 
        className="absolute inset-0 z-[2] opacity-[0.03] pointer-events-none mix-blend-overlay"
        style={{
            backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.65' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)' opacity='1'/%3E%3C/svg%3E")`,
            backgroundRepeat: 'repeat',
        }}
      />

      {/* 2. Ambient Orbs (Subtle Movement) */}
      <motion.div
        animate={{
          scale: [1, 1.2, 1],
          opacity: [0.3, 0.2, 0.3],
          x: [0, 50, 0],
        }}
        transition={{ duration: 15, repeat: Infinity, ease: "easeInOut" }}
        className="absolute top-[-10%] left-[-10%] w-[800px] h-[800px] bg-blue-900/20 rounded-full blur-[120px] mix-blend-screen"
      />

      <motion.div
        animate={{
          scale: [1, 1.1, 1],
          opacity: [0.2, 0.15, 0.2],
          x: [0, -30, 0],
        }}
        transition={{ duration: 20, repeat: Infinity, ease: "easeInOut", delay: 2 }}
        className="absolute bottom-[-10%] right-[-10%] w-[600px] h-[600px] bg-emerald-900/10 rounded-full blur-[100px] mix-blend-screen"
      />
      
      <div className="absolute top-[20%] right-[20%] w-[400px] h-[400px] bg-purple-900/10 rounded-full blur-[90px] mix-blend-screen opacity-30" />

      {/* 3. Vignette */}
      <div className="absolute inset-0 bg-gradient-to-t from-black via-transparent to-black/80 z-[1]" />
    </div>
  );
}