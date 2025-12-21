"use client";

import { useEffect, useState, useRef } from "react";
import { useRouter } from "next/navigation";
import CalendarGrid, { CalendarGridHandle } from "@/components/CalendarGrid";
import FabMenu from "@/components/FabMenu";
import DepartmentModal from "@/components/DepartmentModal";
import UserModal from "@/components/UserModal";
import HolidayModal from "@/components/HolidayModal";
import IssueModal from "@/components/IssueModal"; // Ensure this is imported

export default function Dashboard() {
  const router = useRouter();
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);
  const [isDeptModalOpen, setIsDeptModalOpen] = useState(false);
  const [isUserModalOpen, setIsUserModalOpen] = useState(false);
  const [isHolidayModalOpen, setIsHolidayModalOpen] = useState(false);
  const [isIssueModalOpen, setIsIssueModalOpen] = useState(false);

  // Create Ref for CalendarGrid
  const calendarRef = useRef<CalendarGridHandle>(null);

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) {
      router.push("/login");
    } else {
      setIsAuthenticated(true);
    }
  }, [router]);

  if (!isAuthenticated) {
    return (
      <div className="flex h-screen items-center justify-center bg-black text-white">
        <span className="text-lg">در حال بارگذاری...</span>
      </div>
    );
  }

  return (
    <div className="h-screen bg-transparent flex flex-col overflow-hidden text-gray-200 relative z-10">
      <main className="flex-1 w-full overflow-hidden relative p-0">
        {" "}
        {/* Padding removed for full screen */}
        <CalendarGrid ref={calendarRef} />
      </main>

      <FabMenu
        onOpenDepartments={() => setIsDeptModalOpen(true)}
        onOpenUsers={() => setIsUserModalOpen(true)}
        onOpenHolidays={() => setIsHolidayModalOpen(true)}
        onOpenIssues={() => setIsIssueModalOpen(true)}
        // USE THE REF HERE
        onOpenEventModal={() => calendarRef.current?.openNewEventModal()}
      />

      <DepartmentModal
        isOpen={isDeptModalOpen}
        onClose={() => setIsDeptModalOpen(false)}
      />

      <UserModal
        isOpen={isUserModalOpen}
        onClose={() => setIsUserModalOpen(false)}
      />

      <HolidayModal
        isOpen={isHolidayModalOpen}
        onClose={() => setIsHolidayModalOpen(false)}
        onUpdate={() => {}}
      />

      <IssueModal
        isOpen={isIssueModalOpen}
        onClose={() => setIsIssueModalOpen(false)}
      />
    </div>
  );
}
