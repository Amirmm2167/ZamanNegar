"use client";

import { User as UserIcon, MoreHorizontal, Ghost, ShieldAlert, Shield } from "lucide-react";
import clsx from "clsx";

interface UserListProps {
    users: any[];
    onSelectUser: (user: any) => void;
}

export default function UserList({ users, onSelectUser }: UserListProps) {
    return (
        <div className="flex flex-col h-full">
            {/* Table Header */}
            <div className="grid grid-cols-12 gap-4 px-6 py-3 border-b border-white/5 text-[10px] font-bold text-gray-500 uppercase tracking-wider">
                <div className="col-span-4">کاربر</div>
                <div className="col-span-3">دپارتمان</div>
                <div className="col-span-2">نقش</div>
                <div className="col-span-2">وضعیت</div>
                <div className="col-span-1"></div>
            </div>

            {/* List */}
            <div className="flex-1 overflow-y-auto custom-scrollbar p-2 space-y-1">
                {users.map((u) => (
                    <div
                        key={u.id}
                        onClick={() => onSelectUser(u)}
                        className="grid grid-cols-12 gap-4 items-center px-4 py-3 hover:bg-white/5 rounded-xl cursor-pointer transition-colors group"
                    >
                        {/* User Info */}
                        <div className="col-span-4 flex items-center gap-3">
                            <div className={clsx("w-9 h-9 rounded-full flex items-center justify-center text-xs font-bold ring-2 ring-[#09090b]",
                                u.type === 'ghost' ? "bg-white/10 text-gray-400" : "bg-blue-600/20 text-blue-400"
                            )}>
                                {u.type === 'ghost' ? <Ghost size={16} /> : u.display_name?.[0]}
                            </div>
                            <div className="overflow-hidden">
                                <div className="text-sm font-bold text-gray-200 truncate">{u.display_name}</div>
                                <div className="text-[10px] text-gray-500 font-mono dir-ltr truncate text-right">{u.phone_number || u.username}</div>
                            </div>
                        </div>

                        {/* Department */}
                        <div className="col-span-3">
                            {u.role === "manager" ?
                                <span className="text-[10px] text-indigo-500 flex items-center gap-1 bg-indigo-500/10 px-2 py-1 rounded-md w-fit">
                                    <Shield size={12} /> مدیرکل شرکت
                                </span>
                                : <>
                                    {u.department_id ? (
                                        <span className="text-xs text-gray-400 bg-white/5 px-2 py-1 rounded-md">
                                            {u.department_name || "ID: " + u.department_id}
                                        </span>
                                    ) : (
                                        <span className="text-[10px] text-amber-500 flex items-center gap-1 bg-amber-500/10 px-2 py-1 rounded-md w-fit">
                                            <ShieldAlert size={12} /> تعیین نشده
                                        </span>
                                    )}
                                </>}
                        </div>

                        {/* Role */}
                        <div className="col-span-2">
                            <span className="text-xs text-gray-400">{u.role}</span>
                        </div>

                        {/* Status */}
                        <div className="col-span-2">
                            <span className={clsx("text-[10px] px-2 py-0.5 rounded-full border",
                                u.status === 'active' ? "border-emerald-500/20 text-emerald-400 bg-emerald-500/10" :
                                    "border-amber-500/20 text-amber-400 bg-amber-500/10"
                            )}>
                                {u.status === 'active' ? 'فعال' : 'در انتظار'}
                            </span>
                        </div>

                        {/* Actions */}
                        <div className="col-span-1 flex justify-end opacity-0 group-hover:opacity-100 transition-opacity">
                            <button className="p-1.5 hover:bg-white/10 rounded-lg text-gray-400 hover:text-white">
                                <MoreHorizontal size={16} />
                            </button>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}