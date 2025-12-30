"use client";

import { useState, useEffect } from "react";
import { X, ArrowRight, Calendar, Clock, CheckCircle2 } from "lucide-react";
import { CalendarEvent } from "@/types";
import DatePicker from "@/components/DatePicker";
import TimePicker from "@/components/TimePicker";
import GlassPane from "@/components/ui/GlassPane";
import { toPersianDigits } from "@/lib/utils";

interface MoveConfirmationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (newStart: Date, newEnd: Date) => void;
  originalEvent: CalendarEvent | null;
  newStartTime: Date | null;
}

export default function MoveConfirmationModal({
  isOpen,
  onClose,
  onConfirm,
  originalEvent,
  newStartTime
}: MoveConfirmationModalProps) {
  const [date, setDate] = useState("");
  const [startTime, setStartTime] = useState("");
  const [endTime, setEndTime] = useState("");
  
  // Pickers
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showStartPicker, setShowStartPicker] = useState(false);
  const [showEndPicker, setShowEndPicker] = useState(false);

  useEffect(() => {
    if (isOpen && originalEvent && newStartTime) {
      // Calculate duration to preserve it
      const origStart = new Date(originalEvent.start_time);
      const origEnd = new Date(originalEvent.end_time);
      const durationMs = origEnd.getTime() - origStart.getTime();

      const newEnd = new Date(newStartTime.getTime() + durationMs);

      setDate(newStartTime.toISOString().split('T')[0]);
      setStartTime(newStartTime.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' }));
      setEndTime(newEnd.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' }));
    }
  }, [isOpen, originalEvent, newStartTime]);

  const handleSave = () => {
    const start = new Date(`${date}T${startTime}:00`);
    const end = new Date(`${date}T${endTime}:00`);
    onConfirm(start, end);
  };

  if (!isOpen || !originalEvent) return null;

  return (
    <>
      <div className="fixed inset-0 z-[6000] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
        <GlassPane intensity="high" className="w-full max-w-sm rounded-2xl border border-white/10 shadow-2xl p-6 space-y-6">
          
          <div className="text-center space-y-2">
            <h3 className="text-lg font-bold text-white">تایید جابجایی</h3>
            <p className="text-sm text-gray-400">آیا زمان جدید برای رویداد <span className="text-blue-400">"{originalEvent.title}"</span> صحیح است؟</p>
          </div>

          <div className="space-y-4">
            {/* Date Input */}
            <div className="space-y-1">
              <label className="text-xs text-gray-500 font-bold">تاریخ جدید</label>
              <button 
                onClick={() => setShowDatePicker(true)}
                className="w-full flex items-center justify-between px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white hover:border-blue-500 transition-colors"
              >
                <span>{new Date(date).toLocaleDateString("fa-IR")}</span>
                <Calendar size={16} className="text-gray-400" />
              </button>
            </div>

            {/* Time Inputs */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-xs text-gray-500 font-bold">شروع</label>
                <button 
                  onClick={() => setShowStartPicker(true)}
                  className="w-full flex items-center justify-center px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white hover:border-blue-500 transition-colors"
                >
                  {toPersianDigits(startTime)}
                </button>
              </div>
              <div className="space-y-1">
                <label className="text-xs text-gray-500 font-bold">پایان</label>
                <button 
                  onClick={() => setShowEndPicker(true)}
                  className="w-full flex items-center justify-center px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white hover:border-blue-500 transition-colors"
                >
                  {toPersianDigits(endTime)}
                </button>
              </div>
            </div>
          </div>

          <div className="flex gap-3 pt-2">
            <button onClick={onClose} className="flex-1 py-3 rounded-xl bg-white/5 hover:bg-white/10 text-gray-300 font-bold transition-colors">
              انصراف
            </button>
            <button onClick={handleSave} className="flex-1 py-3 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold shadow-lg shadow-blue-900/20 transition-colors flex items-center justify-center gap-2">
              <CheckCircle2 size={18} />
              تایید
            </button>
          </div>

        </GlassPane>
      </div>

      {/* Pickers */}
      {showDatePicker && <DatePicker value={date} onChange={setDate} onClose={() => setShowDatePicker(false)} />}
      {showStartPicker && <TimePicker value={startTime} onChange={setStartTime} onClose={() => setShowStartPicker(false)} />}
      {showEndPicker && <TimePicker value={endTime} onChange={setEndTime} onClose={() => setShowEndPicker(false)} />}
    </>
  );
}