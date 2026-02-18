"use client";

import { useState, useEffect, Fragment } from "react";
import { Dialog, Transition } from "@headlessui/react";
import {
  X, Clock, AlignLeft, Type, Repeat, Target, User, Flag,
  CheckCircle2, Loader2, Trash2, CalendarDays,
  ChevronDown, Building2, Lock, Unlock, Tag,
  Ban, AlertTriangle, ArrowRight, Layers, Copy
} from "lucide-react";
import api from "@/lib/api";
import clsx from "clsx";
import { toPersianDigits } from "@/lib/utils";
import DatePicker from "@/components/DatePicker";
import TimePicker from "@/components/TimePicker";
import MultiTagInput from "@/components/MultiTagInput";
import ModalWrapper from "@/components/ui/ModalWrapper";
import { Department, CalendarEvent } from "@/types";
import { useAuthStore } from "@/stores/authStore";
import { motion, AnimatePresence } from "framer-motion";
import { addDays, addWeeks, addMonths } from "date-fns-jalali";

interface EventModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  initialDate?: Date;
  initialStartTime?: string;
  initialEndTime?: string;
  eventToEdit?: CalendarEvent | null;
  eventId?: number;
  currentUserId?: number;
}

type TabType = "general" | "timing" | "details";
type RecurrenceScope = "all" | "single" | "future";

const getLocalDateStr = (date: Date) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

