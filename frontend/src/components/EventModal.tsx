"use client";

import { useState, useEffect, Fragment } from "react";
import {
  X,
  Clock,
  AlignLeft,
  Type,
  Repeat,
  Target,
  User,
  Flag,
  CheckCircle2,
  Loader2,
  Trash2,
  Check,
  Ban,
  CalendarDays,
  ChevronDown,
  Building2 // Added icon
} from "lucide-react";
import api from "@/lib/api";
import clsx from "clsx";
import { toPersianDigits } from "@/lib/utils";
import TimePicker from "@/components/TimePicker";
import DatePicker from "@/components/DatePicker";
import MultiTagInput from "@/components/MultiTagInput";
import { Department, EventInstance, EventCreatePayload } from "@/types"; // Updated imports
import { useAuthStore } from "@/stores/authStore"; // <--- NEW ARCHITECTURE

interface EventModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  initialDate?: Date;
  initialStartTime?: string;
  initialEndTime?: string;
  eventToEdit?: EventInstance | null; // Using new type
  currentUserId: number;
}

type TabType = "general" | "timing" | "details";

export default function EventModal({
  isOpen,
  onClose,
  onSuccess,
  initialDate,
  initialStartTime,
  initialEndTime,
  eventToEdit,
  currentUserId,
}: EventModalProps) {
  // --- STORE INTEGRATION ---
  const { currentRole, activeCompanyId } = useAuthStore(); // Get data from Store
  const userRole = currentRole() || "viewer";

  const [activeTab, setActiveTab] = useState<TabType>("general");
  const [loading, setLoading] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState("");
  const [departments, setDepartments] = useState<Department[]>([]);
  const [canEdit, setCanEdit] = useState(true);

  // --- FORM STATES ---
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
  const [targetAudience, setTargetAudience] = useState("");
  const [organizer, setOrganizer] = useState("");
  const [goal, setGoal] = useState("");
  const [description, setDescription] = useState("");

  // Pickers
  const [pickerMode, setPickerMode] = useState<"date" | "until" | null>(null);
  const [showStartTimePicker, setShowStartTimePicker] = useState(false);
  const [showEndTimePicker, setShowEndTimePicker] = useState(false);

  // --- ESCAPE KEY LISTENER ---
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isOpen) {
        if (!pickerMode && !showStartTimePicker && !showEndTimePicker) {
          onClose();
        }
      }
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose, pickerMode, showStartTimePicker, showEndTimePicker]);

  // --- INITIALIZATION ---
  useEffect(() => {
    if (isOpen) {
      // 1. Fetch Departments (if needed)
      if (["manager", "superadmin", "evaluator"].includes(userRole)) {
        fetchDepartments();
      }

      // 2. Permissions Logic (Updated)
      let editable = true;
      if (eventToEdit) {
        if (userRole === "viewer") editable = false;
        if (userRole === "proposer") {
           // Note: In new model, we check if eventToEdit.status is approved
           // Also need to check ownership (eventToEdit.proposer_id not available in Instance view yet, 
           // usually we pass it or check detail endpoint. For now assuming passed prop is correct)
           // If we don't have proposer_id in EventInstance, we might need to fetch the Master.
           const isLocked = eventToEdit.status === "approved";
           if (isLocked) editable = false;
        }
      }
      setCanEdit(editable);

      // 3. Populate Form
      if (eventToEdit) {
        setTitle(eventToEdit.title);
        // Note: Instance might not have full description/goal if we didn't fetch details.
        // For Phase 2, we assume we might need a separate GET /events/{id} call here
        // if eventToEdit is just a grid instance. 
        // For now, we populate what we have.
        
        // Date Logic
        const start = new Date(eventToEdit.start_time);
        const end = new Date(eventToEdit.end_time);
        setStartDate(start.toISOString().split("T")[0]);
        setStartTime(start.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" }));
        setEndTime(end.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" }));
        setIsAllDay(eventToEdit.is_all_day);

        // TODO: Populate Recurrence/Description from API if missing in Instance
        // setRecurrenceType(...) 
      } else {
        // Create New Event
        const targetDate = initialDate || new Date();
        setStartDate(targetDate.toISOString().split("T")[0]);
        setTitle("");
        setDepartmentId(null);
        setStartTime(initialStartTime || "09:00");
        setEndTime(initialEndTime || "10:00");
        setIsAllDay(false);
        setRecurrenceType("none");
        setRecurrenceEndMode("count");
        setRecurrenceCount("");
        setRecurrenceUntil("");
        setTargetAudience("");
        setOrganizer("");
        setGoal("");
        setDescription("");
        setActiveTab("general");
        setCanEdit(userRole !== "viewer");
      }
      setError("");
    }
  }, [isOpen, initialDate, initialStartTime, initialEndTime, eventToEdit, userRole]);

  const fetchDepartments = async () => {
    try {
      const res = await api.get<Department[]>("/departments/");
      setDepartments(res.data);
    } catch (e) {
      console.error(e);
    }
  };

  const renderDeptOptions = (parentId: number | null = null, level = 0) => {
    const children = departments.filter((d) => (d.parent_id || null) === parentId);
    if (children.length === 0) return null;
    return children.map((dept) => (
      <Fragment key={dept.id}>
        <option value={dept.id}>
          {level > 0 ? "\u00A0\u00A0".repeat(level) + "└ " : ""}
          {dept.name}
        </option>
        {renderDeptOptions(dept.id, level + 1)}
      </Fragment>
    ));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canEdit) return;
    
    // Safety Check for Company ID
    if (!activeCompanyId) {
        setError("خطا: سازمان فعال یافت نشد.");
        return;
    }

    setLoading(true);

    try {
      const sTime = isAllDay ? "00:00" : startTime;
      const eTime = isAllDay ? "23:59" : endTime;
      const startDT = `${startDate}T${sTime}:00`;
      const endDT = `${startDate}T${eTime}:00`;

      // Construct RRULE
      let rrule = null;
      if (recurrenceType !== "none") {
        rrule = `FREQ=${recurrenceType.toUpperCase()}`;
        if (recurrenceEndMode === "count" && recurrenceCount) {
          rrule += `;COUNT=${recurrenceCount}`;
        } else if (recurrenceEndMode === "date" && recurrenceUntil) {
          rrule += `;UNTIL=${recurrenceUntil.replace(/-/g, "")}T235959`;
        }
      }

      // New Payload Structure matching Backend
      const payload: EventCreatePayload = {
        title,
        description,
        goal,
        target_audience: targetAudience,
        organizer: organizer, // Frontend treats this as string, backend expects string
        start_time: startDT,
        end_time: endDT,
        is_all_day: isAllDay,
        recurrence_rule: rrule,
        department_id: departmentId,
        company_id: activeCompanyId, // <--- INJECTED FROM STORE
      };

      if (eventToEdit) {
        await api.patch(`/events/${eventToEdit.id}`, payload);
      } else {
        await api.post("/events/", payload);
      }

      onSuccess();
      onClose();
    } catch (err: any) {
      console.error(err);
      setError("خطا در ذخیره رویداد.");
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!eventToEdit || !canEdit || !confirm("آیا از حذف این رویداد اطمینان دارید؟")) return;
    setDeleting(true);
    try {
      await api.delete(`/events/${eventToEdit.id}`);
      onSuccess();
      onClose();
    } catch (err) {
      setError("خطا در حذف رویداد");
    } finally {
      setDeleting(false);
    }
  };

  const handleApprove = async () => {
    if (!eventToEdit) return;
    setLoading(true);
    // Note: This endpoint might need to change to /events/{id}/approve if we want specific logic
    await api.patch(`/events/${eventToEdit.id}`, { status: "approved", is_locked: true });
    onSuccess();
    onClose();
  };

  const handleReject = async () => {
    if (!eventToEdit) return;
    const reason = prompt("دلیل رد شدن:");
    if (reason) {
      setLoading(true);
      await api.patch(`/events/${eventToEdit.id}`, {
        status: "rejected",
        rejection_reason: reason,
        is_locked: false // Rejections usually unlock so proposer can fix
      });
      onSuccess();
      onClose();
    }
  };

  const getDisplayDate = (isoDate: string) => {
    if (!isoDate) return "";
    return new Date(isoDate).toLocaleDateString("fa-IR", {
      year: "numeric",
      month: "long",
      day: "numeric",
      weekday: "long",
    });
  };

  if (!isOpen) return null;

  return (
    <>
      <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6" dir="rtl">
        {/* Backdrop */}
        <div className="absolute inset-0 bg-black/60 backdrop-blur-sm transition-opacity" onClick={onClose} />

        {/* Modal Content */}
        <div className="relative w-full max-w-lg bg-[#18181b]/90 backdrop-blur-xl border border-white/10 rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh] animate-in fade-in zoom-in-95 duration-200" onClick={(e) => e.stopPropagation()}>
          
          {/* Header */}
          <div className="px-6 py-5 border-b border-white/5 flex justify-between items-center bg-white/5">
            <h3 className="text-xl font-bold text-white flex items-center gap-2">
              <CalendarDays className="text-blue-500" />
              {eventToEdit ? "ویرایش رویداد" : "برنامه‌ریزی جدید"}
              {!canEdit && (
                <span className="mr-2 text-xs bg-red-500/20 text-red-300 px-2 py-1 rounded border border-red-500/20">فقط مشاهده</span>
              )}
            </h3>
            <button onClick={onClose} className="p-2 rounded-full hover:bg-white/10 text-gray-400 hover:text-white transition-colors">
              <X size={20} />
            </button>
          </div>

          {/* Tabs */}
          <div className="flex border-b border-white/5 bg-black/20 px-2 pt-2">
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

          <form onSubmit={handleSubmit} className="p-6 overflow-y-auto flex-1 custom-scrollbar space-y-6">
            {error && (
              <div className="p-4 text-sm text-red-200 bg-red-900/30 border border-red-800 rounded-xl flex items-center gap-2">
                <Ban size={16} /> {error}
              </div>
            )}

            {/* TAB 1: GENERAL */}
            <div className={clsx("space-y-5", activeTab !== "general" && "hidden")}>
              <div className="space-y-2">
                <label className="text-xs text-gray-400 font-bold block">عنوان رویداد *</label>
                <input
                  disabled={!canEdit}
                  type="text"
                  required
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full px-4 py-3 bg-black/40 border border-white/10 rounded-xl text-white outline-none focus:border-blue-500/50 focus:ring-1 focus:ring-blue-500/50 transition-all text-lg placeholder-gray-600 disabled:opacity-50 disabled:cursor-not-allowed"
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
                      disabled={!canEdit}
                      value={departmentId || ""}
                      onChange={(e) => setDepartmentId(Number(e.target.value))}
                      className="w-full px-4 py-3 bg-black/40 border border-white/10 rounded-xl text-white outline-none focus:border-blue-500/50 appearance-none disabled:opacity-50"
                    >
                      <option value="">(انتخاب کنید)</option>
                      {renderDeptOptions(null)}
                    </select>
                    <ChevronDown className="absolute left-4 top-3.5 text-gray-500 pointer-events-none" size={16} />
                  </div>
                </div>
              )}
            </div>

            {/* TAB 2: TIMING */}
            <div className={clsx("space-y-6", activeTab !== "timing" && "hidden")}>
              {/* ... (Keep existing timing UI exactly as is) ... */}
              {/* I am preserving your Timing UI structure fully */}
              <label className="flex items-center gap-3 p-3 bg-black/20 border border-white/10 rounded-xl cursor-pointer hover:bg-white/5 transition-colors">
                <div className={clsx("w-5 h-5 rounded border flex items-center justify-center transition-colors", isAllDay ? "bg-blue-500 border-blue-500" : "border-gray-500")}>
                  {isAllDay && <CheckCircle2 size={12} className="text-white" />}
                </div>
                <input disabled={!canEdit} type="checkbox" className="hidden" checked={isAllDay} onChange={(e) => setIsAllDay(e.target.checked)} />
                <span className="text-sm text-gray-200">رویداد تمام روز</span>
              </label>

              <div className="space-y-2">
                <label className="text-xs text-gray-400 font-bold">تاریخ برگزاری</label>
                <div
                  onClick={() => canEdit && setPickerMode("date")}
                  className={clsx("w-full px-4 py-3 bg-black/40 border border-white/10 rounded-xl text-white cursor-pointer hover:border-blue-500/50 hover:bg-black/60 transition-all flex justify-between items-center", !canEdit && "opacity-50 cursor-not-allowed")}
                >
                  <span>{getDisplayDate(startDate) || "انتخاب تاریخ"}</span>
                  <CalendarDays size={18} className="text-gray-500" />
                </div>
              </div>

              {!isAllDay && (
                <div className="grid grid-cols-2 gap-4 animate-in fade-in slide-in-from-top-1">
                  <div className="space-y-2">
                    <label className="text-xs text-gray-400 font-bold">شروع</label>
                    <div onClick={() => canEdit && setShowStartTimePicker(true)} className={clsx("w-full px-4 py-3 bg-black/40 border border-white/10 rounded-xl text-white text-center cursor-pointer ltr hover:border-blue-500/50 transition-all", !canEdit && "opacity-50 cursor-not-allowed")}>
                      {toPersianDigits(startTime)}
                    </div>
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs text-gray-400 font-bold">پایان</label>
                    <div onClick={() => canEdit && setShowEndTimePicker(true)} className={clsx("w-full px-4 py-3 bg-black/40 border border-white/10 rounded-xl text-white text-center cursor-pointer ltr hover:border-blue-500/50 transition-all", !canEdit && "opacity-50 cursor-not-allowed")}>
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
                  {[
                    { id: "none", label: "خیر" },
                    { id: "daily", label: "روزانه" },
                    { id: "weekly", label: "هفتگی" },
                    { id: "monthly", label: "ماهانه" },
                  ].map((t) => (
                    <button
                      disabled={!canEdit}
                      key={t.id}
                      type="button"
                      onClick={() => setRecurrenceType(t.id)}
                      className={clsx("py-2 text-xs rounded-lg border transition-all", recurrenceType === t.id ? "bg-blue-600 border-blue-600 text-white shadow-lg shadow-blue-900/20" : "bg-black/20 border-white/10 text-gray-400 hover:bg-white/5", !canEdit && "opacity-50 cursor-not-allowed")}
                    >
                      {t.label}
                    </button>
                  ))}
                </div>

                {recurrenceType !== "none" && (
                  <div className="bg-black/20 p-4 rounded-xl border border-white/10 space-y-3 animate-in fade-in">
                    <div className="flex gap-6">
                      <label className="flex items-center gap-2 cursor-pointer group">
                        <div className={clsx("w-4 h-4 rounded-full border flex items-center justify-center", recurrenceEndMode === "count" ? "border-blue-500" : "border-gray-500")}>
                           {recurrenceEndMode === "count" && <div className="w-2 h-2 rounded-full bg-blue-500" />}
                        </div>
                        <input disabled={!canEdit} type="radio" className="hidden" checked={recurrenceEndMode === "count"} onChange={() => setRecurrenceEndMode("count")} />
                        <span className="text-xs text-gray-300 group-hover:text-white transition-colors">تعداد دفعات</span>
                      </label>
                      <label className="flex items-center gap-2 cursor-pointer group">
                         <div className={clsx("w-4 h-4 rounded-full border flex items-center justify-center", recurrenceEndMode === "date" ? "border-blue-500" : "border-gray-500")}>
                           {recurrenceEndMode === "date" && <div className="w-2 h-2 rounded-full bg-blue-500" />}
                        </div>
                        <input disabled={!canEdit} type="radio" className="hidden" checked={recurrenceEndMode === "date"} onChange={() => setRecurrenceEndMode("date")} />
                        <span className="text-xs text-gray-300 group-hover:text-white transition-colors">تا تاریخ مشخص</span>
                      </label>
                    </div>
                    
                    {recurrenceEndMode === "count" ? (
                      <input disabled={!canEdit} type="number" value={recurrenceCount} onChange={(e) => setRecurrenceCount(e.target.value)} className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-2 text-white text-sm focus:border-blue-500/50 outline-none" placeholder="مثلا: ۱۰ بار" />
                    ) : (
                      <div onClick={() => canEdit && setPickerMode("until")} className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-2.5 text-white text-sm cursor-pointer hover:border-blue-500/50 transition-colors">
                        {recurrenceUntil ? getDisplayDate(recurrenceUntil) : "انتخاب تاریخ پایان تکرار"}
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* TAB 3: DETAILS */}
            <div className={clsx("space-y-5", activeTab !== "details" && "hidden")}>
              {canEdit ? (
                <>
                  <div className="space-y-2">
                    <label className="text-xs text-gray-400 font-bold flex items-center gap-1"><Target size={14} /> مخاطبین (For)</label>
                    <MultiTagInput category="audience" value={targetAudience} onChange={setTargetAudience} placeholder="برای چه کسانی؟" />
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs text-gray-400 font-bold flex items-center gap-1"><User size={14} /> برگزار کننده (By)</label>
                    <MultiTagInput category="organizer" value={organizer} onChange={setOrganizer} placeholder="مسئول اجرا..." />
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs text-gray-400 font-bold flex items-center gap-1"><Flag size={14} /> هدف (Goal)</label>
                    <MultiTagInput category="goal" value={goal} onChange={setGoal} placeholder="هدف از برگزاری..." />
                  </div>
                </>
              ) : (
                <div className="space-y-4 text-sm text-gray-300 bg-black/20 p-4 rounded-xl border border-white/5">
                  {targetAudience && <div><strong className="text-blue-400 block mb-1">مخاطبین:</strong> {targetAudience}</div>}
                  {organizer && <div><strong className="text-emerald-400 block mb-1">برگزار کننده:</strong> {organizer}</div>}
                  {goal && <div><strong className="text-yellow-400 block mb-1">هدف:</strong> {goal}</div>}
                </div>
              )}
              <div className="space-y-2">
                <label className="text-xs text-gray-400 font-bold flex items-center gap-1"><AlignLeft size={14} /> توضیحات</label>
                <textarea disabled={!canEdit} rows={3} value={description} onChange={(e) => setDescription(e.target.value)} className="w-full px-4 py-3 bg-black/40 border border-white/10 rounded-xl text-white outline-none resize-none focus:border-blue-500/50 disabled:opacity-50" placeholder="توضیحات تکمیلی..." />
              </div>
            </div>
          </form>

          {/* Footer & Actions */}
          <div className="p-5 border-t border-white/5 bg-black/20 flex justify-between items-center backdrop-blur-md">
            <div className="flex gap-2">
              {eventToEdit && canEdit && (
                <button onClick={handleDelete} className="p-3 text-red-400 hover:bg-red-500/10 border border-transparent hover:border-red-500/20 rounded-xl transition-all" title="حذف رویداد">
                  {deleting ? <Loader2 className="animate-spin" size={20} /> : <Trash2 size={20} />}
                </button>
              )}
              {eventToEdit && eventToEdit.status === "pending" && ["manager", "superadmin", "evaluator"].includes(userRole) && (
                <>
                  <button onClick={handleApprove} className="flex items-center gap-2 px-4 py-2 bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-400 border border-emerald-600/30 rounded-xl text-xs font-bold transition-all"><Check size={14} /> تایید</button>
                  <button onClick={handleReject} className="flex items-center gap-2 px-4 py-2 bg-red-600/20 hover:bg-red-600/30 text-red-400 border border-red-600/30 rounded-xl text-xs font-bold transition-all"><Ban size={14} /> رد</button>
                </>
              )}
            </div>
            <div className="flex items-center gap-3">
              <button onClick={onClose} className="px-5 py-2.5 text-sm font-medium text-gray-300 hover:text-white hover:bg-white/5 rounded-xl transition-colors border border-transparent">{canEdit ? "انصراف" : "بستن"}</button>
              {canEdit && (
                <button onClick={handleSubmit} disabled={loading || deleting} className={clsx("px-6 py-2.5 text-sm font-bold text-white bg-blue-600 hover:bg-blue-500 rounded-xl shadow-[0_0_20px_rgba(37,99,235,0.4)] transition-all flex items-center gap-2 hover:scale-105 active:scale-95", loading && "opacity-50 cursor-not-allowed")}>
                  {loading ? <Loader2 className="animate-spin" size={16} /> : <CheckCircle2 size={18} />}
                  <span>{loading ? "در حال ثبت..." : eventToEdit ? "ذخیره تغییرات" : "ثبت نهایی"}</span>
                </button>
              )}
            </div>
          </div>

          {eventToEdit?.status === "rejected" && (eventToEdit as any).rejection_reason && (
            <div className="mx-6 mb-4 p-4 bg-red-900/10 border border-red-500/20 rounded-xl text-red-200 text-sm flex gap-2 items-start">
              <Ban size={16} className="mt-0.5 text-red-500" />
              <div><b className="text-red-400 block mb-1">علت رد شدن:</b> {(eventToEdit as any).rejection_reason}</div>
            </div>
          )}
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
        <div className="fixed inset-0 z-[200]">
            <TimePicker
              value={startTime}
              onChange={setStartTime}
              onClose={() => setShowStartTimePicker(false)}
            />
        </div>
      )}
      {showEndTimePicker && (
        <div className="fixed inset-0 z-[200]">
            <TimePicker
              value={endTime}
              onChange={setEndTime}
              onClose={() => setShowEndTimePicker(false)}
            />
        </div>
      )}
    </>
  );
}