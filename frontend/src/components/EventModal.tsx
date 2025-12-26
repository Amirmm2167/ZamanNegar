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
} from "lucide-react";
import api from "@/lib/api";
import clsx from "clsx";
import { toPersianDigits } from "@/lib/utils";
import TimePicker from "./TimePicker";
import DatePicker from "./DatePicker";
import MultiTagInput from "./MultiTagInput";
import { Department, CalendarEvent } from "@/types";

interface EventModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  initialDate?: Date;
  initialStartTime?: string; // New Prop
  initialEndTime?: string;   // New Prop
  eventToEdit?: CalendarEvent | null;
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
  const [activeTab, setActiveTab] = useState<TabType>("general");
  const [loading, setLoading] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState("");
  const [userRole, setUserRole] = useState("");
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
      const role = localStorage.getItem("role") || "viewer";
      setUserRole(role);
      if (["manager", "superadmin", "evaluator"].includes(role))
        fetchDepartments();

      // Permissions Logic
      let editable = true;
      if (eventToEdit) {
        if (role === "viewer") editable = false;
        if (role === "proposer") {
          const isOwner = eventToEdit.proposer_id === currentUserId;
          const isLocked = eventToEdit.status === "approved";
          if (!isOwner || isLocked) editable = false;
        }
      }
      setCanEdit(editable);

      // Populate Form
      if (eventToEdit) {
        setTitle(eventToEdit.title);
        setDescription(eventToEdit.description || "");
        setGoal(eventToEdit.goal || "");
        setTargetAudience((eventToEdit as any).target_audience || "");
        setOrganizer((eventToEdit as any).organizer || "");
        setDepartmentId(eventToEdit.department_id || null);

        const start = new Date(eventToEdit.start_time);
        const end = new Date(eventToEdit.end_time);
        const sIso = start.toISOString().split("T")[0];

        setStartDate(sIso);
        setStartTime(
          start.toLocaleTimeString("en-GB", {
            hour: "2-digit",
            minute: "2-digit",
          })
        );
        setEndTime(
          end.toLocaleTimeString("en-GB", {
            hour: "2-digit",
            minute: "2-digit",
          })
        );
        setIsAllDay(eventToEdit.is_all_day);

        // Recurrence Parsing
        if (eventToEdit.recurrence_rule) {
          const rule = eventToEdit.recurrence_rule;
          const freqMatch = rule.match(/FREQ=(DAILY|WEEKLY|MONTHLY)/i);
          if (freqMatch) setRecurrenceType(freqMatch[1].toLowerCase());
          
          const countMatch = rule.match(/COUNT=(\d+)/);
          if (countMatch) {
            setRecurrenceEndMode("count");
            setRecurrenceCount(countMatch[1]);
          }
          
          const untilMatch = rule.match(/UNTIL=(\d{8})/);
          if (untilMatch) {
            setRecurrenceEndMode("date");
            const raw = untilMatch[1];
            setRecurrenceUntil(
              `${raw.slice(0, 4)}-${raw.slice(4, 6)}-${raw.slice(6, 8)}`
            );
          }
        } else {
          setRecurrenceType("none");
          setRecurrenceCount("");
          setRecurrenceUntil("");
        }
      } else {
        // Create New Event
        const targetDate = initialDate || new Date();
        const isoDate = targetDate.toISOString().split("T")[0];
        setStartDate(isoDate);
        setTitle("");
        setDepartmentId(null);
        
        // Use passed props for time or fallback to defaults
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

        if (role === "viewer") setCanEdit(false);
        else setCanEdit(true);
      }
      setError("");
    }
  }, [isOpen, initialDate, initialStartTime, initialEndTime, eventToEdit, currentUserId]);

  const fetchDepartments = async () => {
    try {
      const res = await api.get<Department[]>("/departments/");
      setDepartments(res.data);
    } catch (e) {
      console.error(e);
    }
  };

  const renderDeptOptions = (parentId: number | null = null, level = 0) => {
    const children = departments.filter(
      (d) => (d.parent_id || null) === parentId
    );
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
    setLoading(true);

    try {
      const sTime = isAllDay ? "00:00" : startTime;
      const eTime = isAllDay ? "23:59" : endTime;

      const startDT = `${startDate}T${sTime}:00`;
      const endDT = `${startDate}T${eTime}:00`;

      let rrule = null;
      if (recurrenceType !== "none") {
        rrule = `FREQ=${recurrenceType.toUpperCase()}`;
        if (recurrenceEndMode === "count" && recurrenceCount) {
          rrule += `;COUNT=${recurrenceCount}`;
        } else if (recurrenceEndMode === "date" && recurrenceUntil) {
          rrule += `;UNTIL=${recurrenceUntil.replace(/-/g, "")}T235959`;
        }
      }

      const payload = {
        title,
        description,
        goal,
        target_audience: targetAudience,
        organizer: organizer,
        start_time: startDT,
        end_time: endDT,
        is_all_day: isAllDay,
        recurrence_rule: rrule,
        department_id: departmentId,
      };

      if (eventToEdit) {
        await api.patch(`/events/${eventToEdit.id}`, payload);
      } else {
        await api.post("/events/", payload);
      }

      // Save Tags
      const saveTags = (textStr: string, category: string) => {
        if (!textStr) return;
        const items = textStr
          .split(/،|,/)
          .map((s) => s.trim())
          .filter(Boolean);
        items.forEach((item) => api.post("/tags/", { text: item, category }));
      };
      saveTags(goal, "goal");
      saveTags(targetAudience, "audience");
      saveTags(organizer, "organizer");

      onSuccess();
      onClose();
    } catch (err: any) {
      setError("خطا در ذخیره رویداد.");
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (
      !eventToEdit ||
      !canEdit ||
      !confirm("آیا از حذف این رویداد اطمینان دارید؟")
    )
      return;
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
    await api.patch(`/events/${eventToEdit.id}`, { status: "approved" });
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
      <div
        className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm"
        onClick={onClose}
      >
        <div
          className="w-full max-w-lg bg-[#252526] border border-gray-700 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
          dir="rtl"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="flex items-center justify-between px-6 py-4 bg-[#2d2d2e] border-b border-gray-700">
            <h3 className="text-xl font-bold text-gray-100">
              {eventToEdit ? "ویرایش رویداد" : "برنامه‌ریزی جدید"}
              {!canEdit && (
                <span className="mr-2 text-xs bg-red-500/20 text-red-300 px-2 py-1 rounded">
                  فقط مشاهده
                </span>
              )}
            </h3>
            <button
              onClick={onClose}
              className="p-1.5 text-gray-400 hover:text-white rounded-full"
            >
              <X size={20} />
            </button>
          </div>

          {/* Tabs */}
          <div className="flex border-b border-gray-700 bg-[#1e1e1e]">
            {[
              { id: "general", label: "عمومی", icon: Type },
              { id: "timing", label: "زمان‌بندی", icon: Clock },
              { id: "details", label: "جزئیات", icon: AlignLeft },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as TabType)}
                className={clsx(
                  "flex-1 flex items-center justify-center gap-2 py-3 text-sm font-medium border-b-2 transition-colors",
                  activeTab === tab.id
                    ? "border-blue-500 text-blue-400 bg-[#252526]"
                    : "border-transparent text-gray-500"
                )}
              >
                <tab.icon size={16} /> <span>{tab.label}</span>
              </button>
            ))}
          </div>

          <form
            onSubmit={handleSubmit}
            className="p-6 overflow-y-auto flex-1 custom-scrollbar space-y-6"
          >
            {error && (
              <div className="p-3 text-sm text-red-200 bg-red-900/30 border border-red-800 rounded-lg">
                {error}
              </div>
            )}

            {/* TAB 1: GENERAL */}
            <div
              className={clsx("space-y-5", activeTab !== "general" && "hidden")}
            >
              <div className="space-y-2">
                <label className="text-xs text-gray-400 font-bold block">
                  عنوان رویداد *
                </label>
                <input
                  disabled={!canEdit}
                  type="text"
                  required
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full px-4 py-3 bg-[#1e1e1e] border border-gray-600 rounded-xl text-white outline-none focus:border-blue-500 text-lg disabled:opacity-50 disabled:cursor-not-allowed"
                  placeholder="مثلا: جلسه..."
                  autoFocus
                />
              </div>

              {["manager", "superadmin", "evaluator"].includes(userRole) && (
                <div className="space-y-2">
                  <label className="text-xs text-gray-400 font-bold">
                    دپارتمان
                  </label>
                  <select
                    disabled={!canEdit}
                    value={departmentId || ""}
                    onChange={(e) => setDepartmentId(Number(e.target.value))}
                    className="w-full px-4 py-2.5 bg-[#1e1e1e] border border-gray-600 rounded-xl text-white outline-none focus:border-blue-500 disabled:opacity-50"
                  >
                    <option value="">(انتخاب کنید)</option>
                    {renderDeptOptions(null)}
                  </select>
                </div>
              )}
            </div>

            {/* TAB 2: TIMING */}
            <div
              className={clsx("space-y-6", activeTab !== "timing" && "hidden")}
            >
              {/* All Day Toggle */}
              <label className="flex items-center gap-3 p-3 bg-[#1e1e1e] border border-gray-600 rounded-xl cursor-pointer hover:bg-[#252526] transition-colors">
                <div
                  className={clsx(
                    "w-5 h-5 rounded border flex items-center justify-center transition-colors",
                    isAllDay ? "bg-blue-500 border-blue-500" : "border-gray-500"
                  )}
                >
                  {isAllDay && (
                    <CheckCircle2 size={12} className="text-white" />
                  )}
                </div>
                <input
                  disabled={!canEdit}
                  type="checkbox"
                  className="hidden"
                  checked={isAllDay}
                  onChange={(e) => setIsAllDay(e.target.checked)}
                />
                <span className="text-sm text-gray-200">رویداد تمام روز</span>
              </label>

              {/* Date Picker */}
              <div className="space-y-2">
                <label className="text-xs text-gray-400 font-bold">
                  تاریخ برگزاری
                </label>
                <div
                  onClick={() => canEdit && setPickerMode("date")}
                  className={clsx(
                    "w-full px-4 py-3 bg-[#1e1e1e] border border-gray-600 rounded-xl text-white cursor-pointer hover:border-blue-500",
                    !canEdit && "opacity-50 cursor-not-allowed"
                  )}
                >
                  {getDisplayDate(startDate)}
                </div>
              </div>

              {/* Time Inputs (Hidden if All Day) */}
              {!isAllDay && (
                <div className="grid grid-cols-2 gap-4 animate-in fade-in slide-in-from-top-1">
                  <div className="space-y-2">
                    <label className="text-xs text-gray-400 font-bold">
                      شروع
                    </label>
                    <div
                      onClick={() => canEdit && setShowStartTimePicker(true)}
                      className={clsx(
                        "w-full px-4 py-3 bg-[#1e1e1e] border border-gray-600 rounded-xl text-white text-center cursor-pointer ltr",
                        !canEdit && "opacity-50 cursor-not-allowed"
                      )}
                    >
                      {toPersianDigits(startTime)}
                    </div>
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs text-gray-400 font-bold">
                      پایان
                    </label>
                    <div
                      onClick={() => canEdit && setShowEndTimePicker(true)}
                      className={clsx(
                        "w-full px-4 py-3 bg-[#1e1e1e] border border-gray-600 rounded-xl text-white text-center cursor-pointer ltr",
                        !canEdit && "opacity-50 cursor-not-allowed"
                      )}
                    >
                      {toPersianDigits(endTime)}
                    </div>
                  </div>
                </div>
              )}

              {/* Recurrence */}
              <div className="border-t border-gray-700 pt-4">
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
                      className={clsx(
                        "py-2 text-xs rounded-lg border",
                        recurrenceType === t.id
                          ? "bg-blue-600 border-blue-600 text-white"
                          : "bg-[#1e1e1e] border-gray-600 text-gray-400",
                        !canEdit && "opacity-50 cursor-not-allowed"
                      )}
                    >
                      {t.label}
                    </button>
                  ))}
                </div>

                {recurrenceType !== "none" && (
                  <div className="bg-[#1e1e1e] p-3 rounded-lg border border-gray-700 space-y-3">
                    <div className="flex gap-4">
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input
                          disabled={!canEdit}
                          type="radio"
                          checked={recurrenceEndMode === "count"}
                          onChange={() => setRecurrenceEndMode("count")}
                          className="accent-blue-500"
                        />
                        <span className="text-xs text-gray-300">
                          تعداد دفعات
                        </span>
                      </label>
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input
                          disabled={!canEdit}
                          type="radio"
                          checked={recurrenceEndMode === "date"}
                          onChange={() => setRecurrenceEndMode("date")}
                          className="accent-blue-500"
                        />
                        <span className="text-xs text-gray-300">
                          تا تاریخ مشخص
                        </span>
                      </label>
                    </div>
                    {recurrenceEndMode === "count" ? (
                      <input
                        disabled={!canEdit}
                        type="number"
                        value={recurrenceCount}
                        onChange={(e) => setRecurrenceCount(e.target.value)}
                        className="w-full bg-[#2d2d2e] border border-gray-600 rounded px-3 py-2 text-white text-sm"
                        placeholder="مثلا: ۱۰ بار"
                      />
                    ) : (
                      <div
                        onClick={() => canEdit && setPickerMode("until")}
                        className="w-full bg-[#2d2d2e] border border-gray-600 rounded px-3 py-2 text-white text-sm cursor-pointer"
                      >
                        {recurrenceUntil
                          ? getDisplayDate(recurrenceUntil)
                          : "انتخاب تاریخ پایان تکرار"}
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* TAB 3: DETAILS */}
            <div
              className={clsx("space-y-5", activeTab !== "details" && "hidden")}
            >
              {canEdit ? (
                <>
                  <div className="space-y-2">
                    <label className="text-xs text-gray-400 font-bold flex items-center gap-1">
                      <Target size={14} /> مخاطبین (For)
                    </label>
                    <MultiTagInput
                      category="audience"
                      value={targetAudience}
                      onChange={setTargetAudience}
                      placeholder="برای چه کسانی؟"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs text-gray-400 font-bold flex items-center gap-1">
                      <User size={14} /> برگزار کننده (By)
                    </label>
                    <MultiTagInput
                      category="organizer"
                      value={organizer}
                      onChange={setOrganizer}
                      placeholder="مسئول اجرا..."
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs text-gray-400 font-bold flex items-center gap-1">
                      <Flag size={14} /> هدف (Goal)
                    </label>
                    <MultiTagInput
                      category="goal"
                      value={goal}
                      onChange={setGoal}
                      placeholder="هدف از برگزاری..."
                    />
                  </div>
                </>
              ) : (
                <div className="space-y-4 text-sm text-gray-300">
                  {targetAudience && (
                    <div>
                      <strong className="text-gray-500 block mb-1">
                        مخاطبین:
                      </strong>{" "}
                      {targetAudience}
                    </div>
                  )}
                  {organizer && (
                    <div>
                      <strong className="text-gray-500 block mb-1">
                        برگزار کننده:
                      </strong>{" "}
                      {organizer}
                    </div>
                  )}
                  {goal && (
                    <div>
                      <strong className="text-gray-500 block mb-1">هدف:</strong>{" "}
                      {goal}
                    </div>
                  )}
                </div>
              )}
              <div className="space-y-2">
                <label className="text-xs text-gray-400 font-bold">
                  <AlignLeft size={14} /> توضیحات
                </label>
                <textarea
                  disabled={!canEdit}
                  rows={3}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full px-4 py-2 bg-[#1e1e1e] border border-gray-600 rounded-xl text-white outline-none resize-none disabled:opacity-50"
                />
              </div>
            </div>
          </form>

          {/* Footer */}
          <div className="p-4 border-t border-gray-700 bg-[#2d2d2e] flex justify-between items-center">
            <div className="flex gap-2">
              {eventToEdit && canEdit && (
                <button
                  onClick={handleDelete}
                  className="p-2 text-red-400 hover:bg-red-900/20 rounded-lg transition-colors"
                  title="حذف رویداد"
                >
                  {deleting ? (
                    <Loader2 className="animate-spin" size={20} />
                  ) : (
                    <Trash2 size={20} />
                  )}
                </button>
              )}

              {eventToEdit &&
                eventToEdit.status === "pending" &&
                ["manager", "superadmin", "evaluator"].includes(userRole) && (
                  <>
                    <button
                      onClick={handleApprove}
                      className="flex items-center gap-1 px-3 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold transition-colors"
                    >
                      <Check size={14} /> تایید
                    </button>
                    <button
                      onClick={handleReject}
                      className="flex items-center gap-1 px-3 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg text-xs font-bold transition-colors"
                    >
                      <Ban size={14} /> رد
                    </button>
                  </>
                )}
            </div>

            <div className="flex items-center gap-3">
              <button
                onClick={onClose}
                className="px-4 py-2 text-sm font-medium text-gray-300 hover:text-white hover:bg-white/5 rounded-lg transition-colors"
              >
                {canEdit ? "انصراف" : "بستن"}
              </button>
              {canEdit && (
                <button
                  onClick={handleSubmit}
                  disabled={loading || deleting}
                  className={clsx(
                    "px-6 py-2 text-sm font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-lg shadow-lg shadow-blue-900/20 transition-all flex items-center gap-2",
                    loading && "opacity-50 cursor-not-allowed"
                  )}
                >
                  {loading ? (
                    <Loader2 className="animate-spin" size={16} />
                  ) : (
                    <CheckCircle2 size={18} />
                  )}
                  <span>
                    {loading
                      ? "در حال ثبت..."
                      : eventToEdit
                      ? "ذخیره تغییرات"
                      : "ثبت نهایی"}
                  </span>
                </button>
              )}
            </div>
          </div>

          {eventToEdit?.status === "rejected" &&
            (eventToEdit as any).rejection_reason && (
              <div className="mx-6 mb-4 p-3 bg-red-900/20 border border-red-800 rounded text-red-200 text-sm">
                <b>علت رد شدن:</b> {(eventToEdit as any).rejection_reason}
              </div>
            )}
        </div>
      </div>

      {/* Pickers */}
      {pickerMode && (
        <DatePicker
          value={pickerMode === "date" ? startDate : recurrenceUntil}
          onChange={(val) => {
            if (pickerMode === "date") setStartDate(val);
            else setRecurrenceUntil(val);
          }}
          onClose={() => setPickerMode(null)}
        />
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
    </>
  );
}