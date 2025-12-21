"use client";

import { useState, useRef, useEffect } from "react";
import { Plus, Users, Building, CalendarOff, Settings, MessageSquare, X } from "lucide-react";
import { useOnClickOutside } from "@/hooks/useOnClickOutside";
import clsx from "clsx";

interface FabMenuProps {
  onOpenDepartments?: () => void;
  onOpenUsers?: () => void;
  onOpenHolidays?: () => void;
  onOpenIssues?: () => void;
  onOpenEventModal?: () => void; // Added for Proposer direct action
}

export default function FabMenu({ 
  onOpenDepartments, 
  onOpenUsers, 
  onOpenHolidays, 
  onOpenIssues,
  onOpenEventModal
}: FabMenuProps) {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const [role, setRole] = useState<string>("");

  useOnClickOutside(containerRef, () => setIsOpen(false));

  useEffect(() => {
    const storedRole = localStorage.getItem("role") || "viewer";
    setRole(storedRole);
  }, []);

  const toggleMenu = () => setIsOpen(!isOpen);

  // --- Render Logic Based on Role ---

  // 1. Viewer: Only Report Issue
  if (role === "viewer") {
    return (
      <div className="fixed bottom-6 left-6 z-[100] flex flex-col items-end gap-3" dir="rtl">
        <button
          onClick={onOpenIssues}
          className="p-4 rounded-full shadow-[0_0_20px_rgba(234,179,8,0.5)] text-white bg-yellow-500 hover:bg-yellow-400 transition-transform hover:scale-110 border border-white/10"
          title="گزارش مشکل"
        >
          <MessageSquare size={28} />
        </button>
      </div>
    );
  }

  // 2. Proposer: Report Issue (Standalone) + Create Event (Main)
  if (role === "proposer") {
    return (
      <div className="fixed bottom-6 left-6 z-[100] flex items-end gap-4" dir="ltr"> 
        {/* Main Action: Add Event */}
        <button
          onClick={onOpenEventModal}
          className="p-4 rounded-full shadow-[0_0_20px_rgba(37,99,235,0.5)] text-white bg-blue-600 hover:bg-blue-500 transition-transform hover:scale-110 border border-white/10"
          title="رویداد جدید"
        >
          <Plus size={28} />
        </button>

        {/* Secondary: Report Issue */}
        <button
          onClick={onOpenIssues}
          className="p-3 rounded-full shadow-[0_0_15px_rgba(234,179,8,0.4)] text-white bg-yellow-500 hover:bg-yellow-400 transition-transform hover:scale-110 border border-white/10"
          title="گزارش مشکل"
        >
          <MessageSquare size={24} />
        </button>
      </div>
    );
  }

  // 3. Manager/Superadmin: Report Issue (Standalone) + Menu (Main)
  // Actions for the Menu
  const managerActions = [
    { icon: Users, fn: onOpenUsers, color: "bg-blue-500", title: "کاربران" },
    { icon: Building, fn: onOpenDepartments, color: "bg-emerald-500", title: "دپارتمان‌ها" },
    { icon: CalendarOff, fn: onOpenHolidays, color: "bg-red-500", title: "تعطیلات" },
  ];

  return (
    <div ref={containerRef} className="fixed bottom-6 left-6 z-[100] flex items-end gap-4" dir="ltr">
        
        {/* 1. Expandable Menu Button */}
        <div className="relative flex flex-col items-center gap-3">
             {/* Expanded Items */}
            <div className={clsx(
                "flex flex-col gap-3 transition-all duration-300 ease-out absolute bottom-full mb-4",
                isOpen ? "opacity-100 scale-100 translate-y-0 pointer-events-auto" : "opacity-0 scale-95 translate-y-4 pointer-events-none"
            )}>
                {managerActions.map((action, idx) => (
                <button
                    key={idx}
                    onClick={() => {
                        action.fn?.();
                        setIsOpen(false);
                    }}
                    className={clsx(
                        "p-3 rounded-full shadow-lg text-white transition-transform hover:scale-110 border border-white/10",
                        action.color
                    )}
                    title={action.title}
                >
                    <action.icon size={20} />
                </button>
                ))}
            </div>

            {/* Main Toggle */}
            <button
                onClick={toggleMenu}
                className={clsx(
                    "p-4 rounded-full shadow-[0_0_20px_rgba(37,99,235,0.5)] text-white transition-all duration-300 rotate-0 hover:scale-110 border border-white/10",
                    isOpen ? "bg-gray-600 rotate-45" : "bg-blue-600"
                )}
                title="مدیریت"
            >
                {isOpen ? <Plus size={28} className="rotate-45" /> : <Settings size={28} />}
            </button>
        </div>

        {/* 2. Report Issue (Always visible next to it) */}
        <button
          onClick={onOpenIssues}
          className="p-3 rounded-full shadow-[0_0_15px_rgba(234,179,8,0.4)] text-white bg-yellow-500 hover:bg-yellow-400 transition-transform hover:scale-110 border border-white/10"
          title="گزارش مشکل"
        >
          <MessageSquare size={24} />
        </button>

    </div>
  );
}