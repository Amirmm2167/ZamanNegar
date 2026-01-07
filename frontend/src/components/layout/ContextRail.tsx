"use client";

import { useLayoutStore } from "@/stores/layoutStore";
import { 
  X, Calendar, Clock, MapPin, User, Target, Flag, 
  Edit, Trash2, CheckCircle2, Ban, AlertCircle, Type 
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import api from "@/lib/api";
import { CalendarEvent, Department } from "@/types";
import { toPersianDigits } from "@/lib/utils";
import { useState } from "react";
import EventModal from "@/components/EventModal"; // We use this for full editing

export default function ContextRail() {
  const { selectedEventId, setSelectedEventId } = useLayoutStore();
  const queryClient = useQueryClient();
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);

  // 1. Fetch Event Data (From Cache or API)
  const { data: events } = useQuery<CalendarEvent[]>({
    queryKey: ['events'],
    enabled: false // Use cached data only
  });
  
  const { data: departments } = useQuery<Department[]>({ 
      queryKey: ['departments'], 
      enabled: false 
  });
  
  // Find the specific event
  const event = events?.find(e => e.id === selectedEventId);
  const department = departments?.find(d => d.id === event?.department_id);

  // 2. Mutations
  const deleteMutation = useMutation({
    mutationFn: (id: number) => api.delete(`/events/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['events'] });
      setSelectedEventId(null);
    }
  });

  const updateStatusMutation = useMutation({
    mutationFn: ({ id, status, reason }: { id: number; status: string; reason?: string }) => 
      api.patch(`/events/${id}`, { status, rejection_reason: reason }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['events'] })
  });

  if (!selectedEventId) return null;

  // Loading State (if event not found in cache yet)
  if (!event) return null; 

  const handleDelete = () => {
    if (confirm("آیا از حذف این رویداد اطمینان دارید؟")) {
      deleteMutation.mutate(event.id);
    }
  };

  const handleApprove = () => updateStatusMutation.mutate({ id: event.id, status: 'approved' });
  const handleReject = () => {
    const reason = prompt("دلیل رد شدن:");
    if (reason) updateStatusMutation.mutate({ id: event.id, status: 'rejected', reason });
  };

  // Helper to format dates
  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('fa-IR', { weekday: 'long', day: 'numeric', month: 'long' });
  };
  const formatTime = (dateStr: string) => {
    return toPersianDigits(new Date(dateStr).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' }));
  };

  return (
    <>
      <AnimatePresence>
        {selectedEventId && (
          <motion.div
            initial={{ x: "-100%", opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: "-100%", opacity: 0 }}
            transition={{ type: "spring", damping: 25, stiffness: 300 }}
            className="fixed top-0 left-0 h-full w-[400px] z-[40] bg-[#09090b]/95 backdrop-blur-2xl border-r border-white/10 shadow-[20px_0_50px_rgba(0,0,0,0.5)] flex flex-col"
          >
            {/* Header Image / Color Strip */}
            <div className="h-32 relative shrink-0">
               <div 
                 className="absolute inset-0 opacity-40"
                 style={{ backgroundColor: department?.color || '#3b82f6' }} 
               />
               <div className="absolute inset-0 bg-gradient-to-b from-transparent to-[#09090b]" />
               
               <button 
                 onClick={() => setSelectedEventId(null)}
                 className="absolute top-6 left-6 p-2 rounded-full bg-black/20 hover:bg-white/10 text-white transition-colors border border-white/5 backdrop-blur-md"
               >
                 <X size={20} />
               </button>

               <div className="absolute bottom-4 right-6">
                  <div className={`
                    inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold border
                    ${event.status === 'approved' ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30' : 
                      event.status === 'rejected' ? 'bg-red-500/20 text-red-400 border-red-500/30' : 
                      'bg-yellow-500/20 text-yellow-400 border-yellow-500/30'}
                  `}>
                    {event.status === 'approved' && <CheckCircle2 size={12} />}
                    {event.status === 'rejected' && <Ban size={12} />}
                    {event.status === 'pending' && <AlertCircle size={12} />}
                    {event.status === 'approved' ? 'تایید شده' : event.status === 'rejected' ? 'رد شده' : 'در انتظار تایید'}
                  </div>
               </div>
            </div>

            {/* Content Scrollable */}
            <div className="flex-1 overflow-y-auto custom-scrollbar px-6 py-2 space-y-6">
               
               {/* Title */}
               <div>
                 <h1 className="text-2xl font-bold text-white leading-snug">{event.title}</h1>
                 {department && (
                    <div className="flex items-center gap-2 mt-2 text-sm text-gray-400">
                        <span className="w-2 h-2 rounded-full" style={{ backgroundColor: department.color }} />
                        {department.name}
                    </div>
                 )}
               </div>

               {/* Time Card */}
               <div className="p-4 rounded-2xl bg-white/5 border border-white/5 flex flex-col gap-3">
                  <div className="flex items-center gap-3">
                     <div className="p-2 rounded-lg bg-blue-500/10 text-blue-400"><Calendar size={18} /></div>
                     <div>
                        <div className="text-xs text-gray-500 mb-0.5">تاریخ</div>
                        <div className="text-sm font-medium text-gray-200">{formatDate(event.start_time)}</div>
                     </div>
                  </div>
                  <div className="h-px bg-white/5 mx-2" />
                  <div className="flex items-center gap-3">
                     <div className="p-2 rounded-lg bg-purple-500/10 text-purple-400"><Clock size={18} /></div>
                     <div>
                        <div className="text-xs text-gray-500 mb-0.5">زمان</div>
                        <div className="text-sm font-medium text-gray-200">
                           {event.is_all_day ? "تمام روز" : `${formatTime(event.start_time)} - ${formatTime(event.end_time)}`}
                        </div>
                     </div>
                  </div>
               </div>

               {/* Description */}
               {event.description && (
                 <div className="space-y-2">
                    <h3 className="text-xs font-bold text-gray-500 uppercase flex items-center gap-2">
                        <Type size={14} /> توضیحات
                    </h3>
                    <p className="text-sm text-gray-300 leading-relaxed bg-black/20 p-3 rounded-xl border border-white/5">
                       {event.description}
                    </p>
                 </div>
               )}

               {/* Metadata Grid */}
               <div className="grid grid-cols-1 gap-3">
                  {event.goal && (
                    <div className="bg-white/5 p-3 rounded-xl border border-white/5">
                       <div className="text-xs text-yellow-500/80 mb-1 flex items-center gap-1"><Flag size={12}/> هدف</div>
                       <div className="text-sm text-gray-300">{event.goal}</div>
                    </div>
                  )}
                  {(event as any).target_audience && (
                    <div className="bg-white/5 p-3 rounded-xl border border-white/5">
                       <div className="text-xs text-blue-500/80 mb-1 flex items-center gap-1"><Target size={12}/> مخاطبین</div>
                       <div className="text-sm text-gray-300">{(event as any).target_audience}</div>
                    </div>
                  )}
                  {(event as any).organizer && (
                    <div className="bg-white/5 p-3 rounded-xl border border-white/5">
                       <div className="text-xs text-emerald-500/80 mb-1 flex items-center gap-1"><User size={12}/> برگزار کننده</div>
                       <div className="text-sm text-gray-300">{(event as any).organizer}</div>
                    </div>
                  )}
               </div>

               {/* Rejection Reason */}
               {event.status === 'rejected' && event.rejection_reason && (
                   <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-200 text-sm">
                      <strong className="block mb-1 text-red-400">علت رد شدن:</strong>
                      {event.rejection_reason}
                   </div>
               )}
            </div>

            {/* Footer Actions */}
            <div className="p-5 border-t border-white/10 bg-[#09090b] shrink-0 flex flex-col gap-3">
               
               {/* Quick Actions for Managers */}
               {event.status === 'pending' && (
                  <div className="flex gap-2">
                     <button onClick={handleApprove} className="flex-1 py-2.5 bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-400 border border-emerald-600/30 rounded-xl text-sm font-bold transition-all">
                        تایید رویداد
                     </button>
                     <button onClick={handleReject} className="flex-1 py-2.5 bg-red-600/20 hover:bg-red-600/30 text-red-400 border border-red-600/30 rounded-xl text-sm font-bold transition-all">
                        رد رویداد
                     </button>
                  </div>
               )}

               <div className="flex gap-2">
                  <button 
                    onClick={() => setIsEditModalOpen(true)}
                    className="flex-1 py-3 bg-blue-600 hover:bg-blue-500 text-white rounded-xl font-bold shadow-[0_0_15px_rgba(37,99,235,0.3)] transition-all flex justify-center items-center gap-2"
                  >
                     <Edit size={16} /> ویرایش
                  </button>
                  <button 
                    onClick={handleDelete}
                    className="px-4 py-3 bg-white/5 hover:bg-red-500/10 text-gray-400 hover:text-red-400 border border-white/10 hover:border-red-500/20 rounded-xl transition-all"
                  >
                     <Trash2 size={18} />
                  </button>
               </div>
            </div>

          </motion.div>
        )}
      </AnimatePresence>

      {/* Hidden Edit Modal - Triggered by Rail */}
      <EventModal 
         isOpen={isEditModalOpen}
         onClose={() => setIsEditModalOpen(false)}
         onSuccess={() => {
            queryClient.invalidateQueries({ queryKey: ['events'] });
            setIsEditModalOpen(false);
         }}
         eventToEdit={event}
         currentUserId={0} // Ideally fetch this from store/auth
      />
    </>
  );
}