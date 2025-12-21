"use client";

import { useState, useEffect } from "react";
import { X, Plus, Trash2, Edit2, Check, User as UserIcon } from "lucide-react";
import api from "@/lib/api";

interface UserData {
  id: number;
  username: string;
  display_name: string;
  role: string;
  department_id?: number | null;
}

interface Department {
  id: number;
  name: string;
}

interface UserModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function UserModal({ isOpen, onClose }: UserModalProps) {
  const [users, setUsers] = useState<UserData[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // Form State
  const [editingId, setEditingId] = useState<number | null>(null);
  const [username, setUsername] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState("viewer");
  const [departmentId, setDepartmentId] = useState<number | null>(null);

  // Roles Definition
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
    setError("");
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username || !displayName) return;

    // Validate password on create
    if (!editingId && !password) {
      setError("رمز عبور برای کاربر جدید الزامی است");
      return;
    }

    try {
      setLoading(true);
      const payload: any = { 
        username, 
        display_name: displayName, 
        role, 
        department_id: departmentId 
      };
      
      // Only send password if it's set (for updates) or required (for create)
      if (password) payload.password = password;

      if (editingId) {
        // Update
        // Remove username from payload as we usually don't allow changing IDs/Usernames easily
        delete payload.username; 
        await api.patch(`/users/${editingId}`, payload);
      } else {
        // Create
        await api.post("/users/", payload);
      }
      await fetchData();
      resetForm();
    } catch (err: any) {
      console.error(err);
      setError(err.response?.data?.detail || "خطا در ذخیره کاربر");
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (user: UserData) => {
    setEditingId(user.id);
    setUsername(user.username);
    setDisplayName(user.display_name);
    setPassword(""); // Don't fill password
    setRole(user.role);
    setDepartmentId(user.department_id || null);
  };

  const handleDelete = async (id: number) => {
    if (!confirm("آیا از حذف این کاربر اطمینان دارید؟")) return;
    try {
      setLoading(true);
      await api.delete(`/users/${id}`);
      await fetchData();
    } catch (err: any) {
      setError(err.response?.data?.detail || "خطا در حذف کاربر");
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div className="w-full max-w-2xl bg-[#252526] border border-gray-700 rounded-xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]" dir="rtl">
        
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-700 bg-[#2d2d2e]">
          <h3 className="text-lg font-bold text-gray-100">مدیریت کاربران</h3>
          <button onClick={onClose} className="p-1 text-gray-400 hover:text-white rounded-full">
            <X size={20} />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto flex-1 space-y-6">
          
          {/* Form */}
          <form onSubmit={handleSubmit} className="bg-[#1e1e1e] p-4 rounded-lg border border-gray-700 space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              
              <div>
                <label className="text-xs text-gray-500 mb-1 block">نام کاربری (انگلیسی)</label>
                <input
                  type="text"
                  dir="ltr"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  disabled={!!editingId} // Cannot change username when editing
                  className="w-full px-3 py-2 bg-[#2d2d2e] border border-gray-600 rounded text-white focus:border-blue-500 outline-none disabled:opacity-50"
                  placeholder="admin"
                />
              </div>

              <div>
                <label className="text-xs text-gray-500 mb-1 block">نام نمایشی (فارسی)</label>
                <input
                  type="text"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  className="w-full px-3 py-2 bg-[#2d2d2e] border border-gray-600 rounded text-white focus:border-blue-500 outline-none"
                  placeholder="علی حسینی"
                />
              </div>

              <div>
                <label className="text-xs text-gray-500 mb-1 block">
                  {editingId ? "رمز عبور جدید (اختیاری)" : "رمز عبور"}
                </label>
                <input
                  type="password"
                  dir="ltr"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full px-3 py-2 bg-[#2d2d2e] border border-gray-600 rounded text-white focus:border-blue-500 outline-none"
                  placeholder="******"
                />
              </div>

              <div>
                <label className="text-xs text-gray-500 mb-1 block">نقش کاربری</label>
                <select
                  value={role}
                  onChange={(e) => setRole(e.target.value)}
                  className="w-full px-3 py-2 bg-[#2d2d2e] border border-gray-600 rounded text-white focus:border-blue-500 outline-none"
                >
                  {ROLES.map(r => (
                    <option key={r.value} value={r.value}>{r.label}</option>
                  ))}
                </select>
              </div>

              <div className="md:col-span-2">
                <label className="text-xs text-gray-500 mb-1 block">دپارتمان</label>
                <select
                  value={departmentId || ""}
                  onChange={(e) => setDepartmentId(e.target.value ? Number(e.target.value) : null)}
                  className="w-full px-3 py-2 bg-[#2d2d2e] border border-gray-600 rounded text-white focus:border-blue-500 outline-none"
                >
                  <option value="">(بدون دپارتمان)</option>
                  {departments.map(d => (
                    <option key={d.id} value={d.id}>{d.name}</option>
                  ))}
                </select>
              </div>

            </div>

            {/* Buttons */}
            <div className="flex justify-end gap-2 pt-2">
              {editingId && (
                <button type="button" onClick={resetForm} className="px-3 py-2 text-sm text-gray-400 hover:text-white">
                  لغو
                </button>
              )}
              <button
                type="submit"
                disabled={loading}
                className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-md transition-colors disabled:opacity-50"
              >
                {editingId ? <Check size={16} /> : <Plus size={16} />}
                <span>{editingId ? "ذخیره تغییرات" : "افزودن کاربر"}</span>
              </button>
            </div>
          </form>

          {/* Error Message */}
          {error && <div className="text-red-400 text-sm bg-red-900/20 p-2 rounded">{error}</div>}

          {/* List */}
          <div className="space-y-2">
            <h4 className="text-sm font-bold text-gray-400">لیست کاربران</h4>
            {users.map((u) => {
              const deptName = departments.find(d => d.id === u.department_id)?.name || "---";
              const roleLabel = ROLES.find(r => r.value === u.role)?.label || u.role;

              return (
                <div key={u.id} className="flex items-center justify-between p-3 bg-[#1e1e1e] border border-gray-700 rounded-lg group hover:border-gray-600 transition-colors">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-[#2d2d2e] rounded-full text-blue-400">
                      <UserIcon size={18} />
                    </div>
                    <div>
                      <div className="font-medium text-gray-200">{u.display_name} <span className="text-xs text-gray-500">({u.username})</span></div>
                      <div className="text-xs text-gray-500 flex gap-3">
                        <span>نقش: {roleLabel}</span>
                        <span>دپارتمان: {deptName}</span>
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button onClick={() => handleEdit(u)} className="p-1.5 text-blue-400 hover:bg-blue-900/30 rounded">
                      <Edit2 size={16} />
                    </button>
                    <button onClick={() => handleDelete(u.id)} className="p-1.5 text-red-400 hover:bg-red-900/30 rounded">
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>

        </div>
      </div>
    </div>
  );
}