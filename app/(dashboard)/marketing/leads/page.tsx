"use client";

import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { PageShell } from "@/components/shared/page-shell";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { 
  Users, Search, MessageSquare, Phone, Plus, 
  CheckCircle2, Clock, Calendar, Sparkles, Filter, ChevronRight,
  Receipt, ArrowUpRight, Target, Flame, TrendingUp
} from "lucide-react";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { cn, indianNumberFormat, formatCurrency } from "@/lib/utils";

const LEAD_STATUSES = ["all", "New", "Contacted", "Interested", "Follow-up", "Converted", "Lost"] as const;

export default function LeadsPipelinePage() {
  const queryClient = useQueryClient();
  const router = useRouter();
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);

  const [leadForm, setLeadForm] = useState({
    customerName: "",
    mobile: "",
    email: "",
    source: "Walk-in Store",
    interestedProduct: "",
    vpCode: "",
    estimatedValue: "",
    assignedStaff: "Amit Singh",
    priority: "Medium" as "Low" | "Medium" | "High" | "Urgent",
    status: "New" as "New" | "Contacted" | "Interested" | "Follow-up" | "Converted" | "Lost",
    followUpDate: new Date().toISOString().split("T")[0],
    notes: "",
  });

  const { data: leads = [], isLoading } = useQuery({
    queryKey: ["leads", statusFilter],
    queryFn: async () => {
      const url = statusFilter === "all" ? "/api/crm/leads" : `/api/crm/leads?status=${statusFilter}`;
      const res = await fetch(url);
      const json = await res.json();
      return json.success ? json.data : [];
    },
  });

  const createLeadMutation = useMutation({
    mutationFn: async (payload: any) => {
      const res = await fetch("/api/crm/leads", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const json = await res.json();
      if (!json.success) throw new Error(json.error || "Failed to create lead");
      return json.data;
    },
    onSuccess: () => {
      toast.success("New lead registered successfully");
      queryClient.invalidateQueries({ queryKey: ["leads"] });
      setIsAddModalOpen(false);
      setLeadForm({
        customerName: "",
        mobile: "",
        email: "",
        source: "Walk-in Store",
        interestedProduct: "",
        vpCode: "",
        estimatedValue: "",
        assignedStaff: "Amit Singh",
        priority: "Medium",
        status: "New",
        followUpDate: new Date().toISOString().split("T")[0],
        notes: "",
      });
    },
    onError: (err: any) => toast.error(err.message),
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
      toast.success("Lead status updated");
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
      `Hello ${lead.customerName},\nThis is from *Value Plus / Ashoka Enterprises, Gorakhpur* regarding your enquiry for *${lead.interestedProduct}*.\nWe have exclusive festive discounts & 0% EMI schemes available today! How can we assist you?`
    );
    window.open(`https://wa.me/${phone}?text=${msg}`, "_blank");
  };

  const handleConvertLeadToBill = (lead: any) => {
    router.push(`/sales/invoices?new=true&name=${encodeURIComponent(lead.customerName)}&phone=${encodeURIComponent(lead.mobile)}`);
  };

  const handleCreateSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!leadForm.customerName || !leadForm.mobile || !leadForm.interestedProduct) {
      toast.error("Please fill all required fields");
      return;
    }
    createLeadMutation.mutate({
      ...leadForm,
      estimatedValue: Number(leadForm.estimatedValue || 0),
    });
  };

  const totalLeads = leads.length;
  const convertedCount = leads.filter((l: any) => l.status === "Converted").length;
  const followUpCount = leads.filter((l: any) => l.status === "Follow-up" || l.status === "Interested" || l.status === "Contacted").length;
  const totalPipelineValue = leads.reduce((sum: number, l: any) => sum + (Number(l.estimatedValue) || 0), 0);
  const conversionRate = totalLeads > 0 ? Math.round((convertedCount / totalLeads) * 100) : 0;

  const filtered = leads.filter((l: any) =>
    (l.customerName || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
    (l.mobile || "").includes(searchTerm) ||
    (l.leadId || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
    (l.interestedProduct || "").toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <PageShell
      title="Lead Management & Sales Pipeline"
      description="Track customer walk-in opportunities, follow-up scheduler, WhatsApp engagements, and automated conversion to invoices."
    >
      <div className="space-y-4">
        {/* KPI SUMMARY CARDS */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex items-center justify-between">
            <div>
              <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">Total Pipeline Leads</p>
              <h3 className="text-2xl font-black text-slate-900 mt-0.5">{totalLeads}</h3>
              <p className="text-xs text-blue-600 font-bold mt-1">₹{indianNumberFormat(totalPipelineValue)} Potential</p>
            </div>
            <div className="w-10 h-10 rounded-xl bg-blue-50 border border-blue-200 flex items-center justify-center text-[#3F63AD]">
              <Target className="w-5 h-5" />
            </div>
          </div>

          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex items-center justify-between">
            <div>
              <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">Active Follow-ups</p>
              <h3 className="text-2xl font-black text-amber-800 mt-0.5">{followUpCount}</h3>
              <p className="text-xs text-amber-600 font-bold mt-1">Scheduled actions</p>
            </div>
            <div className="w-10 h-10 rounded-xl bg-amber-50 border border-amber-200 flex items-center justify-center text-amber-600">
              <Clock className="w-5 h-5" />
            </div>
          </div>

          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex items-center justify-between">
            <div>
              <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">Converted (Won)</p>
              <h3 className="text-2xl font-black text-emerald-800 mt-0.5">{convertedCount}</h3>
              <p className="text-xs text-emerald-600 font-bold mt-1">Billed into Invoices</p>
            </div>
            <div className="w-10 h-10 rounded-xl bg-emerald-50 border border-emerald-200 flex items-center justify-center text-emerald-600">
              <CheckCircle2 className="w-5 h-5" />
            </div>
          </div>

          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex items-center justify-between">
            <div>
              <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">Conversion Rate</p>
              <h3 className="text-2xl font-black text-purple-900 mt-0.5">{conversionRate}%</h3>
              <p className="text-xs text-purple-600 font-bold mt-1">Walk-in Win Rate</p>
            </div>
            <div className="w-10 h-10 rounded-xl bg-purple-50 border border-purple-200 flex items-center justify-center text-purple-600">
              <TrendingUp className="w-5 h-5" />
            </div>
          </div>
        </div>

        {/* CONTROLS STRIP */}
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

            <Button
              onClick={() => setIsAddModalOpen(true)}
              className="bg-[#76C043] hover:bg-[#60a82c] text-white font-bold text-xs h-9 px-4 rounded-lg shadow-sm"
            >
              <Plus className="w-4 h-4 mr-1.5" /> + New Lead
            </Button>
          </div>
        </div>

        {/* LEADS DATA TABLE */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
          <table className="w-full text-xs text-left">
            <thead className="bg-slate-50 border-b text-slate-700 uppercase font-bold text-[10px]">
              <tr>
                <th className="p-3">Lead ID</th>
                <th className="p-3">Customer & Source</th>
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
                <tr><td colSpan={8} className="p-8 text-center text-slate-500">Loading live leads from database...</td></tr>
              ) : filtered.length === 0 ? (
                <tr><td colSpan={8} className="p-8 text-center text-slate-500 font-medium">No leads found in this pipeline view. Click &quot;+ New Lead&quot; to register a walk-in enquiry.</td></tr>
              ) : (
                filtered.map((l: any) => (
                  <tr key={l._id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="p-3 font-mono font-bold text-[#3F63AD]">
                      {l.leadId}
                      {l.priority === "Urgent" && (
                        <span className="block text-[9px] font-bold text-rose-600 uppercase mt-0.5">🔥 Urgent</span>
                      )}
                    </td>
                    <td className="p-3 font-bold text-slate-900">
                      {l.customerName}
                      <span className="block text-[11px] font-mono text-slate-500 font-normal">{l.mobile}</span>
                      <span className="inline-block text-[9px] font-bold px-1.5 py-0.2 rounded bg-slate-100 text-slate-600 mt-0.5">
                        {l.source || "Walk-in Store"}
                      </span>
                    </td>
                    <td className="p-3 font-semibold text-slate-800">
                      {l.interestedProduct}
                      {l.vpCode && <span className="block text-[10px] font-mono text-blue-600">VP: {l.vpCode}</span>}
                    </td>
                    <td className="p-3 font-mono font-black text-slate-900 text-sm">
                      ₹{indianNumberFormat(l.estimatedValue || 0)}
                    </td>
                    <td className="p-3 text-slate-700 font-medium">{l.assignedStaff || "Sales Team"}</td>
                    <td className="p-3 font-mono text-slate-600 text-[11px]">
                      {l.followUpDate ? (
                        <span className="flex items-center gap-1">
                          <Calendar className="w-3 h-3 text-slate-400" /> {l.followUpDate}
                        </span>
                      ) : (
                        <span className="text-slate-400">None</span>
                      )}
                    </td>
                    <td className="p-3">
                      <Select
                        value={l.status}
                        onValueChange={(val) => updateStatusMutation.mutate({ id: l._id, status: val })}
                      >
                        <SelectTrigger className={cn(
                          "h-7 text-xs font-bold w-[125px] border",
                          l.status === "Converted" && "bg-emerald-50 text-emerald-800 border-emerald-200",
                          l.status === "Follow-up" && "bg-amber-50 text-amber-800 border-amber-200",
                          l.status === "New" && "bg-blue-50 text-blue-800 border-blue-200",
                          l.status === "Interested" && "bg-purple-50 text-purple-800 border-purple-200",
                          l.status === "Lost" && "bg-rose-50 text-rose-800 border-rose-200"
                        )}>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="New">New</SelectItem>
                          <SelectItem value="Contacted">Contacted</SelectItem>
                          <SelectItem value="Interested">Interested</SelectItem>
                          <SelectItem value="Follow-up">Follow-up</SelectItem>
                          <SelectItem value="Converted">🏆 Converted</SelectItem>
                          <SelectItem value="Lost">Lost</SelectItem>
                        </SelectContent>
                      </Select>
                      {l.convertedInvoiceNumber && (
                        <span className="block text-[10px] font-mono font-bold text-emerald-700 mt-1">
                          Invoice: {l.convertedInvoiceNumber}
                        </span>
                      )}
                    </td>
                    <td className="p-3 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleWhatsApp(l)}
                          className="h-7 text-xs text-emerald-700 border-emerald-300 hover:bg-emerald-50 font-bold"
                          title="WhatsApp Follow-up"
                        >
                          <MessageSquare className="w-3.5 h-3.5 mr-1" /> WhatsApp
                        </Button>
                        {l.status !== "Converted" && (
                          <Button
                            size="sm"
                            onClick={() => handleConvertLeadToBill(l)}
                            className="h-7 text-xs bg-[#3F63AD] hover:bg-[#2E4F95] text-white font-bold"
                            title="Generate Invoice for Customer"
                          >
                            <Sparkles className="w-3.5 h-3.5 mr-1" /> Bill Now
                          </Button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ─── ADD NEW LEAD MODAL ────────────────────────────────────────── */}
      <Dialog open={isAddModalOpen} onOpenChange={setIsAddModalOpen}>
        <DialogContent className="max-w-lg p-0 rounded-2xl overflow-hidden border-none shadow-2xl">
          <div className="bg-gradient-to-r from-[#1B2537] via-[#10B981]/90 to-[#1B2537] text-white p-5">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-lg bg-white/10 flex items-center justify-center">
                <Target className="w-5 h-5 text-emerald-300" />
              </div>
              <div>
                <h3 className="text-base font-black tracking-tight">Register Walk-in / Online Lead</h3>
                <p className="text-xs text-slate-200">Capture customer product inquiry, budget and assigned staff</p>
              </div>
            </div>
          </div>

          <form onSubmit={handleCreateSubmit} className="p-5 space-y-3.5 bg-slate-50">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs font-bold text-slate-700">Customer Name *</Label>
                <Input
                  value={leadForm.customerName}
                  onChange={(e) => setLeadForm({ ...leadForm, customerName: e.target.value })}
                  placeholder="e.g. Ramesh Srivastava"
                  required
                  className="mt-1 bg-white text-xs h-9 font-medium"
                />
              </div>

              <div>
                <Label className="text-xs font-bold text-slate-700">Mobile Number *</Label>
                <Input
                  value={leadForm.mobile}
                  onChange={(e) => setLeadForm({ ...leadForm, mobile: e.target.value })}
                  placeholder="10-digit mobile number"
                  required
                  className="mt-1 bg-white text-xs h-9 font-mono font-medium"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs font-bold text-slate-700">Interested Product *</Label>
                <Input
                  value={leadForm.interestedProduct}
                  onChange={(e) => setLeadForm({ ...leadForm, interestedProduct: e.target.value })}
                  placeholder="e.g. Sony Bravia 55' OLED TV"
                  required
                  className="mt-1 bg-white text-xs h-9 font-medium"
                />
              </div>

              <div>
                <Label className="text-xs font-bold text-slate-700">Estimated Budget (₹)</Label>
                <Input
                  type="number"
                  value={leadForm.estimatedValue}
                  onChange={(e) => setLeadForm({ ...leadForm, estimatedValue: e.target.value })}
                  placeholder="e.g. 125000"
                  className="mt-1 bg-white text-xs h-9 font-mono font-medium"
                />
              </div>
            </div>

            <div className="grid grid-cols-3 gap-3">
              <div>
                <Label className="text-xs font-bold text-slate-700">Lead Source</Label>
                <select
                  value={leadForm.source}
                  onChange={(e) => setLeadForm({ ...leadForm, source: e.target.value })}
                  className="mt-1 w-full h-9 rounded-md border border-input bg-white px-2 py-1 text-xs font-medium shadow-xs focus:outline-none"
                >
                  <option value="Walk-in Store">Walk-in Store</option>
                  <option value="Phone Enquiry">Phone Enquiry</option>
                  <option value="WhatsApp">WhatsApp</option>
                  <option value="Online Website">Online Website</option>
                  <option value="Referral">Referral</option>
                </select>
              </div>

              <div>
                <Label className="text-xs font-bold text-slate-700">Assigned Staff</Label>
                <select
                  value={leadForm.assignedStaff}
                  onChange={(e) => setLeadForm({ ...leadForm, assignedStaff: e.target.value })}
                  className="mt-1 w-full h-9 rounded-md border border-input bg-white px-2 py-1 text-xs font-medium shadow-xs focus:outline-none"
                >
                  <option value="Amit Singh">Amit Singh</option>
                  <option value="Rahul Verma">Rahul Verma</option>
                  <option value="Priya Sharma">Priya Sharma</option>
                  <option value="Pooja Gupta">Pooja Gupta</option>
                  <option value="Sales Team">Sales Team</option>
                </select>
              </div>

              <div>
                <Label className="text-xs font-bold text-slate-700">Priority</Label>
                <select
                  value={leadForm.priority}
                  onChange={(e) => setLeadForm({ ...leadForm, priority: e.target.value as any })}
                  className="mt-1 w-full h-9 rounded-md border border-input bg-white px-2 py-1 text-xs font-bold shadow-xs focus:outline-none"
                >
                  <option value="Low">Low</option>
                  <option value="Medium">Medium</option>
                  <option value="High">High</option>
                  <option value="Urgent">🔥 Urgent</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs font-bold text-slate-700">Initial Status</Label>
                <select
                  value={leadForm.status}
                  onChange={(e) => setLeadForm({ ...leadForm, status: e.target.value as any })}
                  className="mt-1 w-full h-9 rounded-md border border-input bg-white px-2 py-1 text-xs font-bold shadow-xs focus:outline-none"
                >
                  <option value="New">New</option>
                  <option value="Follow-up">Follow-up</option>
                  <option value="Interested">Interested</option>
                  <option value="Converted">Converted</option>
                  <option value="Lost">Lost</option>
                </select>
              </div>

              <div>
                <Label className="text-xs font-bold text-slate-700">Follow-up Date</Label>
                <Input
                  type="date"
                  value={leadForm.followUpDate}
                  onChange={(e) => setLeadForm({ ...leadForm, followUpDate: e.target.value })}
                  className="mt-1 bg-white text-xs h-9 font-medium"
                />
              </div>
            </div>

            <div>
              <Label className="text-xs font-bold text-slate-700">Discussion Notes</Label>
              <textarea
                value={leadForm.notes}
                onChange={(e) => setLeadForm({ ...leadForm, notes: e.target.value })}
                placeholder="Discount discussed, EMI scheme preferred, delivery preferences..."
                rows={2}
                className="mt-1 w-full rounded-md border border-input bg-white px-3 py-2 text-xs font-medium shadow-xs focus:outline-none"
              />
            </div>

            <DialogFooter className="pt-2">
              <Button type="button" variant="outline" size="sm" onClick={() => setIsAddModalOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" size="sm" className="bg-[#76C043] hover:bg-[#60a82c] text-white font-bold px-4">
                Register Lead
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </PageShell>
  );
}
