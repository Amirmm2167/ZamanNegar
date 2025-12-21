"use client";

import { StringXor } from "next/dist/compiled/webpack/webpack";
import { useEffect, useRef } from "react";

// --- 1. Class Defined Outside Component (Fixes Compilation Error) ---
class Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  canvasWidth: number;
  canvasHeight: number;

  constructor(width: number, height: number) {
    this.canvasWidth = width;
    this.canvasHeight = height;
    this.x = Math.random() * width;
    this.y = Math.random() * height;
    // Constant movement speed (random direction)
    this.vx = (Math.random() - 0.5) * 0.8; // Adjusted speed for constant flow
    this.vy = (Math.random() - 0.5) * 0.8;
    this.size = Math.random() * 2 + 1;
  }

  // Update bounds if window resizes
  setBounds(width: number, height: number) {
    this.canvasWidth = width;
    this.canvasHeight = height;
  }

  update() {
    this.x += this.vx;
    this.y += this.vy;

    // --- 2. Wall Bouncing Logic (No Mouse Interaction) ---
    // If hits left or right edge, reverse horizontal velocity
    if (this.x <= 0 || this.x >= this.canvasWidth) {
      this.vx *= -1;
      // Keep inside bounds to prevent sticking
      if (this.x <= 0) this.x = 0; 
      if (this.x >= this.canvasWidth) this.x = this.canvasWidth;
    }

    // If hits top or bottom edge, reverse vertical velocity
    if (this.y <= 0 || this.y >= this.canvasHeight) {
      this.vy *= -1;
      // Keep inside bounds
      if (this.y <= 0) this.y = 0;
      if (this.y >= this.canvasHeight) this.y = this.canvasHeight;
    }
  }

  draw(ctx: CanvasRenderingContext2D) {
    ctx.fillStyle = "rgba(255, 255, 255, 0.9)";
    ctx.beginPath();
    ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
    ctx.fill();
  }
}

export default function BackgroundParticles() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let animationFrameId: number;
    let width = window.innerWidth;
    let height = window.innerHeight;
    
    // Configuration
    let particles: Particle[] = [];
    const particleCount = 120; 
    const connectionDistance = 200; 

    // Initialize Particles
    const initParticles = () => {
      width = window.innerWidth;
      height = window.innerHeight;
      canvas.width = width;
      canvas.height = height;
      
      particles = [];
      for (let i = 0; i < particleCount; i++) {
        particles.push(new Particle(width, height));
      }
    };

    // Initial Setup
    initParticles();

    // Handle Resize
    const handleResize = () => {
      width = window.innerWidth;
      height = window.innerHeight;
      canvas.width = width;
      canvas.height = height;
      // Update existing particles instead of resetting to keep animation smooth
      particles.forEach(p => p.setBounds(width, height));
    };
    
    window.addEventListener("resize", handleResize);

    // Animation Loop
    const animate = () => {
      ctx.clearRect(0, 0, width, height);
      
      particles.forEach((p, index) => {
        p.update();
        p.draw(ctx);

        // Draw Connections (Constellation Effect)
        for (let j = index + 1; j < particles.length; j++) {
          const p2 = particles[j];
          const dx = p.x - p2.x;
          const dy = p.y - p2.y;
          const distance = Math.sqrt(dx * dx + dy * dy);

          if (distance < connectionDistance) {
            const opacity = 1 - distance / connectionDistance;
            ctx.strokeStyle = `rgba(255, 255, 255, ${opacity * 0.15})`;
            ctx.lineWidth = 1;
            ctx.beginPath();
            ctx.moveTo(p.x, p.y);
            ctx.lineTo(p2.x, p2.y);
            ctx.stroke();
          }
        }
      });

      animationFrameId = requestAnimationFrame(animate);
    };

    animate();

    return () => {
      window.removeEventListener("resize", handleResize);
      cancelAnimationFrame(animationFrameId);
    };
  }, []);

  return (
    <canvas 
      ref={canvasRef} 
      className="fixed inset-0 z-0 pointer-events-none bg-gradient-to-br from-[#000000] to-[#1e1b4b]"
    />
  );
}