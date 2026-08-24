"use client";

import { Bell, Search, Settings, Sun, Moon, ChevronDown, User, LogOut, Sparkles, Wifi, WifiOff, RefreshCw, CloudUpload, CheckCircle2, Power } from "lucide-react";
import { useState, useEffect } from "react";
import { useSession, signOut } from "next-auth/react";
import { cn } from "@/lib/utils";
import Link from "next/link";
import { useOfflineSync } from "@/components/shared/offline-sync-provider";
import { Button } from "@/components/ui/button";
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
  const { data: session } = useSession();
  const userName = session?.user?.name || "Admin User";
  const userEmail = session?.user?.email || "admin@valueplus.in";
  const userRole = (((session?.user as any)?.role || "superadmin") as string).toUpperCase();
  const initialLetter = (userName[0] || "A").toUpperCase();

  const { isOnline, pendingCount, isSyncing, syncNow } = useOfflineSync();
  const [approvalsList, setApprovalsList] = useState<any[]>([]);
  const [pendingApprovalsCount, setPendingApprovalsCount] = useState(0);

  // Poll live approvals
  useEffect(() => {
    const fetchPending = async () => {
      try {
        const res = await fetch("/api/approvals?status=pending");
        const json = await res.json();
        if (json.success) {
          setApprovalsList(json.data || []);
          setPendingApprovalsCount(json.pendingCount || 0);
        }
      } catch (e) {
        console.error("Failed to fetch approvals in topnav", e);
      }
    };
    fetchPending();
    const interval = setInterval(fetchPending, 12000);
    return () => clearInterval(interval);
  }, []);

  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [showSearchDropdown, setShowSearchDropdown] = useState(false);

  useEffect(() => {
    if (searchQuery.trim().length < 2) {
      setSearchResults([]);
      setIsSearching(false);
      return;
    }

    const handler = setTimeout(async () => {
      setIsSearching(true);
      try {
        const res = await fetch(`/api/search?q=${encodeURIComponent(searchQuery)}`);
        const json = await res.json();
        if (json.success) {
          setSearchResults(json.results || []);
        }
      } catch (e) {
        console.error(e);
      } finally {
        setIsSearching(false);
      }
    }, 200);

    return () => clearTimeout(handler);
  }, [searchQuery]);

  return (
    <header className="fixed top-0 right-0 left-0 md:left-64 h-16 bg-white/90 backdrop-blur-xl border-b border-black/[0.04] z-30 flex items-center justify-between px-3 sm:px-6 shadow-[0_1px_2px_rgba(0,0,0,0.02)] transition-all print:hidden">
      {/* Mobile Brand Logo */}
      <div className="flex md:hidden items-center mr-2 shrink-0">
        <Link href="/dashboard" className="flex items-center gap-1.5 bg-[#30539C] text-white px-2.5 py-1 rounded-xl shadow-xs">
          <span className="font-black text-xs tracking-tight">VALUE<span className="text-[#76C043]">PLUS</span></span>
        </Link>
      </div>

      {/* Omni Search Bar */}
      <div className="relative flex-1 max-w-md mr-2 sm:mr-4">
        <div className="relative">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Search Customer, Mobile, Invoice #, VP Code, Serial #, Vehicle #, DO ID..."
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              setShowSearchDropdown(true);
            }}
            onFocus={() => setShowSearchDropdown(true)}
            onBlur={() => setTimeout(() => setShowSearchDropdown(false), 300)}
            className="w-full h-9 pl-9 pr-8 bg-slate-100/80 hover:bg-slate-100 focus:bg-white border border-slate-200 rounded-full text-xs font-medium text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#30539C]/20 transition-all"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery("")}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 text-xs"
            >
              ✕
            </button>
          )}
        </div>

        {/* Search Results Dropdown */}
        {showSearchDropdown && (searchResults.length > 0 || isSearching) && (
          <div className="absolute left-0 top-11 w-full bg-white rounded-2xl border border-slate-200 shadow-2xl overflow-hidden z-50 divide-y divide-slate-100">
            <div className="p-2 bg-slate-50 text-[10px] font-bold text-slate-500 uppercase flex justify-between">
              <span>{isSearching ? "Searching..." : `Results (${searchResults.length})`}</span>
              <span>Click to open</span>
            </div>
            <div className="max-h-72 overflow-y-auto">
              {searchResults.map((item: any, idx: number) => (
                <a
                  key={idx}
                  href={item.link}
                  className="p-2.5 hover:bg-blue-50 flex items-center justify-between transition-colors block"
                >
                  <div>
                    <div className="flex items-center gap-1.5 mb-0.5">
                      <span className="px-1.5 py-0.2 text-[9px] font-bold rounded bg-blue-100 text-[#30539C] uppercase">
                        {item.type}
                      </span>
                    </div>
                    <p className="text-xs font-bold text-slate-900">{item.title}</p>
                    <p className="text-[11px] text-slate-500">{item.subtitle}</p>
                  </div>
                </a>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Right Actions */}
      <div className="flex items-center gap-3">

        {/* Real-time Network & Cloud Sync Status Badge */}
        {!isOnline ? (
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-900 animate-pulse">
            <WifiOff className="w-3.5 h-3.5 text-amber-600" />
            <span className="text-xs font-bold">Offline Mode</span>
            {pendingCount > 0 && (
              <span className="px-1.5 py-0.2 rounded-full bg-amber-600 text-white font-mono text-[10px] font-bold">
                {pendingCount}
              </span>
            )}
          </div>
        ) : pendingCount > 0 ? (
          <Button
            size="sm"
            onClick={syncNow}
            disabled={isSyncing}
            className="h-8 rounded-full bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white text-xs font-bold shadow-sm flex items-center gap-1.5 px-3"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isSyncing ? "animate-spin" : ""}`} />
            {isSyncing ? "Syncing..." : `Sync ${pendingCount} Offline Invoices`}
          </Button>
        ) : (
          <div className="hidden sm:flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-50 border border-emerald-200/80 text-emerald-800 text-xs font-semibold">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
            <span>Cloud Synced</span>
          </div>
        )}
        {/* Notifications / Super Admin Approvals */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className="relative w-10 h-10 flex items-center justify-center rounded-full hover:bg-slate-100 text-slate-500 hover:text-slate-800 transition-colors">
              <Bell className="w-5 h-5" />
              {pendingApprovalsCount > 0 && (
                <span className="absolute top-1.5 right-1.5 min-w-[18px] h-[18px] px-1 bg-red-600 text-white text-[10px] font-black rounded-full border-2 border-white flex items-center justify-center animate-pulse">
                  {pendingApprovalsCount}
                </span>
              )}
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-88 rounded-2xl shadow-2xl p-0 overflow-hidden border-slate-200">
            <div className="bg-slate-900 text-white px-4 py-3 flex items-center justify-between">
              <div>
                <p className="font-bold text-sm">Store Incharge Activity Queue</p>
                <p className="text-[11px] text-slate-300">
                  {pendingApprovalsCount} {pendingApprovalsCount === 1 ? "request" : "requests"} pending Super Admin review
                </p>
              </div>
              <Link
                href="/admin/approvals"
                className="text-[11px] font-bold text-amber-400 hover:underline flex items-center gap-1"
              >
                View All →
              </Link>
            </div>
            
            <div className="max-h-[340px] overflow-y-auto divide-y">
              {approvalsList.length === 0 ? (
                <div className="p-6 text-center text-slate-400">
                  <CheckCircle2 className="w-8 h-8 text-emerald-500 mx-auto mb-1.5 opacity-60" />
                  <p className="text-xs font-bold text-slate-700">No Pending Approvals</p>
                  <p className="text-[11px] text-slate-400">All branch incharge activities are up-to-date.</p>
                </div>
              ) : (
                approvalsList.slice(0, 5).map((act) => (
                  <div key={act.activityId} className="p-3 hover:bg-slate-50 transition-colors bg-amber-500/5">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1">
                        <div className="flex items-center gap-1.5">
                          <span className="px-1.5 py-0.5 rounded bg-amber-100 text-amber-900 font-bold text-[9.5px] uppercase">
                            {act.activityType?.replace("_", " ")}
                          </span>
                          <span className="text-[10px] font-mono text-slate-400">{act.activityId}</span>
                        </div>
                        <p className="text-xs font-bold text-slate-900 mt-1">{act.title}</p>
                        <p className="text-[11px] text-slate-600 line-clamp-1">{act.description}</p>
                        <p className="text-[10px] text-slate-400 mt-1">
                          📍 {act.storeName} • {act.storeInchargeName}
                        </p>
                      </div>
                      {act.amount > 0 && (
                        <p className="text-xs font-bold font-mono text-emerald-700 shrink-0">
                          ₹{Number(act.amount).toLocaleString("en-IN")}
                        </p>
                      )}
                    </div>

                    <div className="mt-2 pt-2 border-t flex items-center justify-end gap-1.5">
                      <Link href="/admin/approvals">
                        <Button size="sm" className="h-6 px-2 text-[10px] font-bold bg-[#30539C] hover:bg-[#203a70] text-white">
                          Review & Authorize →
                        </Button>
                      </Link>
                    </div>
                  </div>
                ))
              )}
            </div>

            <div className="bg-slate-50 px-3 py-2 border-t text-center">
              <Link
                href="/admin/approvals"
                className="text-xs font-bold text-[#30539C] hover:underline"
              >
                Open Full Super Admin Approvals Center
              </Link>
            </div>
          </DropdownMenuContent>
        </DropdownMenu>

        {/* <button className="w-10 h-10 flex items-center justify-center rounded-full hover:bg-slate-100 text-slate-500 hover:text-slate-800 transition-colors">
          <Settings className="w-5 h-5" />
        </button> */}

        <div className="w-px h-6 bg-slate-200 mx-1"></div>

        {/* Direct 1-Click Logout Button */}
        <Button
          variant="outline"
          size="sm"
          onClick={() => signOut({ callbackUrl: "/login" })}
          className="h-8 px-2.5 text-xs font-bold text-rose-600 border-rose-200 bg-rose-50 hover:bg-rose-100 hover:text-rose-700 transition-all flex items-center gap-1.5 shadow-2xs"
          title="Sign out / Logout of Value Plus ERP"
        >
          <LogOut className="w-3.5 h-3.5" />
          <span className="hidden md:inline">Logout</span>
        </Button>

        {/* Profile */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className="flex items-center gap-2.5 pl-2 pr-1 py-1 rounded-full hover:bg-slate-100 transition-colors text-left border border-transparent hover:border-slate-200">
              <div className="flex flex-col items-end">
                <span className="text-xs font-bold text-slate-800 leading-none truncate max-w-[120px]">{userName}</span>
                <span className="text-[9.5px] text-[#30539C] font-semibold mt-0.5">{userRole}</span>
              </div>
              <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-[#30539C] to-[#4A75CD] flex items-center justify-center text-white font-bold text-xs shadow-inner">
                {initialLetter}
              </div>
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56 rounded-xl shadow-xl">
            <DropdownMenuLabel className="font-normal p-3">
              <div className="flex flex-col space-y-1">
                <p className="text-sm font-bold text-foreground leading-none">{userName}</p>
                <p className="text-xs text-slate-500 truncate">{userEmail}</p>
                <span className="inline-block mt-1 w-fit text-[9px] font-mono font-bold px-1.5 py-0.5 rounded bg-blue-100 text-[#30539C]">
                  {userRole}
                </span>
              </div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem asChild className="cursor-pointer py-2">
              <Link href="/settings/profile" className="flex items-center w-full">
                <User className="mr-2 h-4 w-4 text-slate-500" />
                <span>Company & Profile Settings</span>
              </Link>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => signOut({ callbackUrl: '/login' })} className="cursor-pointer py-2 text-rose-600 focus:text-rose-700 focus:bg-rose-50 font-semibold">
              <LogOut className="mr-2 h-4 w-4" />
              <span>Log out</span>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}
