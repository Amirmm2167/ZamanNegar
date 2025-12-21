"use client";
import { useEffect, useState } from "react";
import api from "@/lib/api";
import { AlertCircle, CheckCircle, Clock } from "lucide-react";

export default function AdminReports() {
  const [reports, setReports] = useState<any[]>([]);

  useEffect(() => {
    api.get("/issues/").then((res) => setReports(res.data));
  }, []);

  const updateStatus = async (id: number, status: string) => {
    await api.patch(`/issues/${id}`, { status });
    const res = await api.get("/issues/"); // Refresh
    setReports(res.data);
  };

  return (
    <div className="space-y-4">
      <h2 className="text-2xl font-bold mb-6">گزارشات و مشکلات کاربران</h2>
      {reports.map((r) => (
        <div key={r.id} className="bg-[#252526] p-4 rounded-lg border border-gray-700 flex justify-between items-start">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="font-bold text-lg">{r.title}</span>
              <span className={`text-xs px-2 py-0.5 rounded-full ${
                r.status === 'new' ? 'bg-red-900 text-red-200' : 'bg-green-900 text-green-200'
              }`}>{r.status === 'new' ? 'جدید' : 'بررسی شده'}</span>
            </div>
            <p className="text-gray-400 text-sm">{r.description}</p>
            <div className="text-xs text-gray-500 mt-2">کاربر ID: {r.user_id} | تاریخ: {new Date(r.created_at).toLocaleDateString('fa-IR')}</div>
          </div>
          
          {r.status === 'new' && (
            <button 
              onClick={() => updateStatus(r.id, 'resolved')}
              className="px-3 py-1 bg-blue-600 text-white text-sm rounded hover:bg-blue-700"
            >
              بستن گزارش
            </button>
          )}
        </div>
      ))}
    </div>
  );
}