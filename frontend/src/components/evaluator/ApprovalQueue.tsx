"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import api from "@/lib/api";
import SmartTable, { Column } from "@/components/ui/SmartTable";
import { 
  CheckCircle2, XCircle, Calendar, Clock, User, 
  Layers, CheckSquare, Square
} from "lucide-react";
import { EventInstance, Department, User as UserData } from "@/types"; // Fixed Import
import { toPersianDigits } from "@/lib/utils";

interface ApprovalQueueProps {
  userRole: string;
  userDeptId?: number | null;
}

export default function ApprovalQueue({ userRole, userDeptId }: ApprovalQueueProps) {
  const queryClient = useQueryClient();
  const [processingId, setProcessingId] = useState<number | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());

  // 1. Fetch Data
  const { data: events = [] } = useQuery<EventInstance[]>({
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
  const pendingEvents = events.filter(e => {
    if (e.status !== 'pending') return false;
    if (userRole === 'manager' || userRole === 'superadmin') return true;
    if (userRole === 'evaluator') return e.department_id === userDeptId;
    return false;
  });

  // 3. Real-Time Sync Simulation
  const simulateRealTimeSync = (count: number, action: 'approved' | 'rejected') => {
    if (typeof navigator !== 'undefined' && navigator.vibrate) {
      navigator.vibrate([50, 50, 50]);
    }
    console.log(`[SOCKET] Emitting 'event_status_change': ${count} items ${action}`);
  };

  // 4. Mutations
  const updateStatusMutation = useMutation({
    mutationFn: async ({ ids, status, reason }: { ids: number[]; status: string; reason?: string }) => {
      const promises = ids.map(id => 
        // Note: Using master_id usually for status updates, or id if instance-specific
        // Assuming API accepts instance ID and resolves master, or we need master_id
        api.patch(`/events/${id}`, { status, rejection_reason: reason }) 
      );
      return Promise.all(promises);
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['events'] });
      setProcessingId(null);
      setSelectedIds(new Set());
      simulateRealTimeSync(variables.ids.length, variables.status as any);
    },
    onError: () => setProcessingId(null)
  });

  // Handlers
  const handleBatchApprove = () => {
    if (confirm(`آیا از تایید ${selectedIds.size} رویداد انتخاب شده اطمینان دارید؟`)) {
      updateStatusMutation.mutate({ ids: Array.from(selectedIds), status: 'approved' });
    }
  };

  const handleBatchReject = () => {
    const reason = prompt("دلیل رد این درخواست‌ها (مشترک):");
    if (reason) {
      updateStatusMutation.mutate({ ids: Array.from(selectedIds), status: 'rejected', reason });
    }
  };

  const toggleSelection = (id: number) => {
    const newSet = new Set(selectedIds);
    if (newSet.has(id)) newSet.delete(id);
    else newSet.add(id);
    setSelectedIds(newSet);
  };

  const toggleSelectAll = () => {
    if (selectedIds.size === pendingEvents.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(pendingEvents.map(e => e.id)));
    }
  };

  // 5. Columns
  const columns: Column<EventInstance>[] = [
    {
      key: "id",
      label: "انتخاب",
      width: "w-12",
      render: (item) => (
        <button 
          onClick={(e) => { e.stopPropagation(); toggleSelection(item.id); }}
          className="text-gray-400 hover:text-white transition-colors"
        >
          {selectedIds.has(item.id) 
            ? <CheckSquare size={18} className="text-blue-500" /> 
            : <Square size={18} />
          }
        </button>
      )
    },
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
      key: "status", // Changed from 'actions' to use SmartTable's custom render for the whole cell if needed, but 'actions' key is fine for custom render
      label: "عملیات",
      width: "w-48",
      render: (item) => (
         <div className="flex items-center gap-2 justify-end">
            <button 
               onClick={(e) => { e.stopPropagation(); updateStatusMutation.mutate({ ids: [item.master_id], status: 'approved' }); }}
               className="flex items-center gap-1 px-3 py-1.5 bg-emerald-600/20 hover:bg-emerald-600 text-emerald-400 hover:text-white rounded-lg text-xs font-bold transition-all"
            >
               <CheckCircle2 size={14} /> تایید
            </button>
            <button 
               onClick={(e) => { 
                  e.stopPropagation(); 
                  const r = prompt("دلیل رد:");
                  if(r) updateStatusMutation.mutate({ ids: [item.master_id], status: 'rejected', reason: r }); 
               }}
               className="flex items-center gap-1 px-3 py-1.5 bg-red-600/20 hover:bg-red-600 text-red-400 hover:text-white rounded-lg text-xs font-bold transition-all"
            >
               <XCircle size={14} /> رد
            </button>
         </div>
      )
    }
  ];

  return (
    <div className="h-full flex flex-col space-y-4 relative">
       {/* Batch Actions UI */}
       {selectedIds.size > 0 && (
          <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-20 flex items-center gap-3 px-4 py-2 bg-blue-600 text-white rounded-2xl shadow-2xl shadow-blue-600/40 animate-in slide-in-from-bottom-4 fade-in duration-300">
             <span className="font-bold text-sm ml-2">{selectedIds.size} مورد انتخاب شده</span>
             <div className="h-4 w-px bg-white/20" />
             <button onClick={handleBatchApprove} className="flex items-center gap-1 hover:bg-white/10 px-2 py-1 rounded-lg transition-colors">
                <CheckCircle2 size={16} /> تایید همه
             </button>
             <button onClick={handleBatchReject} className="flex items-center gap-1 hover:bg-white/10 px-2 py-1 rounded-lg transition-colors">
                <XCircle size={16} /> رد همه
             </button>
          </div>
       )}

       <div className="flex justify-between items-center px-2">
          {pendingEvents.length > 0 && (
            <button onClick={toggleSelectAll} className="flex items-center gap-2 text-xs text-gray-400 hover:text-blue-400 transition-colors">
               {selectedIds.size === pendingEvents.length ? <CheckSquare size={14} /> : <Square size={14} />}
               انتخاب همه ({pendingEvents.length})
            </button>
          )}
       </div>

       {pendingEvents.length === 0 ? (
          <div className="flex-1 flex flex-col items-center justify-center text-gray-500 bg-[#1e1e1e]/40 rounded-2xl border border-white/5 border-dashed">
             <div className="p-4 bg-white/5 rounded-full mb-3"><CheckCircle2 size={40} className="text-emerald-500/50" /></div>
             <p className="font-bold">هیچ رویدادی در انتظار تایید نیست</p>
          </div>
       ) : (
          <SmartTable 
             title="صف انتظار"
             icon={Layers}
             data={pendingEvents}
             columns={columns}
          />
       )}
    </div>
  );
}