export default function EventModal({
  isOpen, onClose, onSuccess, initialDate, initialStartTime, initialEndTime,
  eventToEdit, eventId, currentUserId,
}: EventModalProps) {

  const { currentRole, activeCompanyId, user } = useAuthStore();
  const userRole = currentRole() || "viewer";
  const isManager = userRole === 'manager' || user?.is_superadmin;

  const [activeTab, setActiveTab] = useState<TabType>("general");
  const [loading, setLoading] = useState(false);
  const [fetchingDetails, setFetchingDetails] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState("");
  const [departments, setDepartments] = useState<Department[]>([]);

  const [showRecurrenceOptions, setShowRecurrenceOptions] = useState(false);
  const [originalRecurrenceRule, setOriginalRecurrenceRule] = useState<string | null>(null);

  const [canEdit, setCanEdit] = useState(true);
  const [isLocked, setIsLocked] = useState(false);

  const [title, setTitle] = useState("");
  const [departmentId, setDepartmentId] = useState<number | null>(null);

  const [startDate, setStartDate] = useState("");
  const [startTime, setStartTime] = useState("09:00");
  const [endTime, setEndTime] = useState("10:00");
  const [isAllDay, setIsAllDay] = useState(false);

  const [recurrenceType, setRecurrenceType] = useState("none");
  const [recurrenceEndMode, setRecurrenceEndMode] = useState<"count" | "date">("count");
  const [recurrenceCount, setRecurrenceCount] = useState("");
  const [recurrenceUntil, setRecurrenceUntil] = useState("");

  const [targetAudience, setTargetAudience] = useState<string[]>([]);
  const [organizer, setOrganizer] = useState<string[]>([]); 
  const [goal, setGoal] = useState<string[]>([]); 
  const [description, setDescription] = useState("");

  const [pickerMode, setPickerMode] = useState<"date" | "until" | null>(null);
  const [showStartTimePicker, setShowStartTimePicker] = useState(false);
  const [showEndTimePicker, setShowEndTimePicker] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setShowRecurrenceOptions(false);
      setError("");
      
      if (["manager", "superadmin", "evaluator"].includes(userRole)) {
        fetchDepartments();
      }

      const targetId = eventToEdit?.id || eventId;

      if (targetId) {
        const loadEvent = async () => {
          setFetchingDetails(true);
          try {
            const { data } = await api.get(`/events/${targetId}`);
            
            setTitle(data.title);
            setDescription(data.description || "");
            setDepartmentId(data.department_id);
            setIsLocked(!!data.is_locked);
            setOriginalRecurrenceRule(data.recurrence_rule);

            setGoal(data.goal ? data.goal.split(',').filter(Boolean) : []);
            setTargetAudience(data.target_audience ? data.target_audience.split(',').filter(Boolean) : []);
            setOrganizer(data.organizer ? data.organizer.split(',').filter(Boolean) : []);

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

            if (data.recurrence_rule) {
              const rule = data.recurrence_rule;
              const freqMatch = rule.match(/FREQ=(DAILY|WEEKLY|MONTHLY)/i);
              if (freqMatch) setRecurrenceType(freqMatch[1].toLowerCase());

              // --- KEY FIX: Always extract UNTIL first to have an anchor ---
              const untilMatch = rule.match(/UNTIL=(\d{8})/);
              if (untilMatch) {
                const raw = untilMatch[1];
                setRecurrenceUntil(`${raw.slice(0, 4)}-${raw.slice(4, 6)}-${raw.slice(6, 8)}`);
              }

              // Determine UI Mode
              if (data.recurrence_ui_mode === 'count' && data.recurrence_ui_count) {
                  setRecurrenceEndMode("count");
                  setRecurrenceCount(data.recurrence_ui_count.toString());
              } else if (untilMatch) {
                  setRecurrenceEndMode("date");
              } else {
                  // Fallback for infinite
                  setRecurrenceEndMode("count"); 
              }
            } else {
              setRecurrenceType("none");
              setRecurrenceCount("");
              setRecurrenceUntil("");
            }

            let editable = true;
            if (userRole === "viewer") editable = false;
            if (data.is_locked && !isManager) editable = false;
            setCanEdit(editable);

          } catch (err) {
            setError("خطا در دریافت جزئیات رویداد");
            setCanEdit(false);
          } finally {
            setFetchingDetails(false);
          }
        };
        loadEvent();

      } else {
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
        setActiveTab("general");
        setCanEdit(userRole !== "viewer");
        setIsLocked(false);
        setOriginalRecurrenceRule(null);
        setFetchingDetails(false);
      }
    }
  }, [isOpen, eventToEdit, eventId, initialDate, initialStartTime, initialEndTime, userRole, isManager]);

  const fetchDepartments = async () => {
    try {
      const res = await api.get<Department[]>("/departments/");
      setDepartments(res.data);
    } catch (e) { console.error(e); }
  };

  const handleToggleLock = async () => {
    if (!isManager || (!eventToEdit && !eventId)) return;
    setLoading(true);
    try {
      const newLockState = !isLocked;
      const idToUse = eventToEdit?.id || eventId;
      if(idToUse) {
          await api.patch(`/events/${idToUse}`, { is_locked: newLockState });
          setIsLocked(newLockState);
          if (!newLockState) setCanEdit(true);
          onSuccess();
      }
    } catch (err) { setError("خطا در تغییر وضعیت قفل"); } finally { setLoading(false); }
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
        
        // --- LOGIC FOR RECURRENCE RULE GENERATION ---
        
        // CASE A: Future Split (Copy Master's End Date)
        // If we are splitting ('future') AND we have a valid 'recurrenceUntil' loaded from the master,
        // we prefer to use that UNTIL date to prevent "extending" the series due to count recalculation.
        if (scope === 'future' && recurrenceUntil) {
             uiMode = 'date';
             ruleStr += `;UNTIL=${recurrenceUntil.replace(/-/g, "")}T235959`;
        }
        // CASE B: Standard Count Logic (Create or Edit All)
        else if (recurrenceEndMode === "count" && recurrenceCount) {
          uiMode = 'count';
          uiCount = parseInt(recurrenceCount);
          const startDateObj = new Date(startDate);
          const untilStr = calculateUntilDate(startDateObj, recurrenceType, uiCount);
          ruleStr += `;UNTIL=${untilStr}`;
        } 
        // CASE C: Standard Date Logic
        else if (recurrenceEndMode === "date" && recurrenceUntil) {
          uiMode = 'date';
          ruleStr += `;UNTIL=${recurrenceUntil.replace(/-/g, "")}T235959`;
        }
        
        rrule = ruleStr;
      }

      const payload: any = {
        title,
        description: description || null,
        goal: goal.join(',') || null,
        target_audience: targetAudience.join(',') || null,
        organizer: organizer.join(',') || null,
        start_time: startDT,
        end_time: endDT,
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
        if (originalDate) {
            queryParams.append('date', originalDate);
        }

        const updatePayload = { ...payload, is_locked: false };
        await api.patch(`/events/${idToPatch}?${queryParams.toString()}`, updatePayload);
      
      } else {
        await api.post("/events/", payload);
      }

      onSuccess();
      onClose();
    } catch (err: any) {
      console.error(err);
      const details = err.response?.data?.detail;
      const msg = Array.isArray(details) ? details.map((d: any) => `${d.loc.join('.')} : ${d.msg}`).join(' | ') : "خطا در ذخیره رویداد.";
      setError(msg);
    } finally {
      setLoading(false);
      setShowRecurrenceOptions(false);
    }
  };

  const handleDelete = async () => {
    const idToDelete = eventToEdit?.id || eventId;
    if (!idToDelete || !canEdit || !confirm("آیا از حذف کل این رویداد (و تمام تکرارها) اطمینان دارید؟")) return;
    
    setDeleting(true);
    try {
      await api.delete(`/events/${idToDelete}`);
      onSuccess();
      onClose();
    } catch (err) {
      setError("خطا در حذف رویداد");
    } finally {
      setDeleting(false);
    }
  };

  return (
    <>
    <ModalWrapper isOpen={isOpen} onClose={onClose} size="lg" title={
      <div className="flex items-center gap-2">
        {isLocked ? <Lock className="text-amber-500" size={24} /> : <CalendarDays className="text-blue-500" />}
        {eventId || eventToEdit ? (isLocked ? "رویداد قفل شده" : "ویرایش رویداد") : "برنامه‌ریزی جدید"}
        {fetchingDetails && <Loader2 className="animate-spin text-gray-500" size={16} />}
      </div>
    }>
      <div className="flex flex-col h-full">
        {/* Tabs */}
        <div className="flex border-b border-white/5 bg-black/20 px-2 pt-2 shrink-0">
          {[
            { id: "general", label: "عمومی", icon: Type },
            { id: "timing", label: "زمان‌بندی", icon: Clock },
            { id: "details", label: "جزئیات", icon: AlignLeft },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as TabType)}
              className={clsx(
                "flex-1 flex items-center justify-center gap-2 py-3 text-sm font-medium transition-all rounded-t-xl relative top-[1px]",
                activeTab === tab.id
                  ? "text-blue-400 bg-[#18181b]/50 border-t border-r border-l border-white/10 shadow-[0_-5px_15px_rgba(0,0,0,0.3)]"
                  : "text-gray-500 hover:text-gray-300 hover:bg-white/5 border-transparent"
              )}
            >
              <tab.icon size={16} /> <span>{tab.label}</span>
            </button>
          ))}
        </div>

        {/* Content Form */}
        <form onSubmit={handlePreSubmit} className="p-6 overflow-y-auto flex-1 custom-scrollbar space-y-6">
          {error && (
            <div className="p-4 text-sm text-red-200 bg-red-900/30 border border-red-800 rounded-xl flex items-center gap-2">
              <Ban size={16} /> {error}
            </div>
          )}

          {!canEdit && (eventId || eventToEdit) && (
            <div className="p-3 bg-blue-500/10 border border-blue-500/20 rounded-xl text-xs text-blue-300 flex items-center gap-2">
              <Lock size={14} />
              {isManager && isLocked
                ? "برای ویرایش، ابتدا قفل رویداد را باز کنید."
                : "شما مجوز ویرایش این رویداد را ندارید."}
            </div>
          )}

          {/* TAB 1: GENERAL */}
          <div className={clsx("space-y-5", activeTab !== "general" && "hidden")}>
            <div className="space-y-2">
              <label className="text-xs text-gray-400 font-bold block">عنوان رویداد *</label>
              <input
                disabled={!canEdit || fetchingDetails}
                type="text"
                required
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="w-full px-4 py-3 bg-black/40 border border-white/10 rounded-xl text-white outline-none focus:border-blue-500/50 transition-all text-lg disabled:opacity-50"
                placeholder="مثلا: جلسه هیئت مدیره..."
                autoFocus
              />
            </div>

            {["manager", "superadmin", "evaluator"].includes(userRole) && (
              <div className="space-y-2">
                <label className="text-xs text-gray-400 font-bold flex items-center gap-1">
                  <Building2 size={14} /> دپارتمان
                </label>
                <div className="relative">
                  <select
                    disabled={!canEdit || fetchingDetails}
                    value={departmentId || ""}
                    onChange={(e) => setDepartmentId(Number(e.target.value))}
                    className="w-full px-4 py-3 bg-black/40 border border-white/10 rounded-xl text-white outline-none focus:border-blue-500/50 appearance-none disabled:opacity-50"
                  >
                    <option value="">(انتخاب کنید)</option>
                    {departments.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
                  </select>
                  <ChevronDown className="absolute left-4 top-3.5 text-gray-500 pointer-events-none" size={16} />
                </div>
              </div>
            )}
          </div>

          {/* TAB 2: TIMING */}
          <div className={clsx("space-y-6", activeTab !== "timing" && "hidden")}>
            <label className="flex items-center gap-3 p-3 bg-black/20 border border-white/10 rounded-xl cursor-pointer hover:bg-white/5 transition-colors">
              <div className={clsx("w-5 h-5 rounded border flex items-center justify-center transition-colors", isAllDay ? "bg-blue-500 border-blue-500" : "border-gray-500")}>
                {isAllDay && <CheckCircle2 size={12} className="text-white" />}
              </div>
              <input disabled={!canEdit || fetchingDetails} type="checkbox" className="hidden" checked={isAllDay} onChange={(e) => setIsAllDay(e.target.checked)} />
              <span className="text-sm text-gray-200">رویداد تمام روز</span>
            </label>

            <div className="space-y-2">
              <label className="text-xs text-gray-400 font-bold">تاریخ برگزاری</label>
              <div
                onClick={() => canEdit && !fetchingDetails && setPickerMode("date")}
                className={clsx("w-full px-4 py-3 bg-black/40 border border-white/10 rounded-xl text-white cursor-pointer hover:border-blue-500/50 transition-all flex justify-between items-center", (!canEdit || fetchingDetails) && "opacity-50 cursor-not-allowed")}
              >
                <span>{startDate ? new Date(startDate).toLocaleDateString("fa-IR") : "انتخاب تاریخ"}</span>
                <CalendarDays size={18} className="text-gray-500" />
              </div>
            </div>

            {!isAllDay && (
              <div className="grid grid-cols-2 gap-4 animate-in fade-in slide-in-from-top-1">
                <div className="space-y-2">
                  <label className="text-xs text-gray-400 font-bold">شروع</label>
                  <div
                    onClick={() => canEdit && setShowStartTimePicker(true)}
                    className={clsx("w-full px-4 py-3 bg-black/40 border border-white/10 rounded-xl text-white text-center cursor-pointer ltr hover:border-blue-500/50 transition-all", !canEdit && "opacity-50 cursor-not-allowed")}
                  >
                    {toPersianDigits(startTime)}
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="text-xs text-gray-400 font-bold">پایان</label>
                  <div
                    onClick={() => canEdit && setShowEndTimePicker(true)}
                    className={clsx("w-full px-4 py-3 bg-black/40 border border-white/10 rounded-xl text-white text-center cursor-pointer ltr hover:border-blue-500/50 transition-all", !canEdit && "opacity-50 cursor-not-allowed")}
                  >
                    {toPersianDigits(endTime)}
                  </div>
                </div>
              </div>
            )}

            <div className="border-t border-white/10 pt-4">
              <div className="text-xs text-blue-400 font-bold mb-3 flex items-center gap-2">
                <Repeat size={14} /> تکرار رویداد
              </div>
              <div className="grid grid-cols-4 gap-2 mb-4">
                {[{ id: "none", label: "خیر" }, { id: "daily", label: "روزانه" }, { id: "weekly", label: "هفتگی" }, { id: "monthly", label: "ماهانه" }].map((t) => (
                  <button
                    disabled={!canEdit || fetchingDetails}
                    key={t.id}
                    type="button"
                    onClick={() => setRecurrenceType(t.id)}
                    className={clsx("py-2 text-xs rounded-lg border transition-all", recurrenceType === t.id ? "bg-blue-600 border-blue-600 text-white shadow-lg shadow-blue-900/20" : "bg-black/20 border-white/10 text-gray-400 hover:bg-white/5", (!canEdit || fetchingDetails) && "opacity-50 cursor-not-allowed")}
                  >
                    {t.label}
                  </button>
                ))}
              </div>

              {recurrenceType !== "none" && (
                <div className="bg-black/20 p-4 rounded-xl border border-white/10 space-y-3 animate-in fade-in">
                  <div className="flex gap-6">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input type="radio" checked={recurrenceEndMode === "count"} onChange={() => setRecurrenceEndMode("count")} className="accent-blue-500" />
                      <span className="text-xs text-gray-300">تعداد دفعات</span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input type="radio" checked={recurrenceEndMode === "date"} onChange={() => setRecurrenceEndMode("date")} className="accent-blue-500" />
                      <span className="text-xs text-gray-300">تا تاریخ</span>
                    </label>
                  </div>
                  {recurrenceEndMode === "count" ? (
                    <input
                      disabled={!canEdit}
                      type="number"
                      value={recurrenceCount}
                      onChange={(e) => setRecurrenceCount(e.target.value)}
                      className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-2 text-white text-sm"
                      placeholder="تعداد تکرار"
                    />
                  ) : (
                    <div
                      onClick={() => canEdit && setPickerMode("until")}
                      className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-2.5 text-white text-sm cursor-pointer"
                    >
                      {recurrenceUntil ? new Date(recurrenceUntil).toLocaleDateString("fa-IR") : "تاریخ پایان"}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* TAB 3: DETAILS */}
          <div className={clsx("space-y-5", activeTab !== "details" && "hidden")}>
            <div className="space-y-2">
              <label className="text-xs text-gray-400 font-bold flex items-center gap-2">
                <Target size={14} /> هدف رویداد
              </label>
              <MultiTagInput
                category="goal"
                value={goal}
                onChange={setGoal}
                disabled={!canEdit}
                placeholder="هدف را تایپ کنید..."
              />
            </div>

            <div className="space-y-2">
              <label className="text-xs text-gray-400 font-bold flex items-center gap-2">
                <Tag size={14} /> مخاطبان
              </label>
              <MultiTagInput
                category="audience"
                value={targetAudience}
                onChange={setTargetAudience}
                disabled={!canEdit}
                placeholder="نام واحد یا گروه..."
              />
            </div>

            <div className="space-y-2">
              <label className="text-xs text-gray-400 font-bold flex items-center gap-2">
                <User size={14} /> برگزار کننده
              </label>
              <MultiTagInput
                category="organizer"
                value={organizer}
                onChange={setOrganizer}
                disabled={!canEdit}
                placeholder="نام شخص یا واحد..."
              />
            </div>

            <div className="space-y-2">
              <label className="text-xs text-gray-400 font-bold">توضیحات تکمیلی</label>
              <textarea
                disabled={!canEdit || fetchingDetails}
                rows={3}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="w-full px-4 py-3 bg-black/40 border border-white/10 rounded-xl text-white outline-none"
              />
            </div>
          </div>
        </form>

        {/* Footer */}
        <div className="p-5 border-t border-white/5 bg-black/20 flex justify-between items-center backdrop-blur-md shrink-0">
          <div className="flex gap-2 items-center">
            {(eventId || eventToEdit) && canEdit && (
              <button onClick={handleDelete} className="p-3 text-red-400 hover:bg-red-500/10 border border-transparent hover:border-red-500/20 rounded-xl transition-all">
                {deleting ? <Loader2 className="animate-spin" size={20} /> : <Trash2 size={20} />}
              </button>
            )}
            {isManager && (eventId || eventToEdit) && (
              <button
                onClick={handleToggleLock}
                disabled={loading}
                className={clsx(
                  "flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-bold transition-all border",
                  isLocked ? "border-amber-500/30 text-amber-400 hover:bg-amber-500/10" : "border-gray-600 text-gray-400 hover:bg-white/5"
                )}
              >
                {isLocked ? <Unlock size={16} /> : <Lock size={16} />}
              </button>
            )}
          </div>

          <div className="flex items-center gap-3">
            <button onClick={onClose} className="px-5 py-2.5 text-sm font-medium text-gray-300 hover:text-white hover:bg-white/5 rounded-xl transition-colors border border-transparent">
              {canEdit ? "انصراف" : "بستن"}
            </button>
            {canEdit && (
              <button
                onClick={handlePreSubmit}
                disabled={loading || deleting || fetchingDetails}
                className={clsx(
                  "px-6 py-2.5 text-sm font-bold text-white bg-blue-600 hover:bg-blue-500 rounded-xl shadow-[0_0_20px_rgba(37,99,235,0.4)] transition-all flex items-center gap-2 hover:scale-105 active:scale-95",
                  (loading || fetchingDetails) && "opacity-50 cursor-not-allowed"
                )}
              >
                {loading ? <Loader2 className="animate-spin" size={16} /> : <CheckCircle2 size={18} />}
                <span>{loading ? "در حال ثبت..." : (eventId || eventToEdit) ? "ذخیره تغییرات" : "ثبت نهایی"}</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* --- EXTERNAL PICKERS --- */}
      {pickerMode && (
        <div className="fixed inset-0 z-[200]">
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

      {showStartTimePicker && (
        <TimePicker
          value={startTime}
          onChange={setStartTime}
          onClose={() => setShowStartTimePicker(false)}
        />
      )}

      {showEndTimePicker && (
        <TimePicker
          value={endTime}
          onChange={setEndTime}
          onClose={() => setShowEndTimePicker(false)}
        />
      )}
    </ModalWrapper>

    {/* --- RECURRENCE CONFIRMATION MODAL --- */}
    <Transition appear show={showRecurrenceOptions} as={Fragment}>
      <Dialog 
        as="div" 
        className="relative z-[300]" 
        onClose={() => setShowRecurrenceOptions(false)} 
        dir="rtl"
      >
        <Transition.Child
          as={Fragment}
          enter="ease-out duration-300"
          enterFrom="opacity-0"
          enterTo="opacity-100"
          leave="ease-in duration-200"
          leaveFrom="opacity-100"
          leaveTo="opacity-0"
        >
          <div className="fixed inset-0 bg-black/70 backdrop-blur-sm" />
        </Transition.Child>

        <div className="fixed inset-0 overflow-y-auto">
          <div className="flex min-h-full items-center justify-center p-4 text-center">
            <Transition.Child
              as={Fragment}
              enter="ease-out duration-300"
              enterFrom="opacity-0 scale-95 translate-y-4"
              enterTo="opacity-100 scale-100 translate-y-0"
              leave="ease-in duration-200"
              leaveFrom="opacity-100 scale-100 translate-y-0"
              leaveTo="opacity-0 scale-95 translate-y-4"
            >
              <Dialog.Panel className="w-full max-w-sm transform overflow-hidden rounded-2xl bg-[#18181b] border border-white/10 text-right shadow-2xl transition-all ring-1 ring-white/10">
                
                <div className="p-5 border-b border-white/10 bg-gradient-to-r from-blue-900/20 to-transparent">
                  <div className="flex items-center gap-3 text-blue-400 mb-1">
                    <AlertTriangle size={24} />
                    <Dialog.Title as="h3" className="font-bold text-lg">ویرایش رویداد تکرار شونده</Dialog.Title>
                  </div>
                  <p className="text-xs text-gray-400 leading-relaxed">
                    این رویداد بخشی از یک سری تکرار شونده است. تغییرات شما چگونه اعمال شود؟
                  </p>
                </div>

                <div className="p-3 space-y-2">
                  <button
                    onClick={() => executeSubmit('single')}
                    className="w-full flex items-center gap-4 p-4 rounded-xl hover:bg-white/5 transition-colors group text-right"
                  >
                    <div className="w-10 h-10 rounded-full bg-blue-500/10 flex items-center justify-center text-blue-400 group-hover:bg-blue-500 group-hover:text-white transition-colors">
                      <Target size={20} />
                    </div>
                    <div className="flex-1">
                      <div className="text-sm font-bold text-gray-200">فقط همین رویداد</div>
                      <div className="text-[10px] text-gray-500 mt-1">سایر تکرارها بدون تغییر باقی می‌مانند.</div>
                    </div>
                  </button>

                  <button
                    onClick={() => executeSubmit('future')}
                    className="w-full flex items-center gap-4 p-4 rounded-xl hover:bg-white/5 transition-colors group text-right"
                  >
                    <div className="w-10 h-10 rounded-full bg-purple-500/10 flex items-center justify-center text-purple-400 group-hover:bg-purple-500 group-hover:text-white transition-colors">
                      <ArrowRight size={20} />
                    </div>
                    <div className="flex-1">
                      <div className="text-sm font-bold text-gray-200">این رویداد و بعدی‌ها</div>
                      <div className="text-[10px] text-gray-500 mt-1">تغییرات روی تمام رویدادهای آینده اعمال می‌شود.</div>
                    </div>
                  </button>

                  <button
                    onClick={() => executeSubmit('all')}
                    className="w-full flex items-center gap-4 p-4 rounded-xl hover:bg-white/5 transition-colors group text-right"
                  >
                    <div className="w-10 h-10 rounded-full bg-orange-500/10 flex items-center justify-center text-orange-400 group-hover:bg-orange-500 group-hover:text-white transition-colors">
                      <Layers size={20} />
                    </div>
                    <div className="flex-1">
                      <div className="text-sm font-bold text-gray-200">تمام رویدادها</div>
                      <div className="text-[10px] text-gray-500 mt-1">تغییر کل مجموعه (گذشته و آینده).</div>
                    </div>
                  </button>
                </div>

                <div className="p-4 border-t border-white/10 bg-black/20">
                  <button 
                    onClick={() => setShowRecurrenceOptions(false)}
                    className="w-full py-2.5 rounded-xl text-xs font-medium text-gray-400 hover:text-white hover:bg-white/5 transition-colors"
                  >
                    انصراف
                  </button>
                </div>

              </Dialog.Panel>
            </Transition.Child>
          </div>
        </div>
      </Dialog>
    </Transition>
    </>
  );
}