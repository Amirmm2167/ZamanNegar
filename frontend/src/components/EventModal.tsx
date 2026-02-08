"use client";

import { Fragment, useState, useEffect } from "react";
import { Dialog, Transition } from "@headlessui/react";
import { X, Clock, AlignLeft, Calendar as CalendarIcon, Target, Users } from "lucide-react";
import api from "@/lib/api";
import { useAuthStore } from "@/stores/authStore";
import { EventCreatePayload } from "@/types";

interface EventModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  currentUserId: number;
}

export default function EventModal({ isOpen, onClose, onSuccess }: EventModalProps) {
  const { activeCompanyId } = useAuthStore();
  const [loading, setLoading] = useState(false);

  // Form State
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [goal, setGoal] = useState("");
  const [audience, setAudience] = useState("");
  
  // Date/Time
  const [startDate, setStartDate] = useState("");
  const [startTime, setStartTime] = useState("09:00");
  const [endDate, setEndDate] = useState("");
  const [endTime, setEndTime] = useState("10:00");
  
  // Recurrence
  const [recurrenceType, setRecurrenceType] = useState("none"); // none, daily, weekly, monthly

  // Reset form when opened
  useEffect(() => {
    if (isOpen) {
      const today = new Date().toISOString().split('T')[0];
      setStartDate(today);
      setEndDate(today);
      setStartTime("09:00");
      setEndTime("10:00");
      setTitle("");
      setDescription("");
      setGoal("");
      setAudience("");
      setRecurrenceType("none");
    }
  }, [isOpen]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeCompanyId) {
      alert("خطا: سازمانی انتخاب نشده است.");
      return;
    }
    
    setLoading(true);

    try {
      // 1. Construct ISO DateTimes
      const startDateTime = new Date(`${startDate}T${startTime}:00`).toISOString();
      const endDateTime = new Date(`${endDate}T${endTime}:00`).toISOString();

      // 2. Construct RRULE (Simple Version)
      let rrule = null;
      if (recurrenceType !== "none") {
        const map: Record<string, string> = {
          daily: "FREQ=DAILY",
          weekly: "FREQ=WEEKLY",
          monthly: "FREQ=MONTHLY"
        };
        rrule = map[recurrenceType];
      }

      // 3. Create Payload
      const payload: EventCreatePayload = {
        title,
        description,
        goal,
        target_audience: audience,
        start_time: startDateTime,
        end_time: endDateTime,
        is_all_day: false,
        recurrence_rule: rrule,
        company_id: activeCompanyId,
        // department_id will be handled by backend based on user profile if not sent
      };

      // 4. Send API Request
      await api.post("/events/", payload);
      
      onSuccess();
      onClose();
    } catch (error) {
      console.error("Failed to create event:", error);
      alert("خطا در ثبت رویداد");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Transition appear show={isOpen} as={Fragment}>
      <Dialog as="div" className="relative z-50" onClose={onClose} dir="rtl">
        <Transition.Child
          as={Fragment}
          enter="ease-out duration-300"
          enterFrom="opacity-0"
          enterTo="opacity-100"
          leave="ease-in duration-200"
          leaveFrom="opacity-100"
          leaveTo="opacity-0"
        >
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm" />
        </Transition.Child>

        <div className="fixed inset-0 overflow-y-auto">
          <div className="flex min-h-full items-center justify-center p-4">
            <Transition.Child
              as={Fragment}
              enter="ease-out duration-300"
              enterFrom="opacity-0 scale-95"
              enterTo="opacity-100 scale-100"
              leave="ease-in duration-200"
              leaveFrom="opacity-100 scale-100"
              leaveTo="opacity-0 scale-95"
            >
              <Dialog.Panel className="w-full max-w-lg transform overflow-hidden rounded-2xl bg-[#1a1d24] border border-white/10 p-6 shadow-2xl transition-all">
                
                {/* Header */}
                <div className="flex items-center justify-between mb-6">
                  <Dialog.Title as="h3" className="text-xl font-bold text-white">
                    رویداد جدید
                  </Dialog.Title>
                  <button onClick={onClose} className="text-gray-400 hover:text-white transition-colors">
                    <X size={24} />
                  </button>
                </div>

                <form onSubmit={handleSubmit} className="space-y-4">
                  
                  {/* Title */}
                  <div>
                    <input
                      type="text"
                      required
                      value={title}
                      onChange={(e) => setTitle(e.target.value)}
                      placeholder="عنوان رویداد"
                      className="w-full bg-[#0a0c10] border border-white/10 rounded-xl px-4 py-3 text-white placeholder-gray-500 focus:border-blue-500 outline-none transition-colors"
                    />
                  </div>

                  {/* Time Row */}
                  <div className="grid grid-cols-2 gap-4">
                     <div className="space-y-1">
                        <label className="text-xs text-gray-400">شروع</label>
                        <div className="flex gap-2">
                           <input 
                             type="date" 
                             value={startDate} 
                             onChange={(e) => setStartDate(e.target.value)}
                             className="w-full bg-[#0a0c10] border border-white/10 rounded-lg px-2 py-2 text-sm text-white focus:border-blue-500 outline-none"
                           />
                           <input 
                             type="time" 
                             value={startTime} 
                             onChange={(e) => setStartTime(e.target.value)}
                             className="w-20 bg-[#0a0c10] border border-white/10 rounded-lg px-1 py-2 text-sm text-white focus:border-blue-500 outline-none text-center"
                           />
                        </div>
                     </div>
                     <div className="space-y-1">
                        <label className="text-xs text-gray-400">پایان</label>
                        <div className="flex gap-2">
                           <input 
                             type="date" 
                             value={endDate} 
                             onChange={(e) => setEndDate(e.target.value)}
                             className="w-full bg-[#0a0c10] border border-white/10 rounded-lg px-2 py-2 text-sm text-white focus:border-blue-500 outline-none"
                           />
                           <input 
                             type="time" 
                             value={endTime} 
                             onChange={(e) => setEndTime(e.target.value)}
                             className="w-20 bg-[#0a0c10] border border-white/10 rounded-lg px-1 py-2 text-sm text-white focus:border-blue-500 outline-none text-center"
                           />
                        </div>
                     </div>
                  </div>

                  {/* Recurrence Selector */}
                  <div className="bg-[#0a0c10] p-3 rounded-xl border border-white/5 flex items-center justify-between">
                     <div className="flex items-center gap-2 text-gray-300">
                        <Clock size={18} />
                        <span className="text-sm">تکرار</span>
                     </div>
                     <select 
                       value={recurrenceType} 
                       onChange={(e) => setRecurrenceType(e.target.value)}
                       className="bg-transparent text-blue-400 text-sm font-medium outline-none cursor-pointer"
                     >
                        <option value="none">بدون تکرار</option>
                        <option value="daily">روزانه</option>
                        <option value="weekly">هفتگی</option>
                        <option value="monthly">ماهانه</option>
                     </select>
                  </div>

                  {/* Metadata (Goal & Audience) */}
                  <div className="grid grid-cols-2 gap-4">
                    <div className="relative">
                       <Target className="absolute right-3 top-3 text-gray-500" size={16} />
                       <input
                         type="text"
                         value={goal}
                         onChange={(e) => setGoal(e.target.value)}
                         placeholder="هدف رویداد"
                         className="w-full bg-[#0a0c10] border border-white/10 rounded-xl pr-10 pl-3 py-2.5 text-sm text-white placeholder-gray-500 focus:border-blue-500 outline-none"
                       />
                    </div>
                    <div className="relative">
                       <Users className="absolute right-3 top-3 text-gray-500" size={16} />
                       <input
                         type="text"
                         value={audience}
                         onChange={(e) => setAudience(e.target.value)}
                         placeholder="مخاطبین"
                         className="w-full bg-[#0a0c10] border border-white/10 rounded-xl pr-10 pl-3 py-2.5 text-sm text-white placeholder-gray-500 focus:border-blue-500 outline-none"
                       />
                    </div>
                  </div>

                  {/* Description */}
                  <div className="relative">
                    <AlignLeft className="absolute right-3 top-3 text-gray-500" size={18} />
                    <textarea
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                      placeholder="توضیحات تکمیلی..."
                      rows={3}
                      className="w-full bg-[#0a0c10] border border-white/10 rounded-xl pr-10 pl-3 py-2.5 text-sm text-white placeholder-gray-500 focus:border-blue-500 outline-none resize-none"
                    />
                  </div>

                  {/* Submit Button */}
                  <div className="pt-2">
                    <button
                      type="submit"
                      disabled={loading}
                      className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 rounded-xl transition-all shadow-lg shadow-blue-600/20 disabled:opacity-50 disabled:shadow-none"
                    >
                      {loading ? "در حال ثبت..." : "ثبت در تقویم"}
                    </button>
                  </div>

                </form>
              </Dialog.Panel>
            </Transition.Child>
          </div>
        </div>
      </Dialog>
    </Transition>
  );
}