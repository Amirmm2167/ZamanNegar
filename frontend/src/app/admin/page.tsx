"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import AdminSidebar from "@/components/admin/AdminSidebar";
import AdminReports from "@/components/admin/AdminReports"; 
import AdminHolidays from "@/components/admin/AdminHolidays"; 
import AdminCompanies from "@/components/admin/AdminCompanies"; 
import AdminAnalytics from "@/components/admin/AdminAnalytics"; 
import AdminIssues from "@/components/admin/AdminIssues"; // NEW

export default function AdminDashboard() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState("companies");
  

  const handleLogout = () => {
    localStorage.clear();
    router.push("/login");
  };

  return (
    <div className="flex h-screen text-gray-200" dir="rtl">
      <AdminSidebar/>
      
      <main className="flex-1 p-8 overflow-y-auto custom-scrollbar">
        <div className="max-w-7xl mx-auto">
            {activeTab === "reports" && <AdminReports />}
            {activeTab === "holidays" && <AdminHolidays />}
            {activeTab === "companies" && <AdminCompanies />}
            {activeTab === "issues" && <AdminIssues />}
            {activeTab === "analytics" && <AdminAnalytics />} 
        </div>
      </main>
    </div>
  );
}