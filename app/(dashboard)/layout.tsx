import type { Metadata } from "next";
import { Sidebar } from "@/components/layout/sidebar";
import { Topnav } from "@/components/layout/topnav";
import { Toaster } from "sonner";

export const metadata: Metadata = {
  title: "ValuePlus ERP",
};

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex h-screen bg-[#F8FAFC]">
      <Sidebar />
      <div className="flex-1 flex flex-col ml-64 min-w-0 bg-[#F4F7FB]">
        <Topnav />
        <main className="flex-1 overflow-auto pt-16">
          {children}
        </main>
      </div>
      <Toaster position="top-right" richColors expand={false} />
    </div>
  );
}
