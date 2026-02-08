"use client";

import { useState, useEffect } from "react";
import { X, Plus, Trash2, Edit2, Check, User as UserIcon, Shield, Lock, Loader2 } from "lucide-react";
import api from "@/lib/api";
import clsx from "clsx";

interface UserData {
  id: number;
  username: string;
  display_name: string;
  role: string;
  department_id?: number | null;
  is_superadmin: boolean;
}

interface Department {
  id: number;
  name: string;
}

interface UserModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

export default function UserModal({ isOpen, onClose, onSuccess }: UserModalProps) {
  const [users, setUsers] = useState<UserData[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  const [editingId, setEditingId] = useState<number | null>(null);
  const [username, setUsername] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState("viewer");
  const [departmentId, setDepartmentId] = useState<number | null>(null);
  const [isSuperAdmin, setIsSuperAdmin] = useState(false);

  const ROLES = [
    { value: "manager", label: "مدیر" },
    { value: "evaluator", label: "ارزیاب" },
    { value: "proposer", label: "پیشنهاد دهنده" },
    { value: "viewer", label: "مشاهده‌گر" },
  ];

  useEffect(() => {
    if (isOpen) {
      fetchData();
      resetForm();
    }
  }, [isOpen]);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [usersRes, deptsRes] = await Promise.all([
        api.get<UserData[]>("/users/"),
        api.get<Department[]>("/departments/")
      ]);
      setUsers(usersRes.data);
      setDepartments(deptsRes.data);
    } catch (err) {
      console.error(err);
      setError("خطا در دریافت اطلاعات");
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setEditingId(null);
    setUsername("");
    setDisplayName("");
    setPassword("");
    setRole("viewer");
    setDepartmentId(null);
    setIsSuperAdmin(false);
    setError("");
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username || !displayName) return;
    if (!editingId && !password) {
      setError("رمز عبور برای کاربر جدید الزامی است");
      return;
    }

    try {
      setSubmitting(true);
      const payload: any = { 
        username, 
        display_name: displayName, 
        role, 
        department_id: departmentId,
        is_superadmin: isSuperAdmin
      };
      
      if (password) payload.password = password;

      if (editingId) {
        delete payload.username; 
        await api.patch(`/users/${editingId}`, payload);
      } else {
        await api.post("/users/", payload);
      }
      await fetchData();
      resetForm();
      if (onSuccess) onSuccess();
    } catch (err: any) {
      setError(err.response?.data?.detail || "خطا در ذخیره کاربر");
    } finally {
      setSubmitting(false);
    }
  };

  const handleEdit = (user: UserData) => {
    setEditingId(user.id);
    setUsername(user.username);
    setDisplayName(user.display_name);
    setPassword("");
    setRole(user.role);
    setDepartmentId(user.department_id || null);
    setIsSuperAdmin(user.is_superadmin);
  };

  const handleDelete = async (id: number) => {
    if (!confirm("آیا از حذف این کاربر اطمینان دارید؟")) return;
    try {
      setSubmitting(true);
      await api.delete(`/users/${id}`);
      await fetchData();
    } catch (err: any) {
      setError(err.response?.data?.detail || "خطا در حذف کاربر");
    } finally {
      setSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6" dir="rtl">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm transition-opacity" onClick={onClose} />
      
      <div className="relative w-full max-w-2xl bg-[#18181b]/95 backdrop-blur-xl border border-white/10 rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh] animate-in fade-in zoom-in-95 duration-200">
        
        <div className="px-6 py-5 border-b border-white/5 flex justify-between items-center bg-white/5">
          <h3 className="text-xl font-bold text-white flex items-center gap-2">
            <UserIcon className="text-blue-500" />
            مدیریت کاربران
          </h3>
          <button onClick={onClose} className="p-2 rounded-full hover:bg-white/10 text-gray-400 hover:text-white transition-colors">
            <X size={20} />
          </button>
        </div>

        <div className="p-6 overflow-y-auto flex-1 custom-scrollbar space-y-6">
          <form onSubmit={handleSubmit} className="bg-black/20 p-5 rounded-2xl border border-white/5 space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              
              <div className="space-y-2">
                <label className="text-xs text-gray-400 font-bold">نام کاربری (انگلیسی)</label>
                <div className="relative">
                   <UserIcon className="absolute left-3 top-3 text-gray-600" size={16} />
                   <input
                    type="text"
                    dir="ltr"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    disabled={!!editingId || submitting}
                    className="w-full px-4 py-2.5 bg-[#0a0c10] border border-white/10 rounded-xl text-white focus:border-blue-500/50 outline-none text-left pl-10 disabled:opacity-50"
                    placeholder="admin"
                   />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-xs text-gray-400 font-bold">نام نمایشی (فارسی)</label>
                <input
                  type="text"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  disabled={submitting}
                  className="w-full px-4 py-2.5 bg-[#0a0c10] border border-white/10 rounded-xl text-white focus:border-blue-500/50 outline-none"
                  placeholder="علی حسینی"
                />
              </div>

              <div className="space-y-2">
                <label className="text-xs text-gray-400 font-bold">
                  {editingId ? "رمز عبور جدید (اختیاری)" : "رمز عبور"}
                </label>
                <div className="relative">
                   <Lock className="absolute left-3 top-3 text-gray-600" size={16} />
                   <input
                    type="password"
                    dir="ltr"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    disabled={submitting}
                    className="w-full px-4 py-2.5 bg-[#0a0c10] border border-white/10 rounded-xl text-white focus:border-blue-500/50 outline-none text-left pl-10"
                    placeholder="••••••"
                   />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-xs text-gray-400 font-bold">نقش کاربری</label>
                <select
                  value={role}
                  onChange={(e) => setRole(e.target.value)}
                  disabled={submitting}
                  className="w-full px-4 py-2.5 bg-[#0a0c10] border border-white/10 rounded-xl text-white focus:border-blue-500/50 outline-none appearance-none"
                >
                  {ROLES.map(r => (
                    <option key={r.value} value={r.value}>{r.label}</option>
                  ))}
                </select>
              </div>

              <div className="md:col-span-2 space-y-2">
                <label className="text-xs text-gray-400 font-bold">دپارتمان</label>
                <select
                  value={departmentId || ""}
                  onChange={(e) => setDepartmentId(e.target.value ? Number(e.target.value) : null)}
                  disabled={submitting}
                  className="w-full px-4 py-2.5 bg-[#0a0c10] border border-white/10 rounded-xl text-white focus:border-blue-500/50 outline-none appearance-none"
                >
                  <option value="">(بدون دپارتمان)</option>
                  {departments.map(d => (
                    <option key={d.id} value={d.id}>{d.name}</option>
                  ))}
                </select>
              </div>

              <div className="md:col-span-2">
                 <label className="flex items-center gap-3 cursor-pointer group">
                    <div className={clsx("w-5 h-5 rounded border flex items-center justify-center transition-colors", isSuperAdmin ? "bg-purple-600 border-purple-600" : "border-gray-600 group-hover:border-gray-400")}>
                        {isSuperAdmin && <Check size={14} className="text-white" />}
                    </div>
                    <input type="checkbox" className="hidden" checked={isSuperAdmin} onChange={(e) => setIsSuperAdmin(e.target.checked)} />
                    <div className="flex flex-col">
                        <span className="text-sm font-bold text-gray-200">دسترسی مدیر ارشد (Super Admin)</span>
                        <span className="text-[10px] text-gray-500">دسترسی کامل به تمام تنظیمات سیستم</span>
                    </div>
                 </label>
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-4 border-t border-white/5">
              {editingId && (
                <button type="button" onClick={resetForm} className="px-4 py-2 text-sm text-gray-400 hover:text-white transition-colors">
                  انصراف
                </button>
              )}
              <button
                type="submit"
                disabled={submitting}
                className="flex items-center gap-2 px-6 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl font-bold transition-all shadow-lg shadow-blue-600/20 disabled:opacity-50"
              >
                {submitting ? <Loader2 className="animate-spin" size={18} /> : (editingId ? <Check size={18} /> : <Plus size={18} />)}
                <span>{editingId ? "ذخیره تغییرات" : "افزودن کاربر"}</span>
              </button>
            </div>
          </form>

          {error && (
             <div className="p-3 text-sm text-red-300 bg-red-500/10 border border-red-500/20 rounded-xl flex items-center gap-2">
                <Shield size={16} /> {error}
             </div>
          )}

          <div className="space-y-3">
            <h4 className="text-sm font-bold text-gray-400 px-1">لیست کاربران سیستم</h4>
            {loading ? (
                <div className="text-center py-8 text-gray-600"><Loader2 className="animate-spin mx-auto mb-2" />در حال دریافت...</div>
            ) : (
                <div className="grid gap-2">
                    {users.map((u) => {
                      const deptName = departments.find(d => d.id === u.department_id)?.name || "---";
                      const roleLabel = ROLES.find(r => r.value === u.role)?.label || u.role;

                      return (
                        <div key={u.id} className="flex items-center justify-between p-3 bg-[#0a0c10] border border-white/5 rounded-xl group hover:border-white/10 transition-colors">
                          <div className="flex items-center gap-4">
                            <div className={clsx("w-10 h-10 rounded-full flex items-center justify-center text-white font-bold", u.is_superadmin ? "bg-purple-600/20 text-purple-400" : "bg-blue-600/20 text-blue-400")}>
                              {u.display_name.charAt(0)}
                            </div>
                            <div>
                              <div className="font-bold text-gray-200 flex items-center gap-2">
                                  {u.display_name}
                                  {u.is_superadmin && <Shield size={12} className="text-purple-400" />}
                              </div>
                              <div className="text-xs text-gray-500 flex gap-3 mt-0.5">
                                <span className="font-mono text-gray-600">@{u.username}</span>
                                <span className="w-1 h-1 rounded-full bg-gray-700 self-center" />
                                <span>{roleLabel}</span>
                                <span className="w-1 h-1 rounded-full bg-gray-700 self-center" />
                                <span>{deptName}</span>
                              </div>
                            </div>
                          </div>
                          <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                            <button onClick={() => handleEdit(u)} className="p-2 text-blue-400 hover:bg-blue-500/10 rounded-lg transition-colors">
                              <Edit2 size={16} />
                            </button>
                            <button onClick={() => handleDelete(u.id)} className="p-2 text-red-400 hover:bg-red-500/10 rounded-lg transition-colors">
                              <Trash2 size={16} />
                            </button>
                          </div>
                        </div>
                      );
                    })}
                </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}