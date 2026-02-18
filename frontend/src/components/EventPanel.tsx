"use client";

import { useState, useEffect, Fragment } from "react";
import { Dialog, Transition } from "@headlessui/react";
import { 
  X, Clock, CalendarDays, Repeat, User, Target, Tag, 
  ChevronDown, Building2, Lock, Unlock, Trash2, 
  CheckCircle2, Loader2, ArrowRight, Layers, AlertTriangle, 
  MoreHorizontal, ChevronUp,
  ArrowLeft
} from "lucide-react";
import api from "@/lib/api";
import clsx from "clsx";
import { toPersianDigits } from "@/lib/utils";
import DatePicker from "@/components/DatePicker";
import TimePicker from "@/components/TimePicker";
import MultiTagInput from "@/components/MultiTagInput";
import { Department, CalendarEvent } from "@/types";
import { useAuthStore } from "@/stores/authStore";
import { motion, AnimatePresence } from "framer-motion";
import { addDays, addWeeks, addMonths } from "date-fns-jalali";

interface EventPanelProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  initialDate?: Date;
  initialStartTime?: string;
  initialEndTime?: string;
  eventToEdit?: CalendarEvent | null;
  eventId?: number;
}

type RecurrenceScope = "all" | "single" | "future";

const getLocalDateStr = (date: Date) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

