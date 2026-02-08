"use client";
import { useState, Fragment } from "react";
import { X, Building2, Check, Loader2 } from "lucide-react";
import api from "@/lib/api";

export default function CompanyModal({ isOpen, onClose, onSuccess }: any) {
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await api.post("/superadmin/companies", { name });
      onSuccess();
      setName("");
    } catch (err) {
      alert("خطا در ایجاد شرکت");
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
       <div className="w-full max-w-md bg-[#18181b] border border-white/10 rounded-2xl p-6 shadow-2xl">
          <div className="flex justify-between items-center mb-6">
             <h3 className="text-xl font-bold text-white flex gap-2 items-center"><Building2 size={20} className="text-blue-500"/> ثبت سازمان</h3>
             <button onClick={onClose}><X className="text-gray-400 hover:text-white" /></button>
          </div>
          <form onSubmit={handleSubmit} className="space-y-4">
             <div>
                <label className="text-xs text-gray-400 mb-1 block">نام سازمان</label>
                <input value={name} onChange={e=>setName(e.target.value)} className="w-full bg-black/30 border border-white/10 rounded-xl px-4 py-3 text-white focus:border-blue-500 outline-none" required placeholder="مثلا: شرکت فولاد" />
             </div>
             <button disabled={loading} className="w-full bg-blue-600 hover:bg-blue-500 text-white font-bold py-3 rounded-xl flex items-center justify-center gap-2">
                {loading ? <Loader2 className="animate-spin" /> : <Check />} ثبت
             </button>
          </form>
       </div>
    </div>
  );
}