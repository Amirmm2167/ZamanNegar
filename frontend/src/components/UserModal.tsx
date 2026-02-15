"use client";

import { useState, useEffect } from "react";
import { UserPlus, Trash2, Check, User as UserIcon, Loader2, Phone, Ghost, Search, Building2, Save, Settings } from "lucide-react";
import api from "@/lib/api";
import { toEnglishDigits } from "@/lib/utils"; 
import clsx from "clsx";
import ModalWrapper from "@/components/ui/ModalWrapper"; 

interface UserData {
  id: number;
  username: string;
  display_name: string;
  phone_number: string;
  role: string;
  department_id?: number | null;
  is_superadmin: boolean;
  status: string;
  type: "real" | "ghost";
}

interface Department {
  id: number;
  name: string;
  company_id: number;
}

interface Company {
  id: number;
  name: string;
}

interface UserModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
  userRole?: 'manager' | 'superadmin';
  defaultCompanyId?: number | null;
  userToEdit?: UserData | null;
  initialView?: 'list' | 'add';
}

export default function UserModal({ 
  isOpen, onClose, onSuccess, userRole = 'manager', 
  defaultCompanyId = null, userToEdit = null, initialView = 'list' 
}: UserModalProps) {
  
  const [users, setUsers] = useState<UserData[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [loading, setLoading] = useState(false);
  
  const [view, setView] = useState<'list' | 'add' | 'edit'>(initialView);
  const [addStep, setAddStep] = useState<'search' | 'form'>('search');
  
  const [phoneQuery, setPhoneQuery] = useState("");
  const [isSearching, setIsSearching] = useState(false);
  const [searchResult, setSearchResult] = useState<any>(null);
  
  const [targetRole, setTargetRole] = useState("viewer");
  const [targetDept, setTargetDept] = useState<number | null>(null);
  const [adminCompanyId, setAdminCompanyId] = useState<number | null>(defaultCompanyId);
  const [ghostName, setGhostName] = useState("");
  const [adminUsername, setAdminUsername] = useState("");
  const [adminPassword, setAdminPassword] = useState("");
  const [adminIsSuper, setAdminIsSuper] = useState(false);

  const ROLES = [
    { value: "manager", label: "مدیر" },
    { value: "evaluator", label: "ارزیاب" },
    { value: "proposer", label: "پیشنهاد دهنده" },
    { value: "viewer", label: "مشاهده‌گر" },
  ];

  useEffect(() => {
    if (isOpen) {
      if (userToEdit) {
        initEditMode(userToEdit);
      } else {
        if (!userToEdit && initialView === 'add') setView('add');
        resetForm();
      }
      
      if (view !== 'list') {
          fetchDropdowns();
      } else {
          fetchData();
      }
    }
  }, [isOpen, userToEdit]);

  const initEditMode = (user: UserData) => {
    setView('edit');
    setGhostName(user.display_name);
    setAdminUsername(user.username);
    setPhoneQuery(user.phone_number);
    setTargetRole(user.role);
    setTargetDept(user.department_id || null);
    setAdminIsSuper(user.is_superadmin);
    setAdminCompanyId(defaultCompanyId); 
    fetchDropdowns();
  };

  const resetForm = () => {
    if (!userToEdit && initialView === 'add') setView('add'); 
    setAddStep('search');
    setPhoneQuery("");
    setSearchResult(null);
    setTargetRole("viewer");
    setTargetDept(null);
    setAdminCompanyId(defaultCompanyId);
    setGhostName("");
    setAdminUsername("");
    setAdminPassword("");
    setAdminIsSuper(false);
  };

  // Fixed fetch logic to avoid TS errors
  const fetchDropdowns = async () => {
      try {
          const deptsRes = await api.get<Department[]>("/departments/");
          setDepartments(deptsRes.data);
          
          if (userRole === 'superadmin') {
              const compsRes = await api.get<Company[]>("/companies/");
              setCompanies(compsRes.data);
          }
      } catch(e) { console.error(e); }
  };

  const fetchData = async () => {
    try {
      setLoading(true);
      const usersRes = await api.get<UserData[]>("/users/");
      setUsers(usersRes.data);
      await fetchDropdowns();
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (phoneQuery.length < 4) return;
    setIsSearching(true);
    try {
      const clean = toEnglishDigits(phoneQuery);
      const { data } = await api.get(`/users/lookup?phone=${clean}`);
      setSearchResult(data);
      setAddStep('form');
    } catch (err) {
      alert("خطا در جستجو");
    } finally {
      setIsSearching(false);
    }
  };

  const finishAction = async () => {
    if (onSuccess) onSuccess();
    if (initialView === 'add' || userToEdit) {
        onClose();
    } else {
        resetForm();
        fetchData();
    }
  };

  const handleInvite = async () => {
    try {
      await api.post("/users/invite", {
        phone_number: searchResult?.phone_number || toEnglishDigits(phoneQuery),
        display_name_alias: ghostName || undefined,
        department_id: targetDept,
        role: targetRole,
        company_id: adminCompanyId
      });
      finishAction();
    } catch (err: any) {
      alert(err.response?.data?.detail || "خطا در ارسال دعوت‌نامه");
    }
  };

  const handleAdminCreate = async () => {
    try {
      await api.post("/users/", {
        username: adminUsername,
        password: adminPassword,
        display_name: ghostName, 
        phone_number: phoneQuery,
        is_superadmin: adminIsSuper,
        role: targetRole,
        company_id: adminCompanyId,
        department_id: targetDept
      });
      finishAction();
    } catch (err: any) {
      alert(err.response?.data?.detail || "خطا در ایجاد کاربر");
    }
  };

  const handleUpdate = async () => {
    if (!userToEdit) return;
    try {
      const payload: any = {
        display_name: ghostName,
        role: targetRole,
        department_id: targetDept,
        is_superadmin: adminIsSuper
      };
      if (adminPassword) payload.password = adminPassword;

      await api.patch(`/users/${userToEdit.id}`, payload);
      finishAction();
    } catch (err: any) {
      alert(err.response?.data?.detail || "خطا در ویرایش کاربر");
    }
  };

  const handleDelete = async (id: number, type: "real" | "ghost") => {
    if (!confirm("آیا اطمینان دارید؟")) return;
    try {
      await api.delete(`/users/${id}?type=${type}`);
      await fetchData();
      if (onSuccess) onSuccess();
    } catch (err) {
      alert("خطا در حذف");
    }
  };

  const activeCompanyId = adminCompanyId || defaultCompanyId;
  const availableDepartments = activeCompanyId
    ? departments.filter(d => d.company_id === activeCompanyId)
    : departments;

  return (
    <ModalWrapper
      isOpen={isOpen}
      onClose={onClose}
      size="md"
      title={
        <>
          <UserIcon className="text-blue-500" />
          {view === 'edit' ? 'ویرایش کاربر' : (view === 'add' ? 'افزودن عضو جدید' : 'مدیریت اعضا')}
        </>
      }
    >
        {/* VIEW 1: LIST */}
        {view === 'list' && !userToEdit && (
            <div className="flex flex-col h-full">
                <div className="pb-4 border-b border-white/5 mb-4">
                    <button onClick={() => setView('add')} className="w-full py-3 bg-blue-600 hover:bg-blue-500 text-white rounded-xl font-bold flex items-center justify-center gap-2 transition-all">
                        <UserPlus size={18} /> افزودن عضو جدید
                    </button>
                </div>
                <div className="flex-1 overflow-y-auto custom-scrollbar space-y-2 max-h-[400px]">
                    {loading ? (
                        <div className="text-center py-10 text-gray-500"><Loader2 className="animate-spin mx-auto mb-2"/>در حال بارگذاری...</div>
                    ) : users.length === 0 ? (
                        <div className="text-center py-10 text-gray-500 border border-dashed border-white/10 rounded-2xl">لیست خالی است</div>
                    ) : (
                        users.map(u => (
                            <div key={`${u.type}-${u.id}`} className="flex items-center justify-between p-3 bg-[#0a0c10] border border-white/5 rounded-xl group hover:border-white/10 transition-colors">
                                <div className="flex items-center gap-3">
                                    <div className={clsx("w-10 h-10 rounded-full flex items-center justify-center text-white font-bold", u.type === 'ghost' ? "bg-white/10 text-gray-400" : "bg-blue-600/20 text-blue-400")}>
                                        {u.type === 'ghost' ? <Ghost size={18}/> : u.display_name?.[0]}
                                    </div>
                                    <div>
                                        <div className="font-bold text-gray-200 flex items-center gap-2">
                                            {u.display_name}
                                            {u.type === 'ghost' && <span className="text-[10px] bg-white/10 px-1.5 rounded text-gray-400">دعوت شده</span>}
                                        </div>
                                        <div className="text-xs text-gray-500 flex gap-2">
                                            <span className="font-mono dir-ltr">{u.phone_number}</span>
                                            <span>•</span>
                                            <span>{ROLES.find(r => r.value === u.role)?.label}</span>
                                        </div>
                                    </div>
                                </div>
                                <button onClick={() => handleDelete(u.id, u.type)} className="p-2 text-red-400 hover:bg-red-500/10 rounded-lg opacity-0 group-hover:opacity-100 transition-all">
                                    <Trash2 size={16} />
                                </button>
                            </div>
                        ))
                    )}
                </div>
            </div>
        )}

        {/* VIEW 2: SEARCH */}
        {view === 'add' && addStep === 'search' && (
            <div className="space-y-4 animate-in fade-in slide-in-from-right-4 pt-4">
                <h4 className="text-gray-400 text-sm">شماره موبایل کاربر را وارد کنید:</h4>
                <form onSubmit={handleSearch} className="relative">
                    <input 
                        autoFocus
                        type="tel" 
                        dir="ltr"
                        placeholder="0912..."
                        className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-white pl-10 text-lg font-mono placeholder:text-gray-600 outline-none focus:border-blue-500"
                        value={phoneQuery}
                        onChange={(e) => setPhoneQuery(e.target.value)}
                    />
                    <Phone className="absolute left-3 top-4 text-gray-500" size={20} />
                    <button type="submit" disabled={isSearching || phoneQuery.length < 4} className="mt-4 w-full py-3 bg-blue-600 hover:bg-blue-500 text-white rounded-xl font-bold flex items-center justify-center gap-2">
                        {isSearching ? <Loader2 className="animate-spin" /> : <Search size={18} />} بررسی وضعیت
                    </button>
                </form>
                <button onClick={() => initialView === 'add' ? onClose() : resetForm()} className="w-full py-2 text-gray-500 hover:text-white">انصراف</button>
            </div>
        )}

        {/* VIEW 3: FORM */}
        {(view === 'edit' || (view === 'add' && addStep === 'form')) && (
            <div className="space-y-6 animate-in fade-in slide-in-from-right-4 pt-4">
                {searchResult && (
                    <div className={clsx("p-4 rounded-xl border flex items-center gap-4", searchResult.found ? "bg-emerald-500/10 border-emerald-500/20" : "bg-amber-500/10 border-amber-500/20")}>
                        <div className={clsx("p-3 rounded-full", searchResult.found ? "bg-emerald-500/20 text-emerald-400" : "bg-amber-500/20 text-amber-400")}>
                            {searchResult.found ? <Check size={24}/> : <Ghost size={24}/>}
                        </div>
                        <div>
                            <div className="font-bold text-white">{searchResult.found ? searchResult.display_name : "کاربر یافت نشد"}</div>
                            <div className="text-xs text-gray-400">{searchResult.found ? "این کاربر در سیستم عضو است" : "می‌توانید به عنوان مهمان دعوت کنید"}</div>
                        </div>
                    </div>
                )}

                <div className="space-y-4">
                    {/* Admin Company Selector */}
                    {userRole === 'superadmin' && (
                        <div className="space-y-2">
                            <label className="text-xs text-gray-400 font-bold flex items-center gap-1"><Building2 size={14}/> سازمان</label>
                            <select value={adminCompanyId || ""} onChange={e => { setAdminCompanyId(Number(e.target.value)); setTargetDept(null); }} disabled={!!defaultCompanyId} className="w-full bg-black/40 border border-white/10 rounded-xl px-2 py-2.5 text-white outline-none focus:border-blue-500 disabled:opacity-50">
                                <option value="">انتخاب سازمان...</option>
                                {companies.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                            </select>
                        </div>
                    )}

                    {(!searchResult?.found || view === 'edit') && (
                        <div className="space-y-2">
                            <label className="text-xs text-gray-400 font-bold">نام نمایشی (فارسی)</label>
                            <input value={ghostName} onChange={e => setGhostName(e.target.value)} className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-2.5 text-white outline-none focus:border-blue-500" placeholder="نام و نام خانوادگی..." />
                        </div>
                    )}
                    
                    {userRole === 'superadmin' && (!searchResult?.found || view === 'edit') && (
                        <>
                            <div className="space-y-2">
                                <label className="text-xs text-gray-400 font-bold">نام کاربری (لاتین)</label>
                                <input value={adminUsername} onChange={e => setAdminUsername(e.target.value)} disabled={view === 'edit'} className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-2.5 text-white dir-ltr text-left outline-none focus:border-blue-500 disabled:opacity-50" />
                            </div>
                            <div className="space-y-2">
                                <label className="text-xs text-gray-400 font-bold">{view === 'edit' ? "رمز عبور جدید (اختیاری)" : "رمز عبور"}</label>
                                <input type="password" value={adminPassword} onChange={e => setAdminPassword(e.target.value)} className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-2.5 text-white dir-ltr text-left outline-none focus:border-blue-500" />
                            </div>
                        </>
                    )}

                    <div className="grid grid-cols-2 gap-3">
                        <div className="space-y-2">
                            <label className="text-xs text-gray-400 font-bold">نقش</label>
                            <select value={targetRole} onChange={e => setTargetRole(e.target.value)} className="w-full bg-black/40 border border-white/10 rounded-xl px-2 py-2.5 text-white outline-none focus:border-blue-500">
                                {ROLES.map(r => <option key={r.value} value={r.value}>{r.label}</option>)}
                            </select>
                        </div>
                        <div className="space-y-2">
                            <label className="text-xs text-gray-400 font-bold">دپارتمان</label>
                            <select value={targetDept || ""} onChange={e => setTargetDept(Number(e.target.value))} className="w-full bg-black/40 border border-white/10 rounded-xl px-2 py-2.5 text-white outline-none focus:border-blue-500">
                                <option value="">(ندارد)</option>
                                {availableDepartments.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
                            </select>
                        </div>
                    </div>
                </div>

                <div className="flex gap-3 pt-4 border-t border-white/5">
                    <button onClick={() => view === 'edit' ? onClose() : setAddStep('search')} className="flex-1 py-3 text-gray-400 hover:bg-white/5 rounded-xl">بازگشت</button>
                    {view === 'edit' ? (
                        <button onClick={handleUpdate} className="flex-1 py-3 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl flex items-center justify-center gap-2">
                            <Save size={18} /> ذخیره تغییرات
                        </button>
                    ) : (
                        <>
                            {userRole === 'superadmin' && !searchResult?.found ? (
                                <button onClick={handleAdminCreate} className="flex-1 py-3 bg-purple-600 hover:bg-purple-500 text-white font-bold rounded-xl">ایجاد مستقیم کاربر</button>
                            ) : (
                                <button onClick={handleInvite} className="flex-1 py-3 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-xl">
                                    {searchResult?.found ? "افزودن به سازمان" : "ارسال دعوت‌نامه"}
                                </button>
                            )}
                        </>
                    )}
                </div>
            </div>
        )}
    </ModalWrapper>
  );
}