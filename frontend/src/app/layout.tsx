import type { Metadata } from "next";
import localFont from "next/font/local";
import "./globals.css";
import BackgroundParticles from "@/components/ui/BackgroundParticles";
import ServiceWorkerRegister from "@/components/ServiceWorkerRegister";

const pinar = localFont({
  src: [
    { path: "./fonts/Pinar-Regular.woff2", weight: "400", style: "normal" },
    { path: "./fonts/Pinar-Bold.woff2", weight: "700", style: "normal" },
  ],
  variable: "--font-pinar",
});

export const metadata: Metadata = {
  title: "زمان‌نگار",
  description: "سامانه مدیریت رویدادها",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fa" dir="rtl">
      <body className={`${pinar.className} bg-black min-h-screen overflow-hidden text-gray-100`}>
        
        <ServiceWorkerRegister />
        
        {/* 1. The Living Background */}
        <div className="fixed inset-0 z-0">
            <BackgroundParticles />
        </div>
        
        {/* 2. The App Layer (Glass sits on top) */}
        <div className="relative z-10 h-full">
          {children}
        </div>
      </body>
    </html>
  );
}