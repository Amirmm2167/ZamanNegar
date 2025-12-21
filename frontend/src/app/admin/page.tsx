"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import AdminSidebar from "@/components/admin/AdminSidebar";
import AdminReports from "@/components/admin/AdminReports"; 
import AdminHolidays from "@/components/admin/AdminHolidays"; 
import AdminCompanies from "@/components/admin/AdminCompanies"; 

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
    // BG is transparent to see stars
    <div className="flex h-screen text-gray-200" dir="rtl">
      {/* Sidebar Glass */}
      <AdminSidebar 
        activeTab={activeTab} 
        onChangeTab={setActiveTab} 
        onLogout={handleLogout} 
      />
      
      <main className="flex-1 p-8 overflow-y-auto custom-scrollbar">
        {/* Content Area */}
        <div className="max-w-7xl mx-auto">
            {activeTab === "reports" && <AdminReports />}
            {activeTab === "holidays" && <AdminHolidays />}
            {activeTab === "companies" && <AdminCompanies />}
        </div>
      </main>
    </div>
  );
}