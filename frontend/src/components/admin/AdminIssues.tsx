"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import api from "@/lib/api";
import { AlertTriangle, CheckCircle, Clock, XCircle } from "lucide-react";
import clsx from "clsx";

export default function AdminIssues() {
  const queryClient = useQueryClient();
  const { data: issues = [], isLoading } = useQuery({
    queryKey: ['admin-issues'],
    queryFn: () => api.get("/issues/").then(res => res.data), // Assumes backend returns all for admin
  });

  const updateStatus = useMutation({
    mutationFn: ({ id, status }: { id: number, status: string }) => 
      api.patch(`/issues/${id}`, { status }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['admin-issues'] })
  });

  if (isLoading) return <div className="p-10 text-center animate-pulse text-gray-500">در حال بارگذاری...</div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3 mb-6">
        <div className="p-3 bg-yellow-500/20 rounded-xl text-yellow-500">
          <AlertTriangle size={24} />
        </div>
        <div>
          <h2 className="text-2xl font-bold text-white">مدیریت بازخوردها</h2>
          <p className="text-sm text-gray-400">گزارشات و مشکلات کاربران</p>
        </div>
      </div>

      <div className="grid gap-4">
        {issues.map((issue: any) => (
          <div key={issue.id} className="bg-[#1e1e1e] border border-white/5 p-4 rounded-xl flex flex-col md:flex-row justify-between gap-4">
            <div className="flex-1">
                <div className="flex items-center gap-2 mb-2">
                    <span className={clsx(
                        "text-[10px] px-2 py-0.5 rounded-full font-bold uppercase",
                        issue.status === 'new' ? "bg-red-500/20 text-red-400" :
                        issue.status === 'resolved' ? "bg-emerald-500/20 text-emerald-400" :
                        "bg-gray-500/20 text-gray-400"
                    )}>
                        {issue.status}
                    </span>
                    <span className="text-xs text-gray-500">{new Date(issue.created_at).toLocaleDateString('fa-IR')}</span>
                </div>
                <h3 className="font-bold text-white mb-1">{issue.title}</h3>
                <p className="text-sm text-gray-300">{issue.description}</p>
            </div>
            
            <div className="flex items-center gap-2 shrink-0">
                {issue.status !== 'resolved' && (
                    <button 
                        onClick={() => updateStatus.mutate({ id: issue.id, status: 'resolved' })}
                        className="p-2 bg-emerald-600/10 text-emerald-400 hover:bg-emerald-600 hover:text-white rounded-lg transition-colors flex items-center gap-2 text-xs"
                    >
                        <CheckCircle size={16} />
                        حل شد
                    </button>
                )}
                {issue.status !== 'closed' && (
                    <button 
                        onClick={() => updateStatus.mutate({ id: issue.id, status: 'closed' })}
                        className="p-2 bg-white/5 text-gray-400 hover:bg-white/10 hover:text-white rounded-lg transition-colors"
                    >
                        <XCircle size={16} />
                    </button>
                )}
            </div>
          </div>
        ))}
        {issues.length === 0 && <div className="text-center py-10 text-gray-500">هیچ بازخوردی ثبت نشده است</div>}
      </div>
    </div>
  );
}