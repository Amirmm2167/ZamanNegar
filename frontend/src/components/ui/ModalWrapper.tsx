"use client";

import { Fragment } from "react";
import { Dialog, Transition } from "@headlessui/react";
import { X } from "lucide-react";
import clsx from "clsx";

interface ModalWrapperProps {
  isOpen: boolean;
  onClose: () => void;
  title?: React.ReactNode;
  children: React.ReactNode;
  size?: "sm" | "md" | "lg" | "xl" | "2xl" | "full";
  noPadding?: boolean;
}

const SIZES = {
  sm: "max-w-sm",
  md: "max-w-md",
  lg: "max-w-2xl",
  xl: "max-w-4xl",
  "2xl": "max-w-6xl",
  full: "max-w-[98vw] h-[95vh]",
};

export default function ModalWrapper({ 
  isOpen, 
  onClose, 
  title, 
  children, 
  size = "md",
  noPadding = false
}: ModalWrapperProps) {
  return (
    <Transition show={isOpen} as={Fragment}>
      <Dialog 
        as="div" 
        className="relative z-[100] font-[family-name:var(--font-pinar)]" 
        onClose={onClose} 
        dir="rtl"
      >
        {/* 1. Backdrop */}
        <Transition.Child
          as={Fragment}
          enter="ease-out duration-300"
          enterFrom="opacity-0"
          enterTo="opacity-100"
          leave="ease-in duration-200"
          leaveFrom="opacity-100"
          leaveTo="opacity-0"
        >
          <div 
            className="fixed inset-0 bg-black/80 backdrop-blur-md transition-opacity" 
            aria-hidden="true"
          />
        </Transition.Child>

        {/* 2. Scrollable Container */}
        <div className="fixed inset-0 z-10 overflow-y-auto">
          <div className="flex min-h-full items-center justify-center p-4 text-center sm:p-6">
            
            {/* 3. The Modal Panel */}
            <Transition.Child
              as={Fragment}
              enter="ease-out duration-300"
              enterFrom="opacity-0 scale-95 translate-y-4"
              enterTo="opacity-100 scale-100 translate-y-0"
              leave="ease-in duration-200"
              leaveFrom="opacity-100 scale-100 translate-y-0"
              leaveTo="opacity-0 scale-95 translate-y-4"
            >
              <Dialog.Panel 
                className={clsx(
                  "relative transform overflow-hidden rounded-[32px] bg-[#09090b] border border-white/[0.08] text-right shadow-2xl transition-all flex flex-col max-h-[90vh] ring-1 ring-white/5",
                  "w-full", // <--- FIX: Forces panel to take full width up to max-w constraint
                  SIZES[size]
                )}
                onClick={(e) => e.stopPropagation()} 
              >
                {/* Header Logic */}
                {title ? (
                  <div className="flex items-center justify-between border-b border-white/[0.06] bg-[#121214]/50 backdrop-blur-xl px-8 py-5 shrink-0 relative z-20">
                    <div className="text-xl font-bold text-white flex items-center gap-3">
                      {title}
                    </div>
                    <button
                      type="button"
                      onClick={onClose}
                      className="group rounded-xl p-2.5 text-gray-400 hover:bg-white/10 hover:text-white transition-all outline-none"
                    >
                      <X size={22} className="group-hover:rotate-90 transition-transform duration-300" />
                    </button>
                  </div>
                ) : (
                  // Absolute Close Button (for custom headers)
                  <button
                    type="button"
                    onClick={onClose}
                    className="absolute top-6 left-6 z-50 rounded-xl p-2.5 text-gray-400 hover:bg-white/10 hover:text-white transition-all outline-none bg-black/20 backdrop-blur-sm border border-white/5"
                  >
                    <X size={22} />
                  </button>
                )}

                {/* Content */}
                <div className={clsx("flex-1 overflow-y-auto custom-scrollbar relative z-10", !noPadding && "p-8")}>
                  {children}
                </div>
              </Dialog.Panel>
            </Transition.Child>
          </div>
        </div>
      </Dialog>
    </Transition>
  );
}