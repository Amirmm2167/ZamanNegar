"use client";

import { useState } from "react";
import { CalendarEvent, Department } from "@/types";
import { 
  Edit, Trash2, Move, Info, Clock, User, Target, Flag, AlignLeft, ArrowRight 
} from "lucide-react";
import { toPersianDigits } from "@/lib/utils";

interface MobileContextMenuProps {
  event: CalendarEvent;
  userRole: string;
  currentUserId: number;
  departments: Department[];
  onClose: () => void;
  onEdit: () => void;
  onDelete: () => void;
  onMove: () => void; 
}

type MenuState = "menu" | "properties";

export default function MobileContextMenu({
  event,
  userRole,
  currentUserId,
  departments,
  onClose,
  onEdit,
  onDelete,
  onMove
}: MobileContextMenuProps) {
  const [viewState, setViewState] = useState<MenuState>("menu");

  const isOwner = event.proposer_id === currentUserId;
  const isManager = ["manager", "superadmin", "evaluator"].includes(userRole);
  const canModify = isOwner || isManager;

  const dept = departments.find(d => d.id === event.department_id);
  const borderColor = dept ? dept.color : "#6b7280";

  // --- VIEW 1: ACTIONS MENU ---
  if (viewState === "menu") {
    return (
      <div className="space-y-2">
        {/* Event Preview Header */}
        <div 
            className="flex items-center gap-3 p-3 bg-white/5 rounded-xl border-r-4 mb-4"
            style={{ borderRightColor: borderColor }}
        >
            <div className="flex-1 min-w-0">
                <h4 className="font-bold text-gray-100 truncate">{event.title}</h4>
                <div className="text-xs text-gray-400 flex items-center gap-2 mt-1">
                    <Clock size={12} />
                    <span>
                        {new Date(event.start_time).toLocaleTimeString("fa-IR", {hour: '2-digit', minute:'2-digit'})} - 
                        {new Date(event.end_time).toLocaleTimeString("fa-IR", {hour: '2-digit', minute:'2-digit'})}
                    </span>
                </div>
            </div>
        </div>

        <div className="grid grid-cols-1 gap-2">
          {canModify && (
            <>
              <button onClick={onEdit} className="flex items-center gap-3 w-full p-3 rounded-xl bg-blue-600/10 hover:bg-blue-600/20 text-blue-400 transition-colors">
                <Edit size={18} /> <span className="font-medium">ویرایش رویداد</span>
              </button>
              
              <button onClick={onMove} className="flex items-center gap-3 w-full p-3 rounded-xl bg-emerald-600/10 hover:bg-emerald-600/20 text-emerald-400 transition-colors">
                <Move size={18} /> <span className="font-medium">جابجایی (Drag & Drop)</span>
              </button>

              <button onClick={onDelete} className="flex items-center gap-3 w-full p-3 rounded-xl bg-red-600/10 hover:bg-red-600/20 text-red-400 transition-colors">
                <Trash2 size={18} /> <span className="font-medium">حذف رویداد</span>
              </button>
            </>
          )}

          <button onClick={() => setViewState("properties")} className="flex items-center gap-3 w-full p-3 rounded-xl bg-white/5 hover:bg-white/10 text-gray-200 transition-colors">
            <Info size={18} /> <span className="font-medium">مشاهده جزئیات</span>
          </button>
        </div>
      </div>
    );
  }

  // --- VIEW 2: PROPERTIES (Tooltip Content) ---
  return (
    <div className="space-y-4 animate-in slide-in-from-right-10 duration-200">
      <button 
        onClick={() => setViewState("menu")} 
        className="flex items-center gap-2 text-sm text-gray-400 hover:text-white mb-2"
      >
        <ArrowRight size={16} /> بازگشت
      </button>

      <div className="space-y-4 text-sm text-gray-300">
        <div className="flex gap-2">
            <AlignLeft size={16} className="text-gray-500 mt-1 shrink-0" />
            <p className="leading-relaxed whitespace-pre-wrap">{event.description || "توضیحات ندارد."}</p>
        </div>

        {event.target_audience && (
            <div className="flex items-center gap-2">
                <Target size={16} className="text-blue-400" />
                <span><strong className="text-gray-500">مخاطبین:</strong> {event.target_audience}</span>
            </div>
        )}
        
        {event.organizer && (
            <div className="flex items-center gap-2">
                <User size={16} className="text-purple-400" />
                <span><strong className="text-gray-500">برگزار کننده:</strong> {event.organizer}</span>
            </div>
        )}

        {event.goal && (
            <div className="flex items-center gap-2">
                <Flag size={16} className="text-emerald-400" />
                <span><strong className="text-gray-500">هدف:</strong> {event.goal}</span>
            </div>
        )}
      </div>
    </div>
  );
}