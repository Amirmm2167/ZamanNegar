"use client";

import { useState } from "react";
import ModalWrapper from "@/components/ui/ModalWrapper";
import { Phone, Loader2, AlertTriangle, CheckCircle2, Shield } from "lucide-react";
import api from "@/lib/api";
import { toEnglishDigits } from "@/lib/utils";
import { useAuthStore } from "@/stores/authStore"; // <--- Import Auth Store

interface QuickInviteProps {
  isOpen: boolean;
  onClose: () => void;
  companyId: number;
  onSuccess: () => void;
}

export default function QuickInviteModal({ isOpen, onClose, companyId, onSuccess }: QuickInviteProps) {
  const { user } = useAuthStore(); // <--- Get Current User
  const [phone, setPhone] = useState("");
  const [role, setRole] = useState("viewer"); // Changed from boolean isManager to string role
  const [loading, setLoading] = useState(false);
  const [conflict, setConflict] = useState<any>(null); 

  const isSuperAdmin = user?.is_superadmin;

  const handleSubmit = async (replace = false) => {
     setLoading(true);
     try {
        await api.post("/users/invite", {
           phone_number: toEnglishDigits(phone),
           role: role, // Send selected role
           company_id: companyId,
           replace_manager: replace 
        });
        onSuccess();
        onClose();
     } catch (err: any) {
        if (err.response?.status === 409 && err.response.data.code === "MANAGER_EXISTS") {
            setConflict(err.response.data);
        } else {
            alert(err.response?.data?.detail || "خطا");
        }
     } finally {
        setLoading(false);
     }
  };

  return (
    <ModalWrapper isOpen={isOpen} onClose={onClose} title={conflict ? "تایید جایگزینی" : "افزودن عضو جدید"} size="sm">
       {conflict ? (
          // CONFIRMATION VIEW (Only happens if Admin tries to replace manager)
          <div className="flex flex-col items-center text-center py-2">
             <div className="w-16 h-16 bg-amber-500/20 text-amber-500 rounded-full flex items-center justify-center mb-4 ring-1 ring-amber-500/50">
                <AlertTriangle size={32} />
             </div>
             <h3 className="font-bold text-white text-lg mb-2">مدیر فعلی تغییر کند؟</h3>
             <p className="text-sm text-gray-400 mb-8 leading-relaxed px-4">
                کاربر <span className="text-white font-bold bg-white/10 px-1 rounded">{conflict.current_manager_name}</span> هم‌اکنون مدیر این سازمان است. <br/>
                آیا مطمئنید که می‌خواهید مدیر جدید جایگزین شود؟
             </p>
             <div className="flex gap-3 w-full">
                <button onClick={() => setConflict(null)} className="flex-1 py-3 text-gray-400 hover:bg-white/5 rounded-xl font-bold transition-colors">انصراف</button>
                <button onClick={() => handleSubmit(true)} className="flex-1 py-3 bg-amber-600 hover:bg-amber-500 text-white font-bold rounded-xl shadow-lg shadow-amber-900/20 transition-all">
                   {loading ? <Loader2 className="animate-spin mx-auto"/> : "بله، جایگزین کن"}
                </button>
             </div>
          </div>
       ) : (
          // FORM VIEW
          <div className="space-y-6 pt-2">
             
             {/* Phone Input */}
             <div className="space-y-2">
                <label className="text-xs text-gray-400 font-bold">شماره موبایل</label>
                <div className="relative group">
                   <input 
                      autoFocus
                      dir="ltr"
                      value={phone}
                      onChange={e => setPhone(e.target.value)}
                      className="w-full bg-black/40 border border-white/10 rounded-xl pl-10 pr-4 py-4 text-white text-lg font-mono focus:border-blue-500 outline-none transition-all group-hover:border-white/20"
                      placeholder="0912..."
                   />
                   <Phone className="absolute left-3 top-4 text-gray-600 group-focus-within:text-blue-500 transition-colors" size={20} />
                </div>
             </div>

             {/* Role Selection (Standard Roles) */}
             <div className="space-y-2">
                <label className="text-xs text-gray-400 font-bold">نقش کاربری</label>
                <div className="grid grid-cols-3 gap-2">
                    {['viewer', 'proposer', 'evaluator'].map((r) => (
                        <button
                            key={r}
                            onClick={() => setRole(r)}
                            className={`py-2.5 rounded-xl text-sm font-medium border transition-all ${
                                role === r 
                                ? "bg-blue-600/10 border-blue-500 text-blue-400" 
                                : "bg-white/5 border-transparent text-gray-400 hover:bg-white/10"
                            }`}
                        >
                            {r === 'viewer' && "مشاهده‌گر"}
                            {r === 'proposer' && "پیشنهاد دهنده"}
                            {r === 'evaluator' && "ارزیاب"}
                        </button>
                    ))}
                </div>
             </div>

             {/* Manager Toggle (ONLY SUPERADMIN) */}
             {isSuperAdmin && (
                 <div 
                    onClick={() => setRole(role === 'manager' ? 'viewer' : 'manager')}
                    className={`flex items-center gap-4 p-4 rounded-xl border cursor-pointer transition-all select-none ${role === 'manager' ? "bg-amber-600/10 border-amber-500/50 ring-1 ring-amber-500/20" : "bg-white/5 border-white/5 hover:border-white/10"}`}
                 >
                    <div className={`w-6 h-6 rounded-lg border flex items-center justify-center transition-colors ${role === 'manager' ? "bg-amber-500 border-amber-500" : "border-gray-600 bg-black/40"}`}>
                       {role === 'manager' && <CheckCircle2 size={16} className="text-black"/>}
                    </div>
                    <div>
                       <div className={`text-sm font-bold ${role === 'manager' ? "text-amber-400" : "text-gray-300"}`}>این کاربر مدیر سازمان است</div>
                       <div className="text-[10px] text-gray-500 mt-0.5">دسترسی کامل به تنظیمات (مخصوص ادمین)</div>
                    </div>
                 </div>
             )}

             <button 
                onClick={() => handleSubmit(false)}
                disabled={phone.length < 10 || loading}
                className="w-full py-4 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold rounded-xl transition-all flex items-center justify-center gap-2 shadow-lg shadow-blue-900/20 hover:scale-[1.02] active:scale-[0.98]"
             >
                {loading ? <Loader2 className="animate-spin"/> : "افزودن سریع"}
             </button>
          </div>
       )}
    </ModalWrapper>
  );
}