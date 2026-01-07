"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { CheckSquare, LogOut, ArrowRight } from "lucide-react";
import Link from "next/link";
import api from "@/lib/api";
import { useQuery } from "@tanstack/react-query";
import ApprovalQueue from "@/components/evaluator/ApprovalQueue";

export default function EvaluatorPanelPage() {
  const router = useRouter();
  const [isAuthorized, setIsAuthorized] = useState(false);
  const [role, setRole] = useState("viewer");

  // Fetch 'me' to get fresh role and dept_id
  const { data: user } = useQuery({
    queryKey: ['user'],
    queryFn: () => api.get("/auth/me").then(res => res.data),
    retry: false
  });

  useEffect(() => {
    const storedRole = localStorage.getItem("role");
    if (!storedRole || (storedRole !== "evaluator" && storedRole !== "manager" && storedRole !== "superadmin")) {
      router.push("/");
    } else {
      setIsAuthorized(true);
      setRole(storedRole);
    }
  }, [router]);

  if (!isAuthorized || !user) return null;

  return (
    <div className="flex flex-col h-screen bg-[#09090b] text-gray-100 p-4 md:p-8 overflow-hidden">
      
      {/* Header */}
      <div className="flex items-center justify-between mb-8 shrink-0">
         <div className="flex items-center gap-3">
            <div className="p-3 bg-gradient-to-tr from-emerald-600 to-teal-500 rounded-2xl shadow-lg shadow-emerald-500/20">
                <CheckSquare size={24} className="text-white" />
            </div>
            <div>
                <h1 className="text-2xl font-bold text-white">پنل ارزیابی</h1>
                <p className="text-sm text-gray-400">
                   {role === 'manager' ? 'مشاهده و بررسی تمام درخواست‌ها' : 'بررسی درخواست‌های دپارتمان'}
                </p>
            </div>
         </div>

         <div className="flex gap-3">
             <Link href="/" className="flex items-center gap-2 px-4 py-2 bg-white/5 hover:bg-white/10 rounded-xl text-sm transition-colors border border-white/5">
                <ArrowRight size={16} /> بازگشت به تقویم
             </Link>
         </div>
      </div>

      {/* Content */}
      <div className="flex-1 min-h-0 bg-[#1e1e1e]/30 border border-white/5 rounded-3xl p-1 overflow-hidden backdrop-blur-md">
         <ApprovalQueue 
            userRole={user.role} 
            userDeptId={user.department_id} 
         />
      </div>

    </div>
  );
}