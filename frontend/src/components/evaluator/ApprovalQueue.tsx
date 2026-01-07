"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import api from "@/lib/api";
import SmartTable, { Column } from "@/components/ui/SmartTable";
import { 
  CheckCircle2, XCircle, Calendar, Clock, User, 
  Building2, AlertCircle, ArrowRight 
} from "lucide-react";
import { CalendarEvent, Department, User as UserData } from "@/types";
import { toPersianDigits } from "@/lib/utils";

interface ApprovalQueueProps {
  userRole: string;
  userDeptId?: number | null;
}

export default function ApprovalQueue({ userRole, userDeptId }: ApprovalQueueProps) {
  const queryClient = useQueryClient();
  const [processingId, setProcessingId] = useState<number | null>(null);

  // 1. Fetch Data
  const { data: events = [] } = useQuery<CalendarEvent[]>({
    queryKey: ['events'],
    queryFn: () => api.get("/events/").then(res => res.data),
  });

  const { data: users = [] } = useQuery<UserData[]>({
    queryKey: ['users'],
    queryFn: () => api.get("/users/").then(res => res.data),
  });

  const { data: departments = [] } = useQuery<Department[]>({
    queryKey: ['departments'],
    queryFn: () => api.get("/departments/").then(res => res.data),
  });

  // 2. Filter Logic
  // - Managers/Superadmins: See ALL pending events
  // - Evaluators: See pending events ONLY for their assigned department
  const pendingEvents = events.filter(e => {
    if (e.status !== 'pending') return false;
    
    if (userRole === 'manager' || userRole === 'superadmin') return true;
    
    if (userRole === 'evaluator') {
       // If event has no dept, maybe show it? Or strict matching?
       // Strict matching: Evaluator only sees their dept events.
       return e.department_id === userDeptId;
    }
    
    return false;
  });

  // 3. Mutations
  const updateStatusMutation = useMutation({
    mutationFn: ({ id, status, reason }: { id: number; status: string; reason?: string }) => 
      api.patch(`/events/${id}`, { status, rejection_reason: reason }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['events'] });
      setProcessingId(null);
    },
    onError: () => setProcessingId(null)
  });

  const handleApprove = (e: React.MouseEvent, id: number) => {
    e.stopPropagation();
    if (confirm("آیا از تایید این رویداد اطمینان دارید؟")) {
      setProcessingId(id);
      updateStatusMutation.mutate({ id, status: 'approved' });
    }
  };

  const handleReject = (e: React.MouseEvent, id: number) => {
    e.stopPropagation();
    const reason = prompt("لطفاً دلیل رد درخواست را بنویسید:");
    if (reason) {
      setProcessingId(id);
      updateStatusMutation.mutate({ id, status: 'rejected', reason });
    }
  };

  // 4. Columns
  const columns: Column<CalendarEvent>[] = [
    { 
      key: "title", 
      label: "عنوان رویداد", 
      sortable: true, 
      filterable: true,
      render: (item) => (
        <div className="font-bold text-white">{item.title}</div>
      )
    },
    {
      key: "proposer_id",
      label: "درخواست دهنده",
      sortable: true,
      render: (item) => {
        const user = users.find(u => u.id === item.proposer_id);
        return (
          <div className="flex items-center gap-2">
             <div className="p-1 rounded-full bg-white/5 text-gray-400"><User size={12}/></div>
             <span>{user?.display_name || "کاربر ناشناس"}</span>
          </div>
        );
      }
    },
    {
      key: "department_id",
      label: "دپارتمان",
      sortable: true,
      filterable: true,
      render: (item) => {
        const dept = departments.find(d => d.id === item.department_id);
        return dept ? (
          <div className="flex items-center gap-2 text-xs">
             <span className="w-2 h-2 rounded-full" style={{ backgroundColor: dept.color }} />
             {dept.name}
          </div>
        ) : <span className="text-gray-500">-</span>;
      }
    },
    {
      key: "start_time",
      label: "زمان برگزاری",
      sortable: true,
      width: "w-40",
      render: (item) => {
        const date = new Date(item.start_time);
        const dateStr = date.toLocaleDateString('fa-IR');
        const timeStr = date.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
        return (
          <div className="flex flex-col text-[10px] text-gray-300">
             <div className="flex items-center gap-1"><Calendar size={10} className="text-blue-400"/> {dateStr}</div>
             <div className="flex items-center gap-1 mt-0.5"><Clock size={10} className="text-purple-400"/> {toPersianDigits(timeStr)}</div>
          </div>
        );
      }
    },
    {
      key: "actions",
      label: "عملیات",
      width: "w-48",
      render: (item) => (
         <div className="flex items-center gap-2 justify-end">
            <button 
               onClick={(e) => handleApprove(e, item.id)}
               disabled={processingId === item.id}
               className="flex items-center gap-1 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-bold shadow-[0_0_10px_rgba(16,185,129,0.3)] transition-all disabled:opacity-50"
            >
               <CheckCircle2 size={14} /> تایید
            </button>
            <button 
               onClick={(e) => handleReject(e, item.id)}
               disabled={processingId === item.id}
               className="flex items-center gap-1 px-3 py-1.5 bg-red-600 hover:bg-red-500 text-white rounded-lg text-xs font-bold shadow-[0_0_10px_rgba(239,68,68,0.3)] transition-all disabled:opacity-50"
            >
               <XCircle size={14} /> رد
            </button>
         </div>
      )
    }
  ];

  // Optional: Row detail view
  const expandedRender = (item: CalendarEvent) => (
     <div className="p-4 grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-gray-300">
        {item.description && (
          <div className="col-span-full">
            <strong className="text-gray-500 block mb-1 text-xs">توضیحات:</strong>
            <p className="bg-black/20 p-2 rounded-lg border border-white/5 leading-relaxed">{item.description}</p>
          </div>
        )}
        {item.goal && (
          <div>
            <strong className="text-yellow-500/80 block mb-1 text-xs">هدف:</strong>
            {item.goal}
          </div>
        )}
        {(item as any).target_audience && (
           <div>
            <strong className="text-blue-500/80 block mb-1 text-xs">مخاطبین:</strong>
            {(item as any).target_audience}
          </div>
        )}
     </div>
  );

  return (
    <div className="h-full flex flex-col space-y-4 animate-in fade-in zoom-in-95 duration-300">
       {pendingEvents.length === 0 ? (
          <div className="flex-1 flex flex-col items-center justify-center text-gray-500 bg-[#1e1e1e]/40 rounded-2xl border border-white/5 border-dashed">
             <div className="p-4 bg-white/5 rounded-full mb-3"><CheckCircle2 size={40} className="text-emerald-500/50" /></div>
             <p className="font-bold">هیچ رویدادی در انتظار تایید نیست</p>
             <p className="text-xs mt-1 opacity-60">همه چیز مرتب است!</p>
          </div>
       ) : (
          <SmartTable 
             title="صف انتظار (Pending)"
             icon={AlertCircle}
             data={pendingEvents}
             columns={columns}
             expandedRowRender={expandedRender}
          />
       )}
    </div>
  );
}