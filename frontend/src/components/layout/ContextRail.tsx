"use client";

import { useLayoutStore } from "@/stores/layoutStore";
import { X, Calendar, Clock, User, MapPin } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

export default function ContextRail() {
  const { selectedEventId, setSelectedEventId } = useLayoutStore();
  
  // In a real app, you'd fetch the specific event data here using React Query
  // const { data: event } = useQuery(...)

  return (
    <AnimatePresence>
      {selectedEventId && (
        <motion.div
          initial={{ x: "-100%", opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          exit={{ x: "-100%", opacity: 0 }}
          transition={{ type: "spring", damping: 25, stiffness: 200 }}
          className="fixed top-0 left-0 h-full w-[400px] z-40 bg-[#1e1e1e]/95 backdrop-blur-xl border-r border-white/5 shadow-2xl pt-20 px-6"
        >
          {/* Header */}
          <div className="flex justify-between items-start mb-8">
             <h2 className="text-2xl font-bold text-white">جزئیات رویداد</h2>
             <button 
               onClick={() => setSelectedEventId(null)}
               className="p-2 rounded-full hover:bg-white/10 text-gray-400 hover:text-white transition-colors"
             >
               <X size={24} />
             </button>
          </div>

          {/* Placeholder Content for Now */}
          <div className="space-y-6 text-gray-300">
             <div className="p-4 rounded-2xl bg-white/5 border border-white/5">
                <div className="flex items-center gap-3 mb-2 text-blue-400">
                   <Calendar size={20} />
                   <span className="text-sm font-medium">زمان برگزاری</span>
                </div>
                <p className="text-lg font-mono">1403/10/18 - 14:00</p>
             </div>

             <div className="p-4 rounded-2xl bg-white/5 border border-white/5">
                <div className="flex items-center gap-3 mb-2 text-emerald-400">
                   <MapPin size={20} />
                   <span className="text-sm font-medium">مکان / دپارتمان</span>
                </div>
                <p className="text-lg">اتاق جلسات اصلی</p>
             </div>
             
             {/* Actions */}
             <div className="flex gap-3 mt-8">
                <button className="flex-1 py-3 rounded-xl bg-blue-600 text-white font-medium hover:bg-blue-500 transition-colors">
                   ویرایش
                </button>
                <button className="flex-1 py-3 rounded-xl bg-red-500/10 text-red-400 font-medium hover:bg-red-500/20 transition-colors">
                   حذف
                </button>
             </div>
          </div>

        </motion.div>
      )}
    </AnimatePresence>
  );
}