"use client";

import { useState } from "react";
import AdminSidebar from "@/components/admin/AdminSidebar";
import AdminHolidays from "@/components/admin/AdminHolidays"; 
import AdminCompanies from "@/components/admin/AdminCompanies"; 
import AdminAnalytics from "@/components/admin/AdminAnalytics"; 
import AdminIssues from "@/components/admin/AdminIssues"; 
import AdminBroadcasts from "@/components/admin/AdminBroadcasts";
import AdminSecurity from "@/components/admin/AdminSecurity";
import AdminUsers from "@/components/admin/AdminUsers"; // Using the component we created in Step 3
import CalendarGrid from "@/components/CalendarGrid"; // Re-using your main calendar grid

export default function AdminDashboard() {
  const [activeTab, setActiveTab] = useState("dashboard");

  const renderContent = () => {
    switch(activeTab) {
      case "dashboard": return <AdminAnalytics />;
      case "calendar": return (
        <div className="h-[calc(100vh-60px)] flex flex-col">
            <h2 className="text-2xl font-bold text-white mb-4">تقویم سازمانی</h2>
            <div className="flex-1 bg-[#0a0c10] border border-white/5 rounded-2xl overflow-hidden relative">
               <CalendarGrid />
            </div>
        </div>
      );
      case "broadcasts": return <AdminBroadcasts />;
      case "users": return <AdminUsers />;
      case "companies": return <AdminCompanies />;
      case "holidays": return <AdminHolidays />;
      case "security": return <AdminSecurity />;
      case "analytics": return <AdminAnalytics />;
      case "issues": return <AdminIssues />;
      default: return <AdminAnalytics />;
    }
  };

  return (
    <div className="flex h-screen overflow-hidden">
      {/* Sidebar is now controlled here */}
      <AdminSidebar activeTab={activeTab} setActiveTab={setActiveTab} />
      
      {/* Main Content Area */}
      <main className="flex-1 mr-[240px] p-8 h-full overflow-y-auto custom-scrollbar">
        <div className="max-w-7xl mx-auto animate-in fade-in duration-300">
            {renderContent()}
        </div>
      </main>
    </div>
  );
}