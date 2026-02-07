import type { Metadata, Viewport } from "next";
import localFont from "next/font/local";
import "./globals.css";
import ServiceWorkerRegister from "@/components/ServiceWorkerRegister";
import Providers from "@/components/Providers";
import AppShell from "@/components/layout/AppShell"; // Import AppShell

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
  userScalable: false,
};

export const metadata: Metadata = {
  title: "زمان‌نگار",
  description: "سامانه مدیریت رویدادها",
  manifest: "/manifest.json",
  icons: {
    icon: "/icons/icon.png",
    apple: "/icons/logo.png",
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fa" dir="rtl">
      <body className={`${pinar.className} bg-black min-h-screen overflow-hidden text-gray-100`}>
        <ServiceWorkerRegister />

        <Providers>
          {/* The AppShell now handles background, mobile detection, and navigation */}
          <AppShell>
            {children}
          </AppShell>
        </Providers>
      </body>
    </html>
  );
}