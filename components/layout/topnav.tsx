"use client";

import { Bell, Search, Settings, Sun, Moon, ChevronDown, User, LogOut } from "lucide-react";
import { useState, useEffect } from "react";
import { signOut } from "next-auth/react";
import { cn } from "@/lib/utils";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

const INITIAL_NOTIFICATIONS = [
  { id: 1, title: "New order received", desc: "Order #ORD-2026-081 needs fulfillment", time: "2m ago", read: false },
  { id: 2, title: "Low stock alert", desc: "iPhone 15 Pro Max is running low (4 items left)", time: "1h ago", read: false },
  { id: 3, title: "Monthly report ready", desc: "July 2026 financial report has been generated", time: "3h ago", read: true },
];

export function Topnav() {
  const [notifications, setNotifications] = useState(INITIAL_NOTIFICATIONS);
  const unreadCount = notifications.filter(n => !n.read).length;

  // Simulate incoming notifications
  useEffect(() => {
    const interval = setInterval(() => {
      setNotifications(prev => {
        const newNotif = {
          id: Date.now(),
          title: "System Update",
          desc: "New data sync completed automatically.",
          time: "Just now",
          read: false
        };
        return [newNotif, ...prev].slice(0, 10); // Keep max 10
      });
    }, 45000); // Every 45 seconds

    return () => clearInterval(interval);
  }, []);

  const markAllRead = () => {
    setNotifications(notifications.map(n => ({ ...n, read: true })));
  };

  return (
    <header className="fixed top-0 right-0 left-64 h-16 bg-white/80 backdrop-blur-xl border-b border-black/[0.04] z-30 flex items-center justify-between px-6 shadow-[0_1px_2px_rgba(0,0,0,0.02)] transition-all">
      {/* Search */}
      <div className="flex items-center gap-4">
        <div className="relative group">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 group-focus-within:text-[#30539C] transition-colors" />
          <input 
            type="text" 
            placeholder="Search anything (Cmd+K)" 
            className="w-72 h-10 pl-9 pr-4 rounded-xl bg-slate-100/50 border border-transparent focus:border-[#30539C]/20 focus:bg-white text-sm outline-none transition-all focus:shadow-[0_0_0_4px_rgba(48,83,156,0.1)] placeholder:text-slate-400"
          />
        </div>
      </div>

      {/* Right Actions */}
      <div className="flex items-center gap-2">
        {/* Notifications */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className="relative w-10 h-10 flex items-center justify-center rounded-full hover:bg-slate-100 text-slate-500 hover:text-slate-800 transition-colors">
              <Bell className="w-5 h-5" />
              {unreadCount > 0 && (
                <span className="absolute top-2 right-2 w-2 h-2 bg-red-500 rounded-full border-2 border-white"></span>
              )}
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-80 rounded-xl">
            <div className="flex items-center justify-between px-4 py-2 border-b">
              <p className="font-semibold text-sm">Notifications</p>
              <button onClick={markAllRead} className="text-[10px] font-medium text-[#30539C] hover:underline">Mark all as read</button>
            </div>
            <div className="max-h-[300px] overflow-y-auto">
              {notifications.map((n) => (
                <div key={n.id} className={cn("p-3 hover:bg-slate-50 border-b last:border-0 cursor-pointer transition-colors", !n.read && "bg-slate-50/50")}>
                  <div className="flex items-start gap-3">
                    {!n.read && <div className="w-1.5 h-1.5 rounded-full bg-[#30539C] mt-1.5 flex-shrink-0" />}
                    <div className={cn("flex-1", n.read && "pl-3.5")}>
                      <p className="text-sm font-medium text-foreground">{n.title}</p>
                      <p className="text-xs text-slate-500 mt-0.5">{n.desc}</p>
                      <p className="text-[10px] text-slate-400 mt-1">{n.time}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
            {/* View all button removed as requested */}
          </DropdownMenuContent>
        </DropdownMenu>

        {/* <button className="w-10 h-10 flex items-center justify-center rounded-full hover:bg-slate-100 text-slate-500 hover:text-slate-800 transition-colors">
          <Settings className="w-5 h-5" />
        </button> */}

        <div className="w-px h-6 bg-slate-200 mx-1"></div>

        {/* Profile */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className="flex items-center gap-3 pl-2 pr-1 py-1 rounded-full hover:bg-slate-100 transition-colors text-left border border-transparent hover:border-slate-200">
              <div className="flex flex-col items-end">
                <span className="text-sm font-semibold text-slate-800 leading-none">Admin User</span>
                <span className="text-[10px] text-slate-500 font-medium mt-1">Super Admin</span>
              </div>
              <div className="w-9 h-9 rounded-full bg-gradient-to-tr from-[#30539C] to-[#4A75CD] flex items-center justify-center text-white font-bold shadow-inner">
                A
              </div>
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56 rounded-xl">
            <DropdownMenuLabel className="font-normal p-3">
              <div className="flex flex-col space-y-1">
                <p className="text-sm font-semibold text-foreground">Admin User</p>
                <p className="text-xs text-slate-500">admin@valueplus.in</p>
              </div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem className="cursor-pointer py-2">
              <User className="mr-2 h-4 w-4 text-slate-500" />
              <span>Profile Settings</span>
            </DropdownMenuItem>
            {/* <DropdownMenuItem className="cursor-pointer py-2">
              <Settings className="mr-2 h-4 w-4 text-slate-500" />
              <span>Preferences</span>
            </DropdownMenuItem> */}
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => signOut({ callbackUrl: '/login' })} className="cursor-pointer py-2 text-red-600 focus:text-red-600 focus:bg-red-50">
              <LogOut className="mr-2 h-4 w-4" />
              <span>Log out</span>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}
