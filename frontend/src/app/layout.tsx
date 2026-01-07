import type { Metadata, Viewport } from "next"; // Import Viewport
import localFont from "next/font/local";
import "./globals.css";
import ModernBackground from "@/components/ui/ModernBackground";
import ServiceWorkerRegister from "@/components/ServiceWorkerRegister";
import Providers from "@/components/Providers"; 

const pinar = localFont({
  src: [
    { path: "./fonts/Pinar-Regular.woff2", weight: "400", style: "normal" },
    { path: "./fonts/Pinar-Bold.woff2", weight: "700", style: "normal" },
  ],
  variable: "--font-pinar",
});

export const viewport: Viewport = {
  themeColor: "#000000",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false, // Replaces 'user-scalable=0'
};

export const metadata: Metadata = {
  title: "زمان‌نگار",
  description: "سامانه مدیریت رویدادها",
  manifest: "/manifest.json",
  icons: {
    icon: "/icons/icon.png",
    apple: "/icons/logo.png",
  },
  // Removed themeColor and viewport from here
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fa" dir="rtl">
      <body className={`${pinar.className} bg-black min-h-screen overflow-hidden text-gray-100`}>
        <ServiceWorkerRegister />
        
        {/* 1. Background */}
        <div className="fixed inset-0 z-0">
            <ModernBackground />
        </div>
        
        {/* 2. Content */}
        <div className="relative z-10 h-full">
          <Providers>
            {children}
          </Providers>
        </div>
      </body>
    </html>
  );
}