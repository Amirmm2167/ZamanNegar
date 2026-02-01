"use client";

import { useLayoutStore } from "@/stores/layoutStore";
import {
   CalendarDays, LayoutDashboard, MessageSquare,
   ChevronRight, ChevronLeft, LogOut, User, Menu
} from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import clsx from "clsx";
import { motion } from "framer-motion";

interface SidebarProps {
   role: string;
}

export default function Sidebar({ role }: SidebarProps) {
   const { isSidebarOpen, toggleSidebar } = useLayoutStore();
   const pathname = usePathname();
   const router = useRouter();
   const isManager = ["manager", "superadmin"].includes(role);

   const handleLogout = () => {
      if (confirm("آیا خارج می‌شوید؟")) {
         localStorage.removeItem("token");
         localStorage.removeItem("role");
         router.push("/login");
      }
   };

   const navItems = [
      { label: "تقویم", icon: CalendarDays, href: "/", active: pathname === "/" },
      ...(isManager ? [{ label: "پنل مدیریت", icon: LayoutDashboard, href: "/company-panel", active: pathname.startsWith("/company-panel") }] : []),
      { label: "کارتابل", icon: MessageSquare, href: "/evaluator-panel", active: pathname.startsWith("/evaluator-panel") },
   ];

   return (
      <motion.aside
         initial={false}
         animate={{ width: isSidebarOpen ? 240 : 80 }}
         transition={{ type: "spring", bounce: 0, duration: 0.4 }}
         // CRITICAL FIX: 'hidden md:flex' ensures it NEVER renders on mobile screen
         className="hidden md:flex fixed top-0 right-0 h-full bg-[#09090b]/95 backdrop-blur-xl border-l border-white/10 flex-col shadow-2xl overflow-hidden z-40"
      >
         {/* Header */}
         <div className="h-20 flex items-center justify-between px-4 border-b border-white/5 shrink-0">
            <div className="flex items-center gap-3 overflow-hidden">
               <div className="w-10 h-10 rounded-xl bg-blue-600 flex items-center justify-center shrink-0 shadow-[0_0_15px_rgba(37,99,235,0.4)]">
                  <CalendarDays className="text-white" size={20} />
               </div>
               {isSidebarOpen && (
                  <motion.span
                     initial={{ opacity: 0 }}
                     animate={{ opacity: 1 }}
                     className="font-bold text-lg tracking-tight text-white whitespace-nowrap"
                  >
                     زمان‌نگار
                  </motion.span>
               )}
            </div>
         </div>

         {/* Navigation */}
         <nav className="flex-1 py-6 px-3 space-y-2 overflow-y-auto custom-scrollbar">
            {navItems.map((item) => (
               <Link key={item.href} href={item.href}>
                  <div className={clsx(
                     "flex items-center gap-3 px-3 py-3 rounded-xl transition-all duration-200 group relative overflow-hidden",
                     item.active
                        ? "bg-blue-600/10 text-blue-400 border border-blue-600/20"
                        : "text-gray-400 hover:text-white hover:bg-white/5 border border-transparent"
                  )}>
                     <item.icon size={22} className={clsx("shrink-0", item.active && "text-blue-400")} />

                     {isSidebarOpen && (
                        <motion.span
                           initial={{ opacity: 0, x: 10 }}
                           animate={{ opacity: 1, x: 0 }}
                           className="text-sm font-medium whitespace-nowrap"
                        >
                           {item.label}
                        </motion.span>
                     )}
                  </div>
               </Link>
            ))}
         </nav>

       <div className="p-4 border-t border-white/5 bg-black/20 shrink-0 flex justify-start">
  <button
    onClick={toggleSidebar}
    className="w-10 h-10 flex items-center justify-center rounded-md border-white/5 border-1 hover:bg-white/10 text-gray-400 hover:text-white transition-colors"
  >
    <svg
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      {/* Top Line to Bottom-Half of Chevron */}
      <motion.path
        animate={{ d: isSidebarOpen ? "M 9 18 L 15 12" : "M 4 6 L 20 6" }}
        transition={{ duration: 0.3 }}
      />
      {/* Middle Line - Shrinks and disappears */}
      <motion.path
        animate={{ 
          d: isSidebarOpen ? "M 15 12 L 15 12" : "M 4 12 L 20 12",
          opacity: isSidebarOpen ? 0 : 1 
        }}
        transition={{ duration: 0.3 }}
      />
      {/* Bottom Line to Top-Half of Chevron */}
      <motion.path
        animate={{ d: isSidebarOpen ? "M 9 6 L 15 12" : "M 4 18 L 20 18" }}
        transition={{ duration: 0.3 }}
      />
    </svg>
  </button>
</div>
      </motion.aside>
   );
}