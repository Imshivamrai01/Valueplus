"use client";

import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { PageShell } from "@/components/shared/page-shell";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { 
  Users, Search, MessageSquare, Phone, Plus, 
  CheckCircle2, Clock, Calendar, Sparkles, Filter, ChevronRight
} from "lucide-react";
import { toast } from "sonner";
import { useRouter } from "next/navigation";

const LEAD_STATUSES = ["all", "New", "Contacted", "Interested", "Follow-up", "Converted", "Lost"] as const;

export default function LeadsPipelinePage() {
  const queryClient = useQueryClient();
  const router = useRouter();
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");

  const { data: leads = [], isLoading } = useQuery({
    queryKey: ["leads", statusFilter],
    queryFn: async () => {
      const url = statusFilter === "all" ? "/api/crm/leads" : `/api/crm/leads?status=${statusFilter}`;
      const res = await fetch(url);
      const json = await res.json();
      return json.success ? json.data : [];
    },
  });

  const updateStatusMutation = useMutation({
    mutationFn: async ({ id, status, note }: { id: string; status: string; note?: string }) => {
      const res = await fetch("/api/crm/leads", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, status, actionNote: note || `Status updated to ${status}` }),
      });
      const json = await res.json();
      if (!json.success) throw new Error(json.error || "Update failed");
      return json.data;
    },
    onSuccess: () => {
      toast.success("Lead pipeline updated");
      queryClient.invalidateQueries({ queryKey: ["leads"] });
    },
    onError: (err: any) => toast.error(err.message),
  });

  const handleWhatsApp = (lead: any) => {
    const cleanPhone = (lead.mobile || "").replace(/\D/g, "");
    if (!cleanPhone) {
      toast.error("Phone number missing");
      return;
    }
    const phone = cleanPhone.length === 10 ? `91${cleanPhone}` : cleanPhone;
    const msg = encodeURIComponent(
      `Hello ${lead.customerName},\nThis is from *Value Plus / Ashoka Enterprises, Gorakhpur* regarding your enquiry for *${lead.interestedProduct}*.\nWe have exclusive festive discounts and 0% EMI offers available today! Would you like to check the details?`
    );
    window.open(`https://wa.me/${phone}?text=${msg}`, "_blank");
  };

  const handleConvertLeadToBill = (lead: any) => {
    router.push(`/sales/invoices?new=true&name=${encodeURIComponent(lead.customerName)}&phone=${encodeURIComponent(lead.mobile)}`);
  };

  const filtered = leads.filter((l: any) =>
    (l.customerName || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
    (l.mobile || "").includes(searchTerm) ||
    (l.leadId || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
    (l.interestedProduct || "").toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <PageShell
      title="Lead Management & Sales Pipeline"
      description="Track customer sales opportunities, follow-up timelines, WhatsApp engagements, and conversion to invoices."
    >
      <div className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3 bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
          <div className="relative flex-1 min-w-[260px] max-w-md">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <Input
              placeholder="Search Lead ID, customer, phone or product..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9 bg-slate-50 border-slate-300 text-xs"
            />
          </div>

          <div className="flex items-center gap-2">
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[160px] text-xs bg-slate-50 border-slate-300 font-semibold">
                <SelectValue placeholder="Filter Status" />
              </SelectTrigger>
              <SelectContent>
                {LEAD_STATUSES.map((s) => (
                  <SelectItem key={s} value={s}>
                    {s === "all" ? "All Statuses" : s}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
          <table className="w-full text-xs text-left">
            <thead className="bg-slate-50 border-b text-slate-700 uppercase font-bold">
              <tr>
                <th className="p-3">Lead ID</th>
                <th className="p-3">Customer</th>
                <th className="p-3">Interested Product</th>
                <th className="p-3">Est. Value</th>
                <th className="p-3">Assigned Staff</th>
                <th className="p-3">Next Follow-up</th>
                <th className="p-3">Status</th>
                <th className="p-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {isLoading ? (
                <tr><td colSpan={8} className="p-6 text-center text-slate-500">Loading leads...</td></tr>
              ) : filtered.length === 0 ? (
                <tr><td colSpan={8} className="p-6 text-center text-slate-500">No leads found in this pipeline view.</td></tr>
              ) : (
                filtered.map((l: any) => (
                  <tr key={l._id} className="hover:bg-slate-50 transition-colors">
                    <td className="p-3 font-mono font-bold text-[#3F63AD]">{l.leadId}</td>
                    <td className="p-3 font-bold text-slate-900">
                      {l.customerName}
                      <span className="block text-[10px] font-mono text-slate-500 font-normal">{l.mobile}</span>
                    </td>
                    <td className="p-3 font-semibold text-slate-800">
                      {l.interestedProduct}
                      {l.vpCode && <span className="block text-[10px] font-mono text-blue-600">VP: {l.vpCode}</span>}
                    </td>
                    <td className="p-3 font-mono font-bold text-[#76C043]">
                      ₹{l.estimatedValue?.toLocaleString("en-IN") || "0"}
                    </td>
                    <td className="p-3 text-slate-700">{l.assignedStaff}</td>
                    <td className="p-3 font-mono text-slate-600 text-[11px]">{l.followUpDate || "Pending"}</td>
                    <td className="p-3">
                      <Select
                        value={l.status}
                        onValueChange={(val) => updateStatusMutation.mutate({ id: l._id, status: val })}
                      >
                        <SelectTrigger className="h-7 text-xs bg-slate-50 border-slate-300 font-semibold w-[120px]">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="New">New</SelectItem>
                          <SelectItem value="Contacted">Contacted</SelectItem>
                          <SelectItem value="Interested">Interested</SelectItem>
                          <SelectItem value="Follow-up">Follow-up</SelectItem>
                          <SelectItem value="Converted">Converted</SelectItem>
                          <SelectItem value="Lost">Lost</SelectItem>
                        </SelectContent>
                      </Select>
                    </td>
                    <td className="p-3 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleWhatsApp(l)}
                          className="h-7 text-xs text-emerald-700 border-emerald-300 hover:bg-emerald-50 font-bold"
                        >
                          <MessageSquare className="w-3.5 h-3.5 mr-1" /> WhatsApp
                        </Button>
                        <Button
                          size="sm"
                          onClick={() => handleConvertLeadToBill(l)}
                          className="h-7 text-xs bg-[#3F63AD] hover:bg-[#2E4F95] text-white font-bold"
                        >
                          <Sparkles className="w-3.5 h-3.5 mr-1" /> Bill Now
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </PageShell>
  );
}
