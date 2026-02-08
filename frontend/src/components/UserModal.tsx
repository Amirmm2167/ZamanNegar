"use client";

import { useState, Fragment } from "react";
import { Dialog, Transition } from "@headlessui/react";
import { X, User, Lock, Loader2, Shield } from "lucide-react";
import api from "@/lib/api";

interface UserModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export default function UserModal({ isOpen, onClose, onSuccess }: UserModalProps) {
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    username: "",
    display_name: "",
    password: "",
    is_superadmin: false
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      // POST to /auth/signup or /users/ depending on your API structure for admins
      // Assuming a dedicated create user endpoint for admins exists
      await api.post("/users/", {
         ...formData,
         // email is removed as per requirement
      });
      onSuccess();
      setFormData({ username: "", display_name: "", password: "", is_superadmin: false }); // Reset
    } catch (error) {
      console.error(error);
      alert("خطا در ایجاد کاربر");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Transition appear show={isOpen} as={Fragment}>
      <Dialog as="div" className="relative z-[100]" onClose={onClose} dir="rtl">
        <Transition.Child
          as={Fragment}
          enter="ease-out duration-300"
          enterFrom="opacity-0"
          enterTo="opacity-100"
          leave="ease-in duration-200"
          leaveFrom="opacity-100"
          leaveTo="opacity-0"
        >
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm" />
        </Transition.Child>

        <div className="fixed inset-0 overflow-y-auto">
          <div className="flex min-h-full items-center justify-center p-4">
            <Dialog.Panel className="w-full max-w-md transform overflow-hidden rounded-2xl bg-[#1a1d24] border border-white/10 p-6 shadow-2xl transition-all">
              
              <div className="flex items-center justify-between mb-6">
                <Dialog.Title className="text-xl font-bold text-white">
                  تعریف کاربر جدید
                </Dialog.Title>
                <button onClick={onClose} className="text-gray-400 hover:text-white">
                  <X size={20} />
                </button>
              </div>

              <form onSubmit={handleSubmit} className="space-y-4">
                
                <div className="space-y-1">
                   <label className="text-xs text-gray-400">نام نمایشی (فارسی)</label>
                   <input
                     type="text"
                     required
                     value={formData.display_name}
                     onChange={(e) => setFormData({...formData, display_name: e.target.value})}
                     className="w-full bg-[#0a0c10] border border-white/10 rounded-xl px-4 py-3 text-white focus:border-blue-500 outline-none"
                     placeholder="مثلا: علی محمدی"
                   />
                </div>

                <div className="space-y-1">
                   <label className="text-xs text-gray-400">نام کاربری (انگلیسی)</label>
                   <div className="relative">
                     <User className="absolute left-3 top-3 text-gray-500" size={18} />
                     <input
                       type="text"
                       required
                       value={formData.username}
                       onChange={(e) => setFormData({...formData, username: e.target.value})}
                       className="w-full bg-[#0a0c10] border border-white/10 rounded-xl px-4 py-3 pl-10 text-white focus:border-blue-500 outline-none text-left dir-ltr font-mono"
                       placeholder="username"
                     />
                   </div>
                </div>

                <div className="space-y-1">
                   <label className="text-xs text-gray-400">رمز عبور</label>
                   <div className="relative">
                     <Lock className="absolute left-3 top-3 text-gray-500" size={18} />
                     <input
                       type="password"
                       required
                       value={formData.password}
                       onChange={(e) => setFormData({...formData, password: e.target.value})}
                       className="w-full bg-[#0a0c10] border border-white/10 rounded-xl px-4 py-3 pl-10 text-white focus:border-blue-500 outline-none text-left dir-ltr"
                       placeholder="••••••••"
                     />
                   </div>
                </div>

                <div className="pt-2">
                   <label className="flex items-center gap-3 p-3 bg-white/5 rounded-xl cursor-pointer hover:bg-white/10 transition-colors">
                      <input 
                        type="checkbox" 
                        className="w-5 h-5 rounded border-gray-600 text-blue-600 bg-transparent focus:ring-0 focus:ring-offset-0"
                        checked={formData.is_superadmin}
                        onChange={(e) => setFormData({...formData, is_superadmin: e.target.checked})}
                      />
                      <div className="flex flex-col">
                         <span className="text-sm font-bold text-white flex items-center gap-2">
                            <Shield size={14} className="text-purple-400" />
                            دسترسی مدیر ارشد (Superadmin)
                         </span>
                         <span className="text-xs text-gray-500 mt-0.5">دسترسی کامل به تمام تنظیمات سیستم</span>
                      </div>
                   </label>
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 rounded-xl transition-all shadow-lg shadow-blue-600/20 mt-4 flex items-center justify-center gap-2"
                >
                  {loading ? <Loader2 className="animate-spin" /> : "ایجاد کاربر"}
                </button>

              </form>

            </Dialog.Panel>
          </div>
        </div>
      </Dialog>
    </Transition>
  );
}