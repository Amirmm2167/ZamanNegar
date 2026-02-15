"use client";

import { useState } from "react";
import { ChevronDown, ChevronLeft, Folder, MoreHorizontal, Plus, Trash2, Edit2 } from "lucide-react";
import clsx from "clsx";
import { motion, AnimatePresence } from "framer-motion";

interface Department {
  id: number;
  name: string;
  parent_id?: number | null;
}

interface OrgTreeProps {
  departments: Department[];
  selectedId: number | null;
  onSelect: (id: number) => void;
}

export default function OrgTree({ departments, selectedId, onSelect }: OrgTreeProps) {
  const rootDepts = departments.filter((d) => !d.parent_id);

  const Node = ({ dept, level = 0 }: { dept: Department; level?: number }) => {
    const children = departments.filter((d) => d.parent_id === dept.id);
    const hasChildren = children.length > 0;
    const [isOpen, setIsOpen] = useState(true);

    return (
      <div className="select-none">
        <div
          onClick={() => onSelect(dept.id)}
          className={clsx(
            "group flex items-center gap-2 px-2 py-1.5 rounded-lg cursor-pointer transition-all text-sm mb-0.5 relative",
            selectedId === dept.id
              ? "bg-blue-600/10 text-blue-400 font-medium"
              : "text-gray-400 hover:bg-white/5 hover:text-gray-200"
          )}
          style={{ paddingRight: `${level * 16 + 8}px` }}
        >
          <button
            onClick={(e) => {
              e.stopPropagation();
              setIsOpen(!isOpen);
            }}
            className={clsx(
              "p-0.5 rounded hover:bg-white/10 transition-colors",
              !hasChildren && "opacity-0 pointer-events-none"
            )}
          >
            {isOpen ? <ChevronDown size={14} /> : <ChevronLeft size={14} />}
          </button>
          
          <Folder
            size={16}
            className={clsx(
              "shrink-0",
              selectedId === dept.id ? "fill-blue-600/20 text-blue-500" : "text-gray-500"
            )}
          />
          
          <span className="truncate flex-1">{dept.name}</span>
          
          {/* Quick Actions (Hover) */}
          {selectedId === dept.id && (
             <div className="absolute left-2 flex gap-1 bg-[#121214] shadow-sm">
                <button className="p-1 hover:text-white"><Edit2 size={12}/></button>
                <button className="p-1 hover:text-red-400"><Trash2 size={12}/></button>
             </div>
          )}
        </div>

        <AnimatePresence>
          {hasChildren && isOpen && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="overflow-hidden"
            >
              {children.map((child) => (
                <Node key={child.id} dept={child} level={level + 1} />
              ))}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    );
  };

  return (
    <div className="flex flex-col space-y-0.5">
      {rootDepts.map((d) => (
        <Node key={d.id} dept={d} />
      ))}
    </div>
  );
}