"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import { NAV_GROUPS } from "@/constants/navigation";
import { ChevronDown, Zap, Sparkles } from "lucide-react";

// Exact ValuePlus Logo Component matching the provided image
function ValuePlusBrand() {
  return (
    <div className="flex flex-col items-center justify-center w-full py-2">
      <div className="flex items-center text-[28px] font-black tracking-tight leading-none">
        <span className="text-white">VALUE</span>
        <span className="text-[#76C043]">PLUS</span>
      </div>
      <div className="flex items-center gap-2 mt-1.5 opacity-90">
        <div className="h-[1px] w-4 bg-white/70" />
        <span className="text-white text-[11px] font-medium tracking-wide">रिश्ता विश्वास का</span>
        <div className="h-[1px] w-4 bg-white/70" />
      </div>
    </div>
  );
}

interface SidebarSectionProps {
  title: string;
  children: React.ReactNode;
  defaultOpen?: boolean;
}

function SidebarSection({ title, children, defaultOpen = true }: SidebarSectionProps) {
  const [isOpen, setIsOpen] = useState(defaultOpen);

  return (
    <div className="mb-2">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center justify-between w-full px-3 py-2 text-[11px] font-semibold uppercase tracking-wider text-[#8A9BB3] hover:text-white transition-colors group"
      >
        <span>{title}</span>
        <ChevronDown
          className={cn("w-3.5 h-3.5 transition-transform duration-200", isOpen ? "rotate-0" : "-rotate-90")}
        />
      </button>
      <AnimatePresence initial={false}>
        {isOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2, ease: "easeInOut" }}
            className="overflow-hidden"
          >
            <div className="space-y-0.5 pb-2">{children}</div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="fixed left-0 top-0 z-40 h-screen w-64 flex flex-col bg-[#30539C] shadow-[4px_0_24px_rgba(48,83,156,0.15)] border-r border-white/10">
      {/* Brand Header */}
      <div className="flex items-center justify-center px-4 h-24 border-b border-white/10 bg-black/5 flex-shrink-0">
        <ValuePlusBrand />
      </div>

      {/* Business Selector */}
      <div className="px-4 py-3 flex-shrink-0 border-b border-white/5">
        <button className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl bg-black/10 hover:bg-black/20 border border-white/5 transition-all shadow-sm text-left group">
          <div className="w-8 h-8 rounded-lg bg-white/15 flex items-center justify-center text-white text-xs font-black flex-shrink-0 group-hover:bg-white/20 transition-colors">
            AE
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-white text-xs font-bold truncate tracking-tight">ASHOKA ENTERPRISES</p>
            <p className="text-white/70 text-[10px] truncate font-medium mt-0.5">Gorakhpur • GST: 09ANHPJ7242D1Z2</p>
          </div>
          <ChevronDown className="w-3.5 h-3.5 text-white/40 flex-shrink-0 group-hover:text-white/80 transition-colors" />
        </button>
      </div>


      {/* Navigation */}
      <ScrollArea className="flex-1 px-3 py-4">
        {NAV_GROUPS.map((group) => {
          // Auto-open the section if the current path belongs to this group
          const isGroupActive = group.items.some(
            (item) =>
              pathname === item.href ||
              (item.href !== "/dashboard" && pathname.startsWith(item.href))
          );
          return (
            <SidebarSection
              key={group.title}
              title={group.title}
              defaultOpen={
                isGroupActive ||
                group.title === "Overview" ||
                group.title === "Sales" ||
                group.title === "AI Features"
              }
            >
              {group.items.map((item) => {
                const isActive =
                  pathname === item.href ||
                  (item.href !== "/dashboard" && pathname.startsWith(item.href));
                const Icon = item.icon;
                const isAI = group.title === "AI Features";

                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={cn(
                      "flex items-center gap-3 px-3 py-2.5 rounded-xl text-[13px] font-medium transition-all duration-200 cursor-pointer group relative overflow-hidden",
                      isActive
                        ? isAI
                          ? "bg-gradient-to-r from-purple-500/20 to-fuchsia-500/20 text-white border border-purple-500/30 shadow-[0_0_15px_rgba(168,85,247,0.15)]"
                          : "bg-white text-[#30539C] shadow-[0_4px_12px_rgba(0,0,0,0.1)]"
                        : "text-slate-300 hover:bg-white/10 hover:text-white"
                    )}
                  >
                    {isActive && !isAI && (
                      <motion.div
                        layoutId="sidebar-active"
                        className="absolute left-0 w-1 h-6 bg-[#76C043] rounded-r-full"
                      />
                    )}
                    <Icon
                      className={cn(
                        "w-4 h-4 flex-shrink-0 transition-colors",
                        isActive && !isAI
                          ? "text-[#30539C]"
                          : isAI && isActive
                          ? "text-purple-400"
                          : "text-slate-400 group-hover:text-white"
                      )}
                    />
                    <span className="flex-1 truncate tracking-wide">{item.title}</span>
                    {item.badge !== undefined && (
                      <span
                        className={cn(
                          "text-[10px] font-bold rounded-full px-2 py-0.5 min-w-[20px] text-center shadow-sm",
                          isAI
                            ? "bg-purple-500 text-white"
                            : isActive
                            ? "bg-[#76C043]/10 text-[#76C043]"
                            : "bg-[#76C043] text-white"
                        )}
                      >
                        {item.badge}
                      </span>
                    )}
                  </Link>
                );
              })}
            </SidebarSection>
          );
        })}
      </ScrollArea>

      {/* Bottom */}
      <div className="flex-shrink-0 px-4 py-4 border-t border-white/10 bg-black/5">
        <div className="flex items-center gap-3 px-3 py-3 rounded-xl bg-gradient-to-r from-[#76C043]/20 to-[#76C043]/5 border border-[#76C043]/30 backdrop-blur-md relative overflow-hidden group">
          <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-1000" />
          <div className="w-8 h-8 rounded-full bg-[#76C043]/20 flex items-center justify-center flex-shrink-0">
            <Zap className="w-4 h-4 text-[#76C043]" fill="currentColor" />
          </div>
          <div>
            <p className="text-white text-xs font-bold tracking-wide">Enterprise Plan</p>
            <p className="text-white/60 text-[10px] mt-0.5">All features unlocked</p>
          </div>
        </div>
      </div>
    </aside>
  );
}
