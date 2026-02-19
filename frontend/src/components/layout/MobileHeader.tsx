"use client";

import { useState, Fragment } from "react";
import { useHeaderLogic } from "@/hooks/useHeaderLogic";
import { Menu, Search, ChevronDown, RefreshCw } from "lucide-react";
import { Dialog, Transition } from "@headlessui/react";
import clsx from "clsx";
import { toPersianDigits } from "@/lib/utils";
import DatePicker from "@/components/DatePicker";
import NotificationBell from "./NotificationBell"; // <--- INTEGRATED

interface MobileHeaderProps {
  onMenuClick: () => void;
}

export default function MobileHeader({ onMenuClick }: MobileHeaderProps) {
  const { title, currentDate, setCurrentDate, jumpToToday, handleHardRefresh, isRefreshing } = useHeaderLogic();
  const [isDatePickerOpen, setIsDatePickerOpen] = useState(false);
  const [isSearchOpen, setIsSearchOpen] = useState(false);

  return (
    <>
      <header className="h-14 flex items-center justify-between px-3 bg-[#0a0c10]/95 backdrop-blur-md border-b border-white/5 sticky top-0 z-40 select-none">
        
        {/* Right (RTL): Hamburger & Title */}
        <div className="flex items-center gap-2">
          <button 
            onClick={onMenuClick}
            className="p-1.5 text-gray-400 hover:text-white rounded-lg active:bg-white/10 transition-colors"
          >
            <Menu size={22} />
          </button>

          <div 
            onClick={() => setIsDatePickerOpen(true)}
            className="flex items-center gap-1.5 px-2 py-1 rounded-lg active:bg-white/5 transition-colors cursor-pointer"
          >
            <span className="text-base font-bold text-white whitespace-nowrap">{title}</span>
            <ChevronDown size={14} className="text-gray-500" />
          </div>
        </div>

        {/* Left (RTL): Actions Toolbar */}
        <div className="flex items-center gap-1">
           <button 
             onClick={jumpToToday}
             className="px-2.5 py-1 text-[10px] font-bold bg-white/5 text-gray-300 rounded-md active:bg-white/10 transition-colors whitespace-nowrap mr-1"
           >
             امروز
           </button>
           
           <button 
             onClick={() => setIsSearchOpen(true)}
             className="p-1.5 text-gray-400 hover:text-white rounded-lg active:bg-white/10 transition-colors"
           >
             <Search size={18} />
           </button>

           <button 
             onClick={handleHardRefresh}
             className="p-1.5 text-gray-400 hover:text-white rounded-lg active:bg-white/10 transition-colors"
           >
             <RefreshCw size={18} className={clsx(isRefreshing && "animate-spin")} />
           </button>

           {/* Native Notification Integration */}
           <NotificationBell isMobile={true} />
        </div>
      </header>

      {/* --- DATE PICKER SHEET --- */}
      <Transition appear show={isDatePickerOpen} as={Fragment}>
        <Dialog as="div" className="relative z-[150]" onClose={() => setIsDatePickerOpen(false)} dir="rtl">
          <Transition.Child
            as={Fragment}
            enter="ease-out duration-200"
            enterFrom="opacity-0"
            enterTo="opacity-100"
            leave="ease-in duration-150"
            leaveFrom="opacity-100"
            leaveTo="opacity-0"
          >
            <div className="fixed inset-0 bg-black/60 backdrop-blur-sm" />
          </Transition.Child>

          <div className="fixed inset-0 overflow-hidden">
            <div className="absolute inset-0 overflow-hidden">
              <div className="pointer-events-none fixed inset-x-0 bottom-0 flex max-h-full">
                <Transition.Child
                  as={Fragment}
                  enter="transform transition ease-in-out duration-300"
                  enterFrom="translate-y-full"
                  enterTo="translate-y-0"
                  leave="transform transition ease-in-out duration-300"
                  leaveFrom="translate-y-0"
                  leaveTo="translate-y-full"
                >
                  <Dialog.Panel className="pointer-events-auto w-full bg-[#18181b] border-t border-white/10 shadow-2xl rounded-t-3xl pb-8">
                    <div className="p-4 border-b border-white/5 flex justify-between items-center bg-white/[0.02]">
                      <span className="text-sm font-bold text-gray-400">انتخاب تاریخ</span>
                      <div className="w-12 h-1 bg-gray-700 rounded-full mx-auto" />
                    </div>
                    <div className="p-4">
                       <DatePicker 
                          value={currentDate.toISOString().split('T')[0]} 
                          onChange={(d) => {
                            if (d) {
                                const newDate = new Date(d);
                                if (!isNaN(newDate.getTime())) {
                                    setCurrentDate(newDate);
                                    setIsDatePickerOpen(false);
                                }
                            }
                          }}
                          onClose={() => setIsDatePickerOpen(false)}
                       />
                    </div>
                  </Dialog.Panel>
                </Transition.Child>
              </div>
            </div>
          </div>
        </Dialog>
      </Transition>

      {/* --- SEARCH OVERLAY --- */}
      <Transition appear show={isSearchOpen} as={Fragment}>
        <Dialog as="div" className="relative z-[150]" onClose={() => setIsSearchOpen(false)} dir="rtl">
           <Transition.Child
             as={Fragment}
             enter="ease-out duration-200"
             enterFrom="opacity-0"
             enterTo="opacity-100"
             leave="ease-in duration-150"
             leaveFrom="opacity-100"
             leaveTo="opacity-0"
           >
             <div className="fixed inset-0 bg-[#0a0c10] z-[150] flex flex-col">
                <div className="h-16 flex items-center gap-2 px-4 border-b border-white/10">
                   <Search size={20} className="text-gray-500" />
                   <input 
                      autoFocus
                      placeholder="جستجو..." 
                      className="flex-1 bg-transparent text-white placeholder-gray-600 outline-none text-lg"
                   />
                   <button onClick={() => setIsSearchOpen(false)} className="text-sm text-blue-400 font-bold px-2">لغو</button>
                </div>
                <div className="p-8 text-center text-gray-500 text-sm">
                   نتایج جستجو اینجا نمایش داده می‌شود
                </div>
             </div>
           </Transition.Child>
        </Dialog>
      </Transition>
    </>
  );
}