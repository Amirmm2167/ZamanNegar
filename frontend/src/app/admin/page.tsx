"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import AdminSidebar from "@/components/admin/AdminSidebar";
import AdminReports from "@/components/admin/AdminReports"; 
import AdminHolidays from "@/components/admin/AdminHolidays"; 
import AdminCompanies from "@/components/admin/AdminCompanies"; 
import AdminAnalytics from "@/components/admin/AdminAnalytics"; // New Import

export default function AdminDashboard() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState("companies");
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  useEffect(() => {
    const role = localStorage.getItem("role");
    if (role !== "superadmin") router.push("/login");
    else setIsAuthenticated(true);
  }, [router]);

  const handleLogout = () => {
    localStorage.clear();
    router.push("/login");
  };

  if (!isAuthenticated) return null;

  return (
    <div className="flex h-screen text-gray-200" dir="rtl">
      <AdminSidebar 
        activeTab={activeTab} 
        onChangeTab={setActiveTab} 
        onLogout={handleLogout} 
      />
      
      <main className="flex-1 p-8 overflow-y-auto custom-scrollbar">
        <div className="max-w-7xl mx-auto">
            {activeTab === "reports" && <AdminReports />}
            {activeTab === "holidays" && <AdminHolidays />}
            {activeTab === "companies" && <AdminCompanies />}
            {activeTab === "analytics" && <AdminAnalytics />} 
        </div>
      </main>
    </div>
  );
}