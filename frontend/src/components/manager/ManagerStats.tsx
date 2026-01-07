"use client";

import { useQuery } from "@tanstack/react-query";
import api from "@/lib/api";
import SmartChart from "@/components/ui/SmartChart";
import { Users, Calendar, CheckCircle, Clock, Activity } from "lucide-react";
import { CalendarEvent, Department } from "@/types";

export default function ManagerStats() {
  // Fetch data
  const { data: events = [] } = useQuery<CalendarEvent[]>({
    queryKey: ['events'],
    queryFn: () => api.get("/events/").then(res => res.data),
  });

  const { data: users = [] } = useQuery({
    queryKey: ['users'],
    queryFn: () => api.get("/users/").then(res => res.data),
  });

  const { data: departments = [] } = useQuery<Department[]>({
    queryKey: ['departments'],
    queryFn: () => api.get("/departments/").then(res => res.data),
  });

  // --- Process Data for Charts ---

  // 1. Events by Status
  const statusData = [
    { name: "تایید شده", value: events.filter(e => e.status === 'approved').length },
    { name: "در انتظار", value: events.filter(e => e.status === 'pending').length },
    { name: "رد شده", value: events.filter(e => e.status === 'rejected').length },
  ];

  // 2. Events by Department
  const deptData = departments.map(d => ({
    name: d.name,
    count: events.filter(e => e.department_id === d.id).length
  })).filter(d => d.count > 0);

  // 3. Activity Timeline (Mock logic - grouped by hour/day in real app)
  // Here we just map start_time to days for a simple line chart
  const activityMap = events.reduce((acc, curr) => {
      const date = new Date(curr.start_time).toLocaleDateString('fa-IR');
      acc[date] = (acc[date] || 0) + 1;
      return acc;
  }, {} as Record<string, number>);
  
  const activityData = Object.keys(activityMap).map(k => ({ date: k, count: activityMap[k] })).slice(-7);

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4">
       {/* KPI Cards */}
       <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-[#1e1e1e]/60 border border-white/5 p-4 rounded-2xl flex items-center gap-4 shadow-lg">
             <div className="p-3 bg-blue-500/20 text-blue-400 rounded-xl"><Calendar size={24} /></div>
             <div>
                <div className="text-2xl font-bold text-white">{events.length}</div>
                <div className="text-xs text-gray-400">کل رویدادها</div>
             </div>
          </div>
          <div className="bg-[#1e1e1e]/60 border border-white/5 p-4 rounded-2xl flex items-center gap-4 shadow-lg">
             <div className="p-3 bg-emerald-500/20 text-emerald-400 rounded-xl"><CheckCircle size={24} /></div>
             <div>
                <div className="text-2xl font-bold text-white">{statusData[0].value}</div>
                <div className="text-xs text-gray-400">تایید شده</div>
             </div>
          </div>
          <div className="bg-[#1e1e1e]/60 border border-white/5 p-4 rounded-2xl flex items-center gap-4 shadow-lg">
             <div className="p-3 bg-purple-500/20 text-purple-400 rounded-xl"><Users size={24} /></div>
             <div>
                <div className="text-2xl font-bold text-white">{users.length}</div>
                <div className="text-xs text-gray-400">کارکنان</div>
             </div>
          </div>
          <div className="bg-[#1e1e1e]/60 border border-white/5 p-4 rounded-2xl flex items-center gap-4 shadow-lg">
             <div className="p-3 bg-yellow-500/20 text-yellow-400 rounded-xl"><Clock size={24} /></div>
             <div>
                <div className="text-2xl font-bold text-white">{statusData[1].value}</div>
                <div className="text-xs text-gray-400">در انتظار</div>
             </div>
          </div>
       </div>

       {/* Charts Row */}
       <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <SmartChart 
             title="وضعیت رویدادها" 
             data={statusData} 
             dataKey="value" 
             nameKey="name" 
             defaultType="doughnut"
             height={300}
             icon={CheckCircle}
          />
          <SmartChart 
             title="فعالیت دپارتمان‌ها" 
             data={deptData} 
             dataKey="count" 
             nameKey="name" 
             defaultType="bar" 
             color="#10b981"
             height={300}
             icon={Users}
          />
       </div>

       {/* Timeline */}
       <SmartChart 
          title="روند ثبت رویداد (۷ روز اخیر)"
          data={activityData}
          dataKey="count"
          xAxisKey="date"
          defaultType="area"
          color="#8b5cf6"
          height={250}
          icon={Activity}
       />
    </div>
  );
}