"use client";

import { useState, useEffect } from "react";
import { X, Plus, Trash2, Edit2, Check, Palette } from "lucide-react";
import api from "@/lib/api";
import clsx from "clsx";

interface Department {
  id: number;
  name: string;
  color: string;
  parent_id?: number | null;
}

interface DepartmentModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function DepartmentModal({ isOpen, onClose }: DepartmentModalProps) {
  const [departments, setDepartments] = useState<Department[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // Form State
  const [editingId, setEditingId] = useState<number | null>(null);
  const [name, setName] = useState("");
  const [color, setColor] = useState("#cccccc");
  const [parentId, setParentId] = useState<number | null>(null);

  // Fetch data when modal opens
  useEffect(() => {
    if (isOpen) {
      fetchDepartments();
      resetForm();
    }
  }, [isOpen]);

  const fetchDepartments = async () => {
    try {
      setLoading(true);
      const res = await api.get<Department[]>("/departments/");
      setDepartments(res.data);
    } catch (err) {
      console.error(err);
      setError("خطا در دریافت لیست دپارتمان‌ها");
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setEditingId(null);
    setName("");
    setColor("#cccccc");
    setParentId(null);
    setError("");
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    try {
      setLoading(true);
      if (editingId) {
        // Update
        await api.patch(`/departments/${editingId}`, { name, color, parent_id: parentId });
      } else {
        // Create
        await api.post("/departments/", { name, color, parent_id: parentId });
      }
      await fetchDepartments();
      resetForm();
    } catch (err) {
      console.error(err);
      setError("خطا در ذخیره دپارتمان");
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (dept: Department) => {
    setEditingId(dept.id);
    setName(dept.name);
    setColor(dept.color);
    setParentId(dept.parent_id || null);
  };

  const handleDelete = async (id: number) => {
    if (!confirm("آیا از حذف این دپارتمان اطمینان دارید؟")) return;
    try {
      setLoading(true);
      await api.delete(`/departments/${id}`);
      await fetchDepartments();
    } catch (err) {
      setError("خطا در حذف دپارتمان");
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div className="w-full max-w-lg bg-[#252526] border border-gray-700 rounded-xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]" dir="rtl">
        
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-700 bg-[#2d2d2e]">
          <h3 className="text-lg font-bold text-gray-100">مدیریت دپارتمان‌ها</h3>
          <button onClick={onClose} className="p-1 text-gray-400 hover:text-white rounded-full">
            <X size={20} />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto flex-1 space-y-6">
          
          {/* Form */}
          <form onSubmit={handleSubmit} className="bg-[#1e1e1e] p-4 rounded-lg border border-gray-700 space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Name */}
              <div>
                <label className="text-xs text-gray-500 mb-1 block">نام دپارتمان</label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full px-3 py-2 bg-[#2d2d2e] border border-gray-600 rounded text-white focus:border-blue-500 outline-none"
                  placeholder="مثلا: فنی"
                />
              </div>
              
              {/* Parent */}
              <div>
                <label className="text-xs text-gray-500 mb-1 block">زیرمجموعه (والد)</label>
                <select
                  value={parentId || ""}
                  onChange={(e) => setParentId(e.target.value ? Number(e.target.value) : null)}
                  className="w-full px-3 py-2 bg-[#2d2d2e] border border-gray-600 rounded text-white focus:border-blue-500 outline-none"
                >
                  <option value="">(بدون والد - اصلی)</option>
                  {departments
                    .filter(d => d.id !== editingId) // Cannot set self as parent
                    .map(d => (
                      <option key={d.id} value={d.id}>{d.name}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Color & Buttons */}
            <div className="flex items-end gap-3">
              <div className="flex-1">
                <label className="text-xs text-gray-500 mb-1 block">رنگ</label>
                <div className="flex items-center gap-2">
                  <input
                    type="color"
                    value={color}
                    onChange={(e) => setColor(e.target.value)}
                    className="h-9 w-12 bg-transparent border-none cursor-pointer"
                  />
                  <span className="text-sm text-gray-400 font-mono">{color}</span>
                </div>
              </div>

              <div className="flex gap-2">
                {editingId && (
                  <button
                    type="button"
                    onClick={resetForm}
                    className="px-3 py-2 text-sm text-gray-400 hover:text-white"
                  >
                    لغو
                  </button>
                )}
                <button
                  type="submit"
                  disabled={loading || !name}
                  className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-md transition-colors disabled:opacity-50"
                >
                  {editingId ? <Check size={16} /> : <Plus size={16} />}
                  <span>{editingId ? "ذخیره تغییرات" : "افزودن"}</span>
                </button>
              </div>
            </div>
          </form>

          {/* Error Message */}
          {error && <div className="text-red-400 text-sm bg-red-900/20 p-2 rounded">{error}</div>}

          {/* List */}
          <div className="space-y-2">
            <h4 className="text-sm font-bold text-gray-400">لیست موجود</h4>
            {loading && departments.length === 0 ? (
              <p className="text-gray-500 text-sm">در حال بارگذاری...</p>
            ) : departments.length === 0 ? (
              <p className="text-gray-500 text-sm">دپارتمانی یافت نشد.</p>
            ) : (
              departments.map((dept) => (
                <div key={dept.id} className="flex items-center justify-between p-3 bg-[#1e1e1e] border border-gray-700 rounded-lg group hover:border-gray-600 transition-colors">
                  <div className="flex items-center gap-3">
                    <div className="w-4 h-4 rounded-full" style={{ backgroundColor: dept.color }}></div>
                    <div>
                      <div className="font-medium text-gray-200">{dept.name}</div>
                      {dept.parent_id && (
                        <div className="text-xs text-gray-500">
                          زیرمجموعه: {departments.find(d => d.id === dept.parent_id)?.name}
                        </div>
                      )}
                    </div>
                  </div>
                  
                  <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button onClick={() => handleEdit(dept)} className="p-1.5 text-blue-400 hover:bg-blue-900/30 rounded">
                      <Edit2 size={16} />
                    </button>
                    <button onClick={() => handleDelete(dept.id)} className="p-1.5 text-red-400 hover:bg-red-900/30 rounded">
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>

        </div>
      </div>
    </div>
  );
}