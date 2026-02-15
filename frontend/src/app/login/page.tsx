"use client";

import { useState, useEffect } from "react";
import { useAuthStore } from "@/stores/authStore";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { Loader2, Phone, User, Lock, CheckCircle2 } from "lucide-react";
import api from "@/lib/api";
import clsx from "clsx";

type AuthMode = 'signin' | 'signup';

export default function AuthPage() {
  const [mode, setMode] = useState<AuthMode>('signin');
  const [isLoading, setIsLoading] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [phone, setPhone] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [error, setError] = useState("");

  const router = useRouter();
  const login = useAuthStore((state) => state.login);

  useEffect(() => setError(""), [mode]);

  const triggerHaptic = (type: 'success' | 'error') => {
    if (typeof navigator !== 'undefined' && navigator.vibrate) {
      if (type === 'error') navigator.vibrate([50, 50, 50]);
      if (type === 'success') navigator.vibrate([20]);
    }
  };

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setIsLoading(true);

    try {
      if (mode === 'signin') {
        const formData = new FormData();
        formData.append("username", username);
        formData.append("password", password);
        
        const res = await api.post("/auth/token", formData, {
          headers: { "Content-Type": "application/x-www-form-urlencoded" },
        });
        
        triggerHaptic('success');
        login(res.data);
        router.push(res.data.is_superadmin ? "/admin" : "/");
      } else {
        await api.post("/auth/signup", {
          username,
          password,
          phone_number: phone,
          display_name: displayName
        });
        
        triggerHaptic('success');
        setIsSuccess(true);
        setTimeout(() => {
            setIsSuccess(false);
            setMode('signin');
        }, 1500);
      }
    } catch (err: any) {
      triggerHaptic('error');
      setError(err.response?.data?.detail || "خطا در ارتباط با سرور");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-[100dvh] w-full flex items-center justify-center bg-[#050505] relative overflow-hidden font-[family-name:var(--font-pinar)] text-right" dir="rtl">
      
      {/* Background Ambience */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none select-none">
        <div className="absolute inset-0 opacity-[0.03] z-[1]" style={{ backgroundImage: 'url("/noise.svg")' }} />
        <motion.div 
          animate={{ scale: [1, 1.2, 1], opacity: [0.3, 0.5, 0.3], x: [0, 50, 0] }}
          transition={{ duration: 15, repeat: Infinity, ease: "easeInOut" }}
          className="absolute -top-[10%] -right-[10%] w-[800px] h-[800px] rounded-full bg-blue-600/10 blur-[120px]" 
        />
        <motion.div 
          animate={{ scale: [1, 1.1, 1], opacity: [0.2, 0.4, 0.2], x: [0, -30, 0] }}
          transition={{ duration: 12, repeat: Infinity, ease: "easeInOut", delay: 2 }}
          className="absolute top-[30%] -left-[20%] w-[600px] h-[600px] rounded-full bg-indigo-500/10 blur-[100px]" 
        />
      </div>

      <div className="w-full max-w-[380px] z-10 px-6 flex flex-col items-center">
        
        {/* Logo */}
        <motion.div layout className="mb-10 text-center">
          <div className="relative w-16 h-16 mx-auto mb-4">
            <div className="absolute inset-0 bg-blue-500 rounded-2xl blur-xl opacity-40 animate-pulse" />
            
              <img src="/icons/icon.png" className="relative w-full h-full flex items-center justify-center drop-shadow-md opacity-90 border-1 rounded-2xl border-blue-500" alt="Logo" />
            
          </div>
          <h1 className="text-2xl font-bold text-white tracking-tight">زمان‌نگار</h1>
        </motion.div>

        {/* Card */}
        <motion.div 
            layout
            transition={{ type: "spring", stiffness: 300, damping: 30 }}
            className="w-full bg-[#121212]/60 backdrop-blur-2xl border border-white/[0.08] rounded-[32px] p-2 shadow-2xl ring-1 ring-white/5 relative overflow-hidden"
        >
            
            {/* Pill Navigation */}
            <motion.div 
                layout
                className="relative flex bg-[#0a0a0a]/50 p-1.5 rounded-[24px] border border-white/[0.03]"
            >
                <TabButton 
                    isActive={mode === 'signin'} 
                    onClick={() => setMode('signin')} 
                    label="ورود به حساب" 
                />
                <TabButton 
                    isActive={mode === 'signup'} 
                    onClick={() => setMode('signup')} 
                    label="ثبت‌نام جدید" 
                />
            </motion.div>

            {/* Form Content */}
            <motion.div 
                layout 
                className="p-4 pt-6"
                transition={{ type: "spring", stiffness: 300, damping: 30 }}
            >
                <AnimatePresence>
                    {isSuccess && (
                        <motion.div 
                            initial={{ opacity: 0, scale: 0.9 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0 }}
                            className="absolute inset-0 z-20 bg-[#121212] flex flex-col items-center justify-center text-center rounded-[32px]"
                        >
                            <div className="w-16 h-16 bg-emerald-500/20 rounded-full flex items-center justify-center mb-4 text-emerald-500">
                                <CheckCircle2 size={32} />
                            </div>
                            <h3 className="text-white font-bold text-lg">خوش آمدید!</h3>
                            <p className="text-gray-400 text-sm mt-1">در حال انتقال به فرم ورود...</p>
                        </motion.div>
                    )}
                </AnimatePresence>

                <form onSubmit={handleAuth} className="flex flex-col gap-3">
                    
                    {/* Signup Fields */}
                    <AnimatePresence mode="popLayout">
                        {mode === 'signup' && (
                            <motion.div
                                key="signup-fields"
                                initial={{ opacity: 0, height: 0, y: -20 }}
                                animate={{ opacity: 1, height: "auto", y: 0 }}
                                exit={{ opacity: 0, height: 0, y: -10 }}
                                transition={{ 
                                    opacity: { duration: 0.2 },
                                    height: { type: "spring", stiffness: 300, damping: 30 },
                                    y: { duration: 0.2 }
                                }}
                                className="flex flex-col gap-3 overflow-hidden"
                            >
                                <Input 
                                    icon={Phone} 
                                    placeholder="شماره موبایل (۰۹۱۲...)" 
                                    value={phone} 
                                    onChange={setPhone} 
                                    type="tel" 
                                    dir="ltr"
                                />
                                <Input 
                                    icon={CheckCircle2} 
                                    placeholder="نام و نام خانوادگی (فارسی)" 
                                    value={displayName} 
                                    onChange={setDisplayName} 
                                />
                            </motion.div>
                        )}
                    </AnimatePresence>

                    {/* Shared Fields - With Layout to glide smoothly */}
                    <motion.div layout className="flex flex-col gap-3">
                        <Input 
                            icon={User} 
                            placeholder={mode === 'signin' ? "نام کاربری یا موبایل" : "نام کاربری (انگلیسی)"} 
                            value={username} 
                            onChange={setUsername} 
                            dir="ltr"
                            autoFocus={mode === 'signin'}
                        />
                        <Input 
                            icon={Lock} 
                            placeholder="رمز عبور" 
                            value={password} 
                            onChange={setPassword} 
                            type="password" 
                            dir="ltr"
                        />
                    </motion.div>

                    {/* Error Shake */}
                    <AnimatePresence>
                        {error && (
                            <motion.div
                                layout
                                key="error"
                                initial={{ opacity: 0, height: 0 }}
                                animate={{ opacity: 1, height: "auto", x: [0, -5, 5, -5, 5, 0] }}
                                exit={{ opacity: 0, height: 0 }}
                                transition={{ x: { duration: 0.4 }, opacity: { duration: 0.2 } }}
                                className="overflow-hidden"
                            >
                                <div className="mt-2 p-3 bg-red-500/10 border border-red-500/20 rounded-xl text-red-300 text-xs font-medium text-center">
                                    {error}
                                </div>
                            </motion.div>
                        )}
                    </AnimatePresence>

                    {/* Button - With Layout to stick to bottom */}
                    <motion.div layout>
                        <SubmitButton isLoading={isLoading} mode={mode} />
                    </motion.div>
                </form>
            </motion.div>
        </motion.div>

        <motion.p 
            layout 
            className="mt-8 text-[10px] text-gray-600 font-medium tracking-wide"
        >
            زمان‌نگار-۱۴۰۴
        </motion.p>
      </div>
    </div>
  );
}

// --- SUB-COMPONENTS ---

function TabButton({ isActive, onClick, label }: { isActive: boolean; onClick: () => void; label: string }) {
    return (
        <button
            onClick={onClick}
            className={clsx(
                "flex-1 relative py-3 text-sm font-bold transition-colors duration-300 outline-none",
                isActive ? "text-white" : "text-gray-500 hover:text-gray-300"
            )}
        >
            {isActive && (
                <motion.div
                    layoutId="active-pill"
                    className="absolute inset-0 bg-[#1f1f22] border border-white/10 rounded-[20px] shadow-sm"
                    transition={{ type: "spring", stiffness: 300, damping: 30 }}
                />
            )}
            <span className="relative z-10">{label}</span>
        </button>
    );
}

function Input({ icon: Icon, dir = 'rtl', ...props }: any) {
  return (
    <div className="relative group">
      <div className={clsx(
        "absolute top-1/2 -translate-y-1/2 text-gray-500 transition-colors duration-300 pointer-events-none z-10",
        "group-focus-within:text-blue-400",
        dir === 'rtl' ? "right-4" : "left-4"
      )}>
        <Icon size={18} strokeWidth={2} />
      </div>
      <input
        {...props}
        onChange={(e: any) => props.onChange(e.target.value)}
        dir={dir}
        className={clsx(
          "w-full bg-[#0a0a0c] border border-white/[0.06] rounded-[18px] py-4 text-white transition-all duration-300 outline-none text-[14px] placeholder:text-gray-600 font-medium font-[family-name:var(--font-pinar)]", // <--- FORCE PINAR HERE
          "focus:border-blue-500/40 focus:bg-[#0f0f12] focus:shadow-[0_0_20px_-5px_rgba(59,130,246,0.3)]",
          "hover:border-white/10",
          dir === 'rtl' ? "pr-12 pl-4" : "pl-12 pr-4 tracking-wide" // Removed font-mono
        )}
      />
    </div>
  );
}

function SubmitButton({ isLoading, mode }: { isLoading: boolean, mode: AuthMode }) {
    return (
        <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.96 }}
            disabled={isLoading}
            className={clsx(
                "mt-2 w-full py-4 rounded-[18px] font-bold text-white shadow-lg transition-all flex items-center justify-center gap-2 text-[15px] relative overflow-hidden",
                mode === 'signin' 
                    ? "bg-gradient-to-r from-blue-600 to-indigo-600 hover:shadow-blue-500/20" 
                    : "bg-gradient-to-r from-indigo-600 to-purple-600 hover:shadow-purple-500/20",
                isLoading && "opacity-80 cursor-not-allowed"
            )}
        >
            <div className="absolute inset-0 bg-white/10 translate-x-[-100%] animate-[shimmer_2s_infinite]" />
            
            {isLoading ? (
                <Loader2 className="animate-spin" size={20} />
            ) : (
                <>
                    {mode === 'signin' ? "ورود به سیستم" : "ثبت اطلاعات"}
                </>
            )}
        </motion.button>
    );
}