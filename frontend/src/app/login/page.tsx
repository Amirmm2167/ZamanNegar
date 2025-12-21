"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { AxiosError } from "axios";
import api from "@/lib/api";
import { Lock, User as UserIcon, Loader2 } from "lucide-react";
import GlassPane from "@/components/ui/GlassPane";

export default function LoginPage() {
  const router = useRouter();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const formData = new URLSearchParams();
      formData.append("username", username);
      formData.append("password", password);

      const response = await api.post("/auth/token", formData, {
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
      });

      localStorage.setItem("token", response.data.access_token);
      localStorage.setItem("role", response.data.role);
      localStorage.setItem("username", response.data.username);
      
      if (response.data.role === 'superadmin') {
        router.push("/admin");
      } else {
        router.push("/");
      }
    } catch (err) {
      if (err instanceof AxiosError) {
        setError(err.response?.data?.detail || "نام کاربری یا رمز عبور اشتباه است");
      } else {
        setError("خطای ناشناخته");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex items-center justify-center min-h-screen p-4 relative z-10">
      <GlassPane intensity="login" className="w-full max-w-[400px] p-10 rounded-[30px]">
        <div className="flex flex-col items-center mb-10">
           <div className="w-20 h-20 bg-[#1e293b] rounded-full flex items-center justify-center mb-6 border border-white/5 shadow-inner">
              <UserIcon className="text-blue-500" size={36} />
           </div>
           <h2 className="text-2xl font-bold text-white tracking-wide">ورود به زمان‌نگار</h2>
        </div>
        
        {error && (
          <div className="p-3 mb-6 text-sm text-red-200 bg-red-500/10 border border-red-500/20 rounded-xl text-center animate-in fade-in slide-in-from-top-2">
            {error}
          </div>
        )}

        <form onSubmit={handleLogin} className="space-y-6">
          <div className="relative group">
            <span className="absolute inset-y-0 right-0 flex items-center pr-4 text-gray-500 group-focus-within:text-blue-500 transition-colors">
              <UserIcon size={20} />
            </span>
            <input
              type="text"
              required
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="w-full py-3.5 pr-12 pl-4 bg-[#0a0c10]/50 border border-white/5 rounded-xl text-white focus:border-blue-500/50 focus:bg-black/40 outline-none transition-all placeholder:text-gray-700 text-right dir-rtl"
              placeholder="نام کاربری"
              style={{ direction: 'rtl' }}
            />
          </div>

          <div className="relative group">
            <span className="absolute inset-y-0 right-0 flex items-center pr-4 text-gray-500 group-focus-within:text-blue-500 transition-colors">
              <Lock size={20} />
            </span>
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full py-3.5 pr-12 pl-4 bg-[#0a0c10]/50 border border-white/5 rounded-xl text-white focus:border-blue-500/50 focus:bg-black/40 outline-none transition-all placeholder:text-gray-700 text-right dir-rtl"
              placeholder="رمز عبور"
              style={{ direction: 'rtl' }}
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3.5 font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-xl shadow-[0_0_20px_rgba(37,99,235,0.3)] hover:shadow-[0_0_30px_rgba(37,99,235,0.5)] transition-all flex justify-center items-center gap-2 disabled:opacity-50 disabled:shadow-none mt-8"
          >
            {loading ? <Loader2 className="animate-spin" /> : "ورود به سیستم"}
          </button>
        </form>
      </GlassPane>
    </div>
  );
}