export default function EventPanel({
  isOpen, onClose, onSuccess, initialDate, initialStartTime, initialEndTime,
  eventToEdit, eventId
}: EventPanelProps) {

  const { currentRole, activeCompanyId } = useAuthStore();
  const userRole = currentRole() || "viewer";
  const isManager = userRole === 'manager'; // Helper for check

  // --- UI STATE ---
  const [isExpanded, setIsExpanded] = useState(false); 
  const [loading, setLoading] = useState(false);
  const [fetchingDetails, setFetchingDetails] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState("");
  const [departments, setDepartments] = useState<Department[]>([]);

  // --- RECURRENCE STATE ---
  const [showRecurrenceOptions, setShowRecurrenceOptions] = useState(false);
  const [originalRecurrenceRule, setOriginalRecurrenceRule] = useState<string | null>(null);

  // --- DATA STATE ---
  const [canEdit, setCanEdit] = useState(true);
  const [isLocked, setIsLocked] = useState(false);
  const [title, setTitle] = useState("");
  const [departmentId, setDepartmentId] = useState<number | null>(null);
  
  // Timing
  const [startDate, setStartDate] = useState("");
  const [startTime, setStartTime] = useState("09:00");
  const [endTime, setEndTime] = useState("10:00");
  const [isAllDay, setIsAllDay] = useState(false);

  // Recurrence
  const [recurrenceType, setRecurrenceType] = useState("none");
  const [recurrenceEndMode, setRecurrenceEndMode] = useState<"count" | "date">("count");
  const [recurrenceCount, setRecurrenceCount] = useState("");
  const [recurrenceUntil, setRecurrenceUntil] = useState("");

  // Details
  const [targetAudience, setTargetAudience] = useState<string[]>([]);
  const [organizer, setOrganizer] = useState<string[]>([]);
  const [goal, setGoal] = useState<string[]>([]);
  const [description, setDescription] = useState("");

  // Pickers
  const [pickerMode, setPickerMode] = useState<"date" | "until" | null>(null);
  const [showStartTimePicker, setShowStartTimePicker] = useState(false);
  const [showEndTimePicker, setShowEndTimePicker] = useState(false);

  // --- INITIALIZATION ---
  useEffect(() => {
    if (isOpen) {
      setError("");
      setShowRecurrenceOptions(false);
      
      if (["manager", "superadmin", "evaluator"].includes(userRole)) {
        fetchDepartments();
      }

      const targetId = eventToEdit?.id || eventId;

      if (targetId) {
        // EDIT MODE
        const loadEvent = async () => {
          setFetchingDetails(true);
          try {
            const { data } = await api.get(`/events/${targetId}`);
            
            setTitle(data.title);
            setDescription(data.description || "");
            setDepartmentId(data.department_id);
            // FIX: Ensure boolean type for strict state setters
            setIsLocked(!!data.is_locked);
            setOriginalRecurrenceRule(data.recurrence_rule);
            
            setGoal(data.goal ? data.goal.split(',').filter(Boolean) : []);
            setTargetAudience(data.target_audience ? data.target_audience.split(',').filter(Boolean) : []);
            setOrganizer(data.organizer ? data.organizer.split(',').filter(Boolean) : []);

            // Timing Logic (Respect Virtual Instance)
            let startObj = new Date(data.start_time);
            let endObj = new Date(data.end_time);

            if (eventToEdit && eventToEdit.is_virtual && eventToEdit.start_time) {
                startObj = new Date(eventToEdit.start_time);
                endObj = new Date(eventToEdit.end_time);
            }

            setStartDate(getLocalDateStr(startObj));
            setStartTime(startObj.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit", hour12: false }));
            setEndTime(endObj.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit", hour12: false }));
            setIsAllDay(data.is_all_day);

            // Recurrence Parsing
            if (data.recurrence_rule) {
              const rule = data.recurrence_rule;
              const freqMatch = rule.match(/FREQ=(DAILY|WEEKLY|MONTHLY)/i);
              if (freqMatch) setRecurrenceType(freqMatch[1].toLowerCase());

              const untilMatch = rule.match(/UNTIL=(\d{8})/);
              if (untilMatch) {
                const raw = untilMatch[1];
                setRecurrenceUntil(`${raw.slice(0, 4)}-${raw.slice(4, 6)}-${raw.slice(6, 8)}`);
              }

              if (data.recurrence_ui_mode === 'count' && data.recurrence_ui_count) {
                  setRecurrenceEndMode("count");
                  setRecurrenceCount(data.recurrence_ui_count.toString());
              } else if (untilMatch) {
                  setRecurrenceEndMode("date");
              } else {
                  setRecurrenceEndMode("count"); 
              }
            } else {
              setRecurrenceType("none");
              setRecurrenceCount("");
              setRecurrenceUntil("");
            }

            if (data.description || data.goal || data.organizer) {
               setIsExpanded(true);
            } else {
               setIsExpanded(false);
            }

            setCanEdit(!data.is_locked || isManager);

          } catch (err) {
            setError("خطا در بارگیری اطلاعات");
          } finally {
            setFetchingDetails(false);
          }
        };
        loadEvent();
      } else {
        // CREATE MODE
        const targetDate = initialDate || new Date();
        setStartDate(getLocalDateStr(targetDate));
        setTitle("");
        setDepartmentId(null);
        setStartTime(initialStartTime || "09:00");
        setEndTime(initialEndTime || "10:00");
        setIsAllDay(false);
        setRecurrenceType("none");
        setRecurrenceEndMode("count");
        setRecurrenceCount("");
        setRecurrenceUntil("");
        setTargetAudience([]);
        setOrganizer([]);
        setGoal([]);
        setDescription("");
        setIsExpanded(false);
        setCanEdit(userRole !== "viewer");
        setIsLocked(false);
        setOriginalRecurrenceRule(null);
      }
    }
  }, [isOpen, eventToEdit, eventId, initialDate, initialStartTime, initialEndTime, userRole, isManager]);

  const fetchDepartments = async () => {
    try {
      const res = await api.get<Department[]>("/departments/");
      setDepartments(res.data);
    } catch (e) { console.error(e); }
  };

  const calculateUntilDate = (start: Date, type: string, count: number) => {
      let result = start;
      if (type === 'daily') result = addDays(start, count - 1);
      if (type === 'weekly') result = addWeeks(start, count - 1);
      if (type === 'monthly') result = addMonths(start, count - 1);
      
      const year = result.getFullYear();
      const month = String(result.getMonth() + 1).padStart(2, '0');
      const day = String(result.getDate()).padStart(2, '0');
      return `${year}${month}${day}T235959`;
  };

  const handlePreSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!canEdit) return;
    if (!activeCompanyId) { setError("خطا: سازمان فعال یافت نشد."); return; }

    const isUpdate = !!(eventToEdit?.id || eventId);
    if (isUpdate && originalRecurrenceRule) {
      setShowRecurrenceOptions(true);
    } else {
      executeSubmit('all');
    }
  };

  const executeSubmit = async (scope: RecurrenceScope) => {
    setLoading(true);
    setError("");

    try {
      const sTime = isAllDay ? "00:00" : startTime;
      const eTime = isAllDay ? "23:59" : endTime;
      const startDT = `${startDate}T${sTime}:00`;
      const endDT = `${startDate}T${eTime}:00`;

      let rrule: string | null = null;
      let uiMode: string | null = null;
      let uiCount: number | null = null;

      if (recurrenceType !== "none") {
        let ruleStr = `FREQ=${recurrenceType.toUpperCase()}`;
        
        if (scope === 'future' && recurrenceUntil) {
             uiMode = 'date';
             ruleStr += `;UNTIL=${recurrenceUntil.replace(/-/g, "")}T235959`;
        }
        else if (recurrenceEndMode === "count" && recurrenceCount) {
          uiMode = 'count';
          uiCount = parseInt(recurrenceCount);
          const startDateObj = new Date(startDate);
          const untilStr = calculateUntilDate(startDateObj, recurrenceType, uiCount);
          ruleStr += `;UNTIL=${untilStr}`;
        } 
        else if (recurrenceEndMode === "date" && recurrenceUntil) {
          uiMode = 'date';
          ruleStr += `;UNTIL=${recurrenceUntil.replace(/-/g, "")}T235959`;
        }
        rrule = ruleStr;
      }

      const payload: any = {
        title, description: description || null,
        goal: goal.join(',') || null,
        target_audience: targetAudience.join(',') || null,
        organizer: organizer.join(',') || null,
        start_time: startDT, end_time: endDT,
        is_all_day: isAllDay,
        recurrence_rule: rrule,
        recurrence_ui_mode: uiMode,
        recurrence_ui_count: uiCount,
        department_id: departmentId || null,
        company_id: Number(activeCompanyId),
      };

      const targetId = eventToEdit?.id || eventId;

      if (targetId) {
        const idToPatch = targetId;
        const originalDate = eventToEdit?.instance_date || eventToEdit?.start_time; 
        const queryParams = new URLSearchParams();
        queryParams.append('scope', scope);
        if (originalDate) queryParams.append('date', originalDate);

        await api.patch(`/events/${idToPatch}?${queryParams.toString()}`, { ...payload, is_locked: false });
      } else {
        await api.post("/events/", payload);
      }

      onSuccess();
      onClose();
    } catch (err: any) {
      const details = err.response?.data?.detail;
      const msg = Array.isArray(details) ? details.map((d: any) => `${d.loc.join('.')} : ${d.msg}`).join(' | ') : "خطا در ذخیره.";
      setError(msg);
    } finally {
      setLoading(false);
      setShowRecurrenceOptions(false);
    }
  };

  const handleDelete = async () => {
    const idToDelete = eventToEdit?.id || eventId;
    if (!idToDelete || !canEdit || !confirm("حذف رویداد؟")) return;
    setDeleting(true);
    try {
      await api.delete(`/events/${idToDelete}`);
      onSuccess();
      onClose();
    } catch (err) { setError("خطا در حذف"); } finally { setDeleting(false); }
  };

  const handleToggleLock = async () => {
    const idToUse = eventToEdit?.id || eventId;
    if(!idToUse) return;
    try {
        await api.patch(`/events/${idToUse}`, { is_locked: !isLocked });
        setIsLocked(!isLocked);
        if(!isLocked) setCanEdit(true); // If it WAS locked and now isn't, enable edit
        onSuccess();
    } catch(e) { setError("خطا در قفل"); }
  };

  return (
    <>
      <Dialog open={isOpen} onClose={onClose} className="relative z-[100]">
        
        {/* Backdrop - Transparent on Desktop to see calendar, Dark on Mobile */}
        <div className="fixed inset-0 bg-black/60 md:bg-black/0 md:pointer-events-none transition-colors" aria-hidden="true" />

        {/* Positioning Container */}
        <div className="fixed inset-0 flex items-end md:items-end justify-center md:justify-end pointer-events-none">
          
          <Dialog.Panel 
            as={motion.div}
            initial={{ x: '-100%', y: '100%' }} // Animation handles both axes, CSS classes restrict it
            animate={{ 
                x: typeof window !== 'undefined' && window.innerWidth >= 768 ? 0 : 0,
                y: 0
            }}
            className={clsx(
                "pointer-events-auto bg-[#18181b] border-t md:border-r md:border-t-0 border-white/10 shadow-2xl flex flex-col",
                "w-full h-[85%] rounded-t-2xl", // Mobile Styles
                "md:w-[420px] md:h-full md:rounded-r-2xl md:rounded-tl-none" // Desktop Styles
            )}
            style={{ 
                transformOrigin: 'bottom left'
            }}
          >
            {/* --- HEADER --- */}
            <div className="flex items-center justify-between p-4 border-b border-white/5 shrink-0">
                <div className="flex items-center gap-2">
                    <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-full transition-colors">
                        <X size={20} className="text-gray-400" />
                    </button>
                    {fetchingDetails && <Loader2 className="animate-spin text-blue-500" size={16} />}
                </div>
                
                <div className="flex items-center gap-2">
                    {(eventId || eventToEdit) ? (
                        <>
                            {isManager && (
                                <button onClick={handleToggleLock} className="p-2 hover:bg-white/10 rounded-full text-amber-500">
                                    {isLocked ? <Lock size={18} /> : <Unlock size={18} />}
                                </button>
                            )}
                            {canEdit && (
                                <button onClick={handleDelete} className="p-2 hover:bg-red-500/20 text-red-400 rounded-full">
                                    {deleting ? <Loader2 size={18} className="animate-spin" /> : <Trash2 size={18} />}
                                </button>
                            )}
                        </>
                    ) : null}
                </div>
            </div>

            {/* --- SCROLLABLE BODY --- */}
            <form onSubmit={handlePreSubmit} className="flex-1 overflow-y-auto p-5 space-y-6 scrollbar-hide">
                {error && <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-lg text-red-300 text-xs">{error}</div>}

                {/* 1. Title Input (Large) */}
                <div>
                    <input 
                        value={title} 
                        onChange={(e) => setTitle(e.target.value)} 
                        placeholder="عنوان رویداد..." 
                        className="w-full bg-transparent text-2xl font-bold text-white placeholder-gray-600 outline-none"
                        autoFocus
                        disabled={!canEdit}
                    />
                </div>

                {/* 2. Compact Metadata */}
                <div className="space-y-4">
                    {/* Date/Time Row */}
                    <div className="flex flex-col gap-3 p-4 bg-white/5 rounded-xl border border-white/5">
                        <div className="flex items-center gap-3 text-gray-300 cursor-pointer hover:text-white transition-colors" onClick={() => canEdit && setPickerMode("date")}>
                            <CalendarDays size={18} className="text-blue-400" />
                            <span className="text-sm font-medium">{startDate ? new Date(startDate).toLocaleDateString('fa-IR') : "انتخاب تاریخ"}</span>
                        </div>
                        
                        <div className="flex items-center gap-4">
                            <div className="flex items-center gap-2 flex-1 cursor-pointer p-2 rounded hover:bg-white/5 transition-colors" onClick={() => canEdit && setShowStartTimePicker(true)}>
                                <Clock size={16} className="text-gray-500" />
                                <span className="text-sm">{toPersianDigits(startTime)}</span>
                            </div>
                            <ArrowRight size={14} className="text-gray-600" />
                            <ArrowLeft size={14} className="text-gray-600" />
                            <div className="flex items-center gap-2 flex-1 cursor-pointer p-2 rounded hover:bg-white/5 transition-colors" onClick={() => canEdit && setShowEndTimePicker(true)}>
                                <Clock size={16} className="text-gray-500" />
                                <span className="text-sm">{toPersianDigits(endTime)}</span>
                            </div>
                        </div>

                        <label className="flex items-center gap-2 text-xs text-gray-400 cursor-pointer mt-1">
                            <input type="checkbox" checked={isAllDay} onChange={(e) => setIsAllDay(e.target.checked)} className="accent-blue-500 rounded" disabled={!canEdit} />
                            تمام روز
                        </label>
                    </div>

                    {/* Department Context */}
                    {["manager", "superadmin", "evaluator"].includes(userRole) && (
                        <div className="relative">
                            <Building2 className="absolute right-3 top-3.5 text-gray-500" size={16} />
                            <select 
                                value={departmentId || ""} 
                                onChange={(e) => setDepartmentId(Number(e.target.value))}
                                className="w-full bg-black/20 border border-white/10 rounded-xl py-3 pr-10 pl-4 text-sm text-gray-200 outline-none focus:border-blue-500/50 appearance-none"
                                disabled={!canEdit}
                            >
                                <option value="">بدون دپارتمان</option>
                                {departments.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
                            </select>
                        </div>
                    )}
                </div>

                {/* 3. Expandable Section */}
                <div className="space-y-4">
                    <button 
                        type="button"
                        onClick={() => setIsExpanded(!isExpanded)}
                        className="flex items-center gap-2 text-xs font-bold text-blue-400 hover:text-blue-300 transition-colors w-full"
                    >
                        {isExpanded ? <ChevronUp size={14} /> : <MoreHorizontal size={14} />}
                        {isExpanded ? "نمایش کمتر" : "تنظیمات بیشتر (تکرار، توضیحات...)"}
                    </button>

                    <AnimatePresence>
                        {isExpanded && (
                            <motion.div 
                                initial={{ height: 0, opacity: 0 }}
                                animate={{ height: 'auto', opacity: 1 }}
                                exit={{ height: 0, opacity: 0 }}
                                className="overflow-hidden space-y-5 pt-2"
                            >
                                {/* Recurrence */}
                                <div className="space-y-3 p-4 bg-white/5 rounded-xl border border-white/5">
                                    <div className="text-xs font-bold text-gray-400 flex items-center gap-2"><Repeat size={14} /> تکرار</div>
                                    <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
                                        {[{ id: "none", label: "خیر" }, { id: "daily", label: "روزانه" }, { id: "weekly", label: "هفتگی" }, { id: "monthly", label: "ماهانه" }].map((t) => (
                                            <button
                                                key={t.id}
                                                type="button"
                                                onClick={() => setRecurrenceType(t.id)}
                                                disabled={!canEdit}
                                                className={clsx(
                                                    "px-3 py-1.5 text-xs rounded-lg border whitespace-nowrap transition-all",
                                                    recurrenceType === t.id ? "bg-blue-600 border-blue-600 text-white" : "border-white/10 text-gray-400 hover:bg-white/5"
                                                )}
                                            >
                                                {t.label}
                                            </button>
                                        ))}
                                    </div>
                                    
                                    {recurrenceType !== "none" && (
                                        <div className="flex items-center gap-2 mt-2">
                                            <select 
                                                value={recurrenceEndMode} 
                                                onChange={(e) => setRecurrenceEndMode(e.target.value as any)}
                                                className="bg-black/30 border border-white/10 rounded-lg px-2 py-1 text-xs text-gray-300 outline-none"
                                            >
                                                <option value="count">تعداد</option>
                                                <option value="date">تا تاریخ</option>
                                            </select>
                                            {recurrenceEndMode === 'count' ? (
                                                <input 
                                                    type="number" 
                                                    value={recurrenceCount} 
                                                    onChange={(e) => setRecurrenceCount(e.target.value)}
                                                    className="w-16 bg-black/30 border border-white/10 rounded-lg px-2 py-1 text-xs text-white outline-none"
                                                    placeholder="5"
                                                />
                                            ) : (
                                                <div onClick={() => setPickerMode('until')} className="bg-black/30 border border-white/10 rounded-lg px-3 py-1 text-xs text-gray-300 cursor-pointer min-w-[80px]">
                                                    {recurrenceUntil ? new Date(recurrenceUntil).toLocaleDateString('fa-IR') : "انتخاب"}
                                                </div>
                                            )}
                                        </div>
                                    )}
                                </div>

                                {/* Tags */}
                                <div className="space-y-3">
                                    <MultiTagInput category="goal" value={goal} onChange={setGoal} disabled={!canEdit} placeholder="هدف..." />
                                    <MultiTagInput category="audience" value={targetAudience} onChange={setTargetAudience} disabled={!canEdit} placeholder="مخاطبان..." />
                                    <MultiTagInput category="organizer" value={organizer} onChange={setOrganizer} disabled={!canEdit} placeholder="سازمان‌دهنده..." />
                                </div>

                                {/* Description */}
                                <div className="space-y-2">
                                    <label className="text-xs text-gray-500 font-bold">توضیحات</label>
                                    <textarea 
                                        value={description} 
                                        onChange={(e) => setDescription(e.target.value)} 
                                        rows={3} 
                                        className="w-full bg-black/20 border border-white/10 rounded-xl p-3 text-sm text-gray-200 outline-none focus:border-blue-500/50"
                                        placeholder="جزئیات بیشتر..."
                                        disabled={!canEdit}
                                    />
                                </div>
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>
            </form>

            {/* --- FOOTER --- */}
            <div className="p-4 border-t border-white/10 bg-black/20 shrink-0">
                <button 
                    onClick={handlePreSubmit} 
                    disabled={loading || !canEdit}
                    className={clsx(
                        "w-full py-3 rounded-xl font-bold text-white flex items-center justify-center gap-2 transition-all",
                        loading || !canEdit ? "bg-gray-700 opacity-50 cursor-not-allowed" : "bg-blue-600 hover:bg-blue-500 shadow-lg hover:shadow-blue-900/20 active:scale-[0.98]"
                    )}
                >
                    {loading ? <Loader2 className="animate-spin" /> : <CheckCircle2 />}
                    {loading ? "در حال ثبت..." : "ذخیره تغییرات"}
                </button>
            </div>

          </Dialog.Panel>
        </div>

        {/* --- EXTERNAL PICKERS (Z-Index High) --- */}
        {pickerMode && (
            <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/50">
                <DatePicker
                    value={pickerMode === "date" ? startDate : recurrenceUntil}
                    onChange={(val) => {
                        if (pickerMode === "date") setStartDate(val);
                        else setRecurrenceUntil(val);
                    }}
                    onClose={() => setPickerMode(null)}
                />
            </div>
        )}
        {showStartTimePicker && <TimePicker value={startTime} onChange={setStartTime} onClose={() => setShowStartTimePicker(false)} />}
        {showEndTimePicker && <TimePicker value={endTime} onChange={setEndTime} onClose={() => setShowEndTimePicker(false)} />}

        {/* --- RECURRENCE CONFIRMATION --- */}
        <Transition appear show={showRecurrenceOptions} as={Fragment}>
            <Dialog as="div" className="relative z-[300]" onClose={() => setShowRecurrenceOptions(false)} dir="rtl">
                <div className="fixed inset-0 bg-black/70 backdrop-blur-sm" />
                <div className="fixed inset-0 overflow-y-auto flex items-center justify-center p-4">
                    <Dialog.Panel className="w-full max-w-sm bg-[#18181b] border border-white/10 rounded-2xl p-5 text-right shadow-2xl">
                        <div className="flex items-center gap-3 text-blue-400 mb-2">
                            <AlertTriangle size={24} />
                            <Dialog.Title className="font-bold text-lg">ویرایش تکرار</Dialog.Title>
                        </div>
                        <p className="text-xs text-gray-400 mb-4">تغییرات چگونه اعمال شود؟</p>
                        
                        <div className="space-y-2">
                            <button onClick={() => executeSubmit('single')} className="w-full p-3 bg-white/5 hover:bg-blue-500/20 hover:text-blue-300 rounded-xl text-right text-sm transition-colors">فقط این رویداد</button>
                            <button onClick={() => executeSubmit('future')} className="w-full p-3 bg-white/5 hover:bg-purple-500/20 hover:text-purple-300 rounded-xl text-right text-sm transition-colors">این و بعدی‌ها</button>
                            <button onClick={() => executeSubmit('all')} className="w-full p-3 bg-white/5 hover:bg-orange-500/20 hover:text-orange-300 rounded-xl text-right text-sm transition-colors">تمام رویدادها</button>
                        </div>
                        <button onClick={() => setShowRecurrenceOptions(false)} className="w-full mt-4 py-2 text-xs text-gray-500 hover:text-white">انصراف</button>
                    </Dialog.Panel>
                </div>
            </Dialog>
        </Transition>

      </Dialog>
    </>
  );
}