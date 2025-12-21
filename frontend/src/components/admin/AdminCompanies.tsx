"use client";

import { useState, useEffect } from "react";
import api from "@/lib/api";
import { Building, UserPlus, Users, X, Edit2, Trash2 } from "lucide-react";
import { toPersianDigits } from "@/lib/utils";

// --- Types ---
interface Company {
  id: number;
  name: string;
}

interface Department {
  id: number;
  name: string;
}

interface UserData {
  id: number;
  username: string;
  display_name: string;
  role: string;
  company_id?: number;
  department_id?: number | null;
}

export default function AdminCompanies() {
  const [companies, setCompanies] = useState<Company[]>([]);
  const [users, setUsers] = useState<UserData[]>([]);
  const [loading, setLoading] = useState(false);

  // Modal State
  const [isUserModalOpen, setIsUserModalOpen] = useState(false);
  const [targetCompanyId, setTargetCompanyId] = useState<number | null>(null);
  
  // Edit State
  const [editingUserId, setEditingUserId] = useState<number | null>(null);
  const [companyDepts, setCompanyDepts] = useState<Department[]>([]);

  // Create Company Form
  const [newCompanyName, setNewCompanyName] = useState("");
  
  // User Form
  const [uUsername, setUUsername] = useState("");
  const [uDisplayName, setUDisplayName] = useState("");
  const [uPassword, setUPassword] = useState("");
  const [uRole, setURole] = useState("manager");
  const [uDeptId, setUDeptId] = useState<number | null>(null);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [compRes, usersRes] = await Promise.all([
        api.get<Company[]>("/superadmin/companies"),
        api.get<UserData[]>("/users/")
      ]);
      setCompanies(compRes.data);
      setUsers(usersRes.data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const fetchCompanyDepts = async (companyId: number) => {
    try {
      // Pass company_id param to get depts for THIS company
      const res = await api.get<Department[]>(`/departments/?company_id=${companyId}`);
      setCompanyDepts(res.data);
    } catch (e) {
      console.error(e);
      setCompanyDepts([]);
    }
  };

  // --- Company Actions ---
  const handleCreateCompany = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCompanyName) return;
    try {
      await api.post("/superadmin/companies", { name: newCompanyName });
      setNewCompanyName("");
      fetchData();
    } catch (err) {
      alert("خطا در ایجاد شرکت");
    }
  };

  // --- User Modal Helpers ---
  const openUserModal = async (companyId: number, userToEdit?: UserData) => {
    setTargetCompanyId(companyId);
    
    // Fetch depts for this company immediately
    await fetchCompanyDepts(companyId);

    if (userToEdit) {
      setEditingUserId(userToEdit.id);
      setUUsername(userToEdit.username);
      setUDisplayName(userToEdit.display_name);
      setUPassword(""); // Empty for no change
      setURole(userToEdit.role);
      setUDeptId(userToEdit.department_id || null);
    } else {
      setEditingUserId(null);
      setUUsername("");
      setUDisplayName("");
      setUPassword("");
      setURole("manager");
      setUDeptId(null);
    }
    setIsUserModalOpen(true);
  };

  const handleSaveUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!targetCompanyId) return;

    try {
      if (editingUserId) {
        // UPDATE
        const payload: any = {
          display_name: uDisplayName,
          role: uRole,
          department_id: uDeptId
        };
        if (uPassword) payload.password = uPassword;
        
        await api.patch(`/users/${editingUserId}`, payload);
      } else {
        // CREATE
        await api.post("/superadmin/users", {
          username: uUsername,
          display_name: uDisplayName,
          password: uPassword,
          role: uRole,
          company_id: targetCompanyId,
          department_id: uDeptId
        });
      }
      setIsUserModalOpen(false);
      fetchData();
    } catch (err: any) {
      alert(err.response?.data?.detail || "خطا در ذخیره کاربر");
    }
  };

  const handleDeleteUser = async (userId: number) => {
    if(!confirm("حذف کاربر؟")) return;
    try {
      await api.delete(`/users/${userId}`);
      fetchData();
    } catch(err) {
      alert("خطا در حذف");
    }
  };

  return (
    <div className="space-y-8">
      {/* Create Company */}
      <div className="bg-[#252526] p-6 rounded-xl border border-gray-700">
        <h2 className="text-xl font-bold mb-4 flex items-center gap-2 text-gray-100">
          <Building className="text-blue-500" />
          تعریف شرکت جدید
        </h2>
        <form onSubmit={handleCreateCompany} className="flex gap-4 items-end">
          <div className="flex-1">
            <label className="text-xs text-gray-500 block mb-1">نام شرکت / سازمان</label>
            <input 
              type="text" 
              value={newCompanyName}
              onChange={(e) => setNewCompanyName(e.target.value)}
              className="w-full bg-[#1e1e1e] border border-gray-600 rounded-lg px-4 py-2 text-white focus:border-blue-500 outline-none"
              placeholder="مثلا: شرکت فولاد..."
            />
          </div>
          <button type="submit" className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-lg font-medium transition-colors">
            ثبت شرکت
          </button>
        </form>
      </div>

      {/* Companies List */}
      <div className="grid grid-cols-1 gap-6">
        {companies.map((comp) => {
          const companyUsers = users.filter(u => u.company_id === comp.id);
          
          return (
            <div key={comp.id} className="bg-[#252526] rounded-xl border border-gray-700 overflow-hidden">
              <div className="bg-[#2d2d2e] px-6 py-4 flex justify-between items-center border-b border-gray-700">
                <div className="flex items-center gap-3">
                  <div className="bg-blue-500/20 p-2 rounded-lg text-blue-400">
                    <Building size={20} />
                  </div>
                  <div>
                    <h3 className="font-bold text-lg text-white">{comp.name}</h3>
                    <span className="text-xs text-gray-500">شناسه: {toPersianDigits(comp.id)}</span>
                  </div>
                </div>
                <button 
                  onClick={() => openUserModal(comp.id)}
                  className="flex items-center gap-2 text-sm bg-emerald-600 hover:bg-emerald-700 text-white px-3 py-1.5 rounded-md transition-colors"
                >
                  <UserPlus size={16} />
                  افزودن کاربر
                </button>
              </div>

              <div className="p-4">
                {companyUsers.length === 0 ? (
                  <p className="text-gray-500 text-sm text-center py-2">کاربری تعریف نشده است.</p>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                    {companyUsers.map(user => (
                      <div key={user.id} className="flex items-center justify-between p-3 bg-[#1e1e1e] rounded-lg border border-gray-800 group">
                        <div className="flex items-center gap-3 overflow-hidden">
                          <div className="bg-gray-800 p-2 rounded-full text-gray-400">
                            <Users size={16} />
                          </div>
                          <div className="truncate">
                            <div className="font-bold text-sm text-gray-200 truncate">{user.display_name}</div>
                            <div className="text-xs text-gray-500 flex gap-2">
                              <span>{user.username}</span>
                              <span className="text-blue-400">({user.role})</span>
                            </div>
                          </div>
                        </div>
                        
                        {/* Edit/Delete Actions */}
                        <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button onClick={() => openUserModal(comp.id, user)} className="p-1.5 text-blue-400 hover:bg-blue-900/30 rounded">
                            <Edit2 size={14} />
                          </button>
                          <button onClick={() => handleDeleteUser(user.id)} className="p-1.5 text-red-400 hover:bg-red-900/30 rounded">
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* User Modal */}
      {isUserModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
          <div className="w-full max-w-md bg-[#252526] border border-gray-700 rounded-xl shadow-2xl p-6" dir="rtl">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-lg font-bold text-white">
                {editingUserId ? "ویرایش کاربر" : "افزودن کاربر جدید"}
              </h3>
              <button onClick={() => setIsUserModalOpen(false)}><X className="text-gray-400 hover:text-white" /></button>
            </div>
            
            <form onSubmit={handleSaveUser} className="space-y-4">
              <div>
                <label className="block text-xs text-gray-500 mb-1">نام کاربری (لاتین)</label>
                <input 
                  dir="ltr"
                  type="text" 
                  value={uUsername}
                  onChange={e => setUUsername(e.target.value)}
                  disabled={!!editingUserId} // Locked on edit
                  className="w-full bg-[#1e1e1e] border border-gray-600 rounded px-3 py-2 text-white outline-none focus:border-blue-500 disabled:opacity-50"
                />
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1">نام نمایشی (فارسی)</label>
                <input 
                  type="text" 
                  required
                  value={uDisplayName}
                  onChange={e => setUDisplayName(e.target.value)}
                  className="w-full bg-[#1e1e1e] border border-gray-600 rounded px-3 py-2 text-white outline-none focus:border-blue-500"
                />
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1">
                  {editingUserId ? "رمز عبور جدید (اختیاری)" : "رمز عبور"}
                </label>
                <input 
                  dir="ltr"
                  type="password" 
                  value={uPassword}
                  onChange={e => setUPassword(e.target.value)}
                  className="w-full bg-[#1e1e1e] border border-gray-600 rounded px-3 py-2 text-white outline-none focus:border-blue-500"
                />
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs text-gray-500 mb-1">نقش</label>
                  <select 
                    value={uRole}
                    onChange={e => setURole(e.target.value)}
                    className="w-full bg-[#1e1e1e] border border-gray-600 rounded px-3 py-2 text-white outline-none focus:border-blue-500"
                  >
                    <option value="manager">مدیر</option>
                    <option value="evaluator">ارزیاب</option>
                    <option value="proposer">پیشنهاد دهنده</option>
                    <option value="viewer">مشاهده‌گر</option>
                  </select>
                </div>
                
                <div>
                  <label className="block text-xs text-gray-500 mb-1">دپارتمان</label>
                  <select 
                    value={uDeptId || ""}
                    onChange={e => setUDeptId(e.target.value ? Number(e.target.value) : null)}
                    className="w-full bg-[#1e1e1e] border border-gray-600 rounded px-3 py-2 text-white outline-none focus:border-blue-500"
                  >
                    <option value="">(بدون دپارتمان)</option>
                    {companyDepts.map(d => (
                      <option key={d.id} value={d.id}>{d.name}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="pt-4 flex justify-end gap-3">
                <button type="button" onClick={() => setIsUserModalOpen(false)} className="px-4 py-2 text-gray-400 hover:text-white text-sm">انصراف</button>
                <button type="submit" className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-lg text-sm font-bold">
                  {editingUserId ? "ذخیره تغییرات" : "ثبت کاربر"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}