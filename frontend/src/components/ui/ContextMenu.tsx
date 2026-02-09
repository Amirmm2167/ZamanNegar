"use client";

import { useEffect, useRef } from "react";
import { useContextMenuStore } from "@/stores/contextMenuStore";
import { useAuthStore } from "@/stores/authStore";
import { 
  Copy, 
  Trash2, 
  Edit, 
  Lock, 
  CalendarPlus, 
  CheckCircle2, 
  Share2,
  X
} from "lucide-react";
import clsx from "clsx";

export default function ContextMenu() {
  const { isOpen, position, type, data, closeMenu } = useContextMenuStore();
  const { currentRole } = useAuthStore();
  const menuRef = useRef<HTMLDivElement>(null);

  // Close on outside click
  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        closeMenu();
      }
    };
    if (isOpen) window.addEventListener("click", handleClick);
    return () => window.removeEventListener("click", handleClick);
  }, [isOpen, closeMenu]);

  if (!isOpen) return null;

  const isManager = currentRole() === 'manager';

  // --- ACTIONS ---
  const handleAction = (action: string) => {
    switch(action) {
        case 'edit':
             // Trigger the global Edit Modal
             // We can use a custom event or a store method
             // For now, let's assume we dispatch a custom event that AppShell listens to
             window.dispatchEvent(new CustomEvent('open-event-modal', { detail: { eventId: data.id } }));
             break;
        case 'delete':
             if (confirm("آیا از حذف این رویداد اطمینان دارید؟")) {
                 // Call API delete
                 console.log("Deleted", data.id);
             }
             break;
        case 'new-meeting':
             // Trigger new event modal
             window.dispatchEvent(new CustomEvent('open-new-event', { detail: { date: data.date, hour: data.hour } }));
             break;
    }
    closeMenu();
  };

  return (
    <div
      ref={menuRef}
      className="fixed z-[9999] min-w-[180px] bg-[#18181b]/95 backdrop-blur-xl border border-white/10 rounded-xl shadow-2xl p-1.5 animate-in fade-in zoom-in-95 duration-100 flex flex-col gap-1"
      style={{
        top: Math.min(position.y, window.innerHeight - 200), // Prevent bottom overflow
        left: Math.min(position.x, window.innerWidth - 180), // Prevent right overflow
      }}
      onContextMenu={(e) => e.preventDefault()}
    >
      
      {/* HEADER: Context Info */}
      <div className="px-2 py-1.5 text-[10px] text-gray-500 font-bold uppercase tracking-wider border-b border-white/5 mb-1">
        {type === 'event' ? 'مدیریت رویداد' : 'زمان انتخابی'}
      </div>

      {/* MENU ITEMS: EVENT */}
      {type === 'event' && (
        <>
          <button onClick={() => handleAction('edit')} className="flex items-center gap-2 px-2 py-1.5 text-sm text-gray-200 hover:bg-blue-600 hover:text-white rounded-lg transition-colors w-full text-right">
            <Edit size={14} />
            <span>ویرایش</span>
          </button>
          
          <button onClick={() => handleAction('copy-link')} className="flex items-center gap-2 px-2 py-1.5 text-sm text-gray-200 hover:bg-white/10 rounded-lg transition-colors w-full text-right">
            <Share2 size={14} />
            <span>کپی لینک</span>
          </button>

          {isManager && (
             <button onClick={() => handleAction('lock')} className="flex items-center gap-2 px-2 py-1.5 text-sm text-amber-400 hover:bg-amber-500/20 rounded-lg transition-colors w-full text-right">
               <Lock size={14} />
               <span>قفل کردن</span>
             </button>
          )}

          <div className="h-px bg-white/10 my-1" />

          <button onClick={() => handleAction('delete')} className="flex items-center gap-2 px-2 py-1.5 text-sm text-red-400 hover:bg-red-500/20 rounded-lg transition-colors w-full text-right">
            <Trash2 size={14} />
            <span>حذف</span>
          </button>
        </>
      )}

      {/* MENU ITEMS: EMPTY SLOT */}
      {type === 'empty-slot' && (
        <>
          <button onClick={() => handleAction('new-meeting')} className="flex items-center gap-2 px-2 py-1.5 text-sm text-gray-200 hover:bg-emerald-600 hover:text-white rounded-lg transition-colors w-full text-right">
            <CalendarPlus size={14} />
            <span>جلسه جدید</span>
          </button>
          
          <button onClick={() => handleAction('new-task')} className="flex items-center gap-2 px-2 py-1.5 text-sm text-gray-200 hover:bg-white/10 rounded-lg transition-colors w-full text-right">
            <CheckCircle2 size={14} />
            <span>یادآور / تسک</span>
          </button>
        </>
      )}

    </div>
  );
}