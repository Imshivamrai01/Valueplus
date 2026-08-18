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
  Users, Plus, Search, Phone, ArrowRight, CheckCircle2, 
  MessageSquare, Sparkles, Clock, Calendar, HelpCircle
} from "lucide-react";
import { toast } from "sonner";

export default function WalkInQueriesPage() {
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState("");
  const [isNewModalOpen, setIsNewModalOpen] = useState(false);

  const [form, setForm] = useState({
    customerName: "",
    mobile: "",
    reason: "Product Enquiry" as any,
    interestedProduct: "",
    category: "Electronics",
    budget: 0,
    staff: "Amit Singh",
    notes: "",
    followUpDate: "",
  });

  const { data: queries = [], isLoading } = useQuery({
    queryKey: ["walkInQueries"],
    queryFn: async () => {
      const res = await fetch("/api/crm/walk-in");
      const json = await res.json();
      return json.success ? json.data : [];
    },
  });

  const createMutation = useMutation({
    mutationFn: async (payload: any) => {
      const res = await fetch("/api/crm/walk-in", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const json = await res.json();
      if (!json.success) throw new Error(json.error || "Failed to log query");
      return json.data;
    },
    onSuccess: () => {
      toast.success("Walk-in customer query recorded!");
      queryClient.invalidateQueries({ queryKey: ["walkInQueries"] });
      setIsNewModalOpen(false);
      setForm({
        customerName: "",
        mobile: "",
        reason: "Product Enquiry",
        interestedProduct: "",
        category: "Electronics",
        budget: 0,
        staff: "Amit Singh",
        notes: "",
        followUpDate: "",
      });
    },
    onError: (err: any) => toast.error(err.message),
  });

  const convertMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch("/api/crm/walk-in", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, action: "convert_to_lead" }),
      });
      const json = await res.json();
      if (!json.success) throw new Error(json.error || "Failed to convert");
      return json.data;
    },
    onSuccess: (data: any) => {
      toast.success(`Converted to Lead #${data.lead?.leadId}!`);
      queryClient.invalidateQueries({ queryKey: ["walkInQueries"] });
      queryClient.invalidateQueries({ queryKey: ["leads"] });
    },
    onError: (err: any) => toast.error(err.message),
  });

  const filtered = queries.filter((q: any) =>
    (q.customerName || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
    (q.mobile || "").includes(searchTerm) ||
    (q.interestedProduct || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
    (q.reason || "").toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <PageShell
      title="Walk-in Customer Queries"
      description="Record showroom visitor enquiries, reasons for store visit, product interest, and convert to sales leads."
    >
      <div className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3 bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
          <div className="relative flex-1 min-w-[260px] max-w-md">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <Input
              placeholder="Search visitor name, phone, product..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9 bg-slate-50 border-slate-300 text-xs"
            />
          </div>

          <Button
            onClick={() => setIsNewModalOpen(true)}
            className="bg-[#3F63AD] hover:bg-[#2E4F95] text-white text-xs font-bold"
          >
            <Plus className="w-3.5 h-3.5 mr-1.5" /> Log Walk-in Visitor
          </Button>
        </div>

        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
          <table className="w-full text-xs text-left">
            <thead className="bg-slate-50 border-b text-slate-700 uppercase font-bold">
              <tr>
                <th className="p-3">Date & Time</th>
                <th className="p-3">Customer</th>
                <th className="p-3">Visit Reason</th>
                <th className="p-3">Interested Product</th>
                <th className="p-3">Budget</th>
                <th className="p-3">Attended By</th>
                <th className="p-3">Follow-up</th>
                <th className="p-3 text-center">Status</th>
                <th className="p-3 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {isLoading ? (
                <tr><td colSpan={9} className="p-6 text-center text-slate-500">Loading queries...</td></tr>
              ) : filtered.length === 0 ? (
                <tr><td colSpan={9} className="p-6 text-center text-slate-500">No walk-in queries logged today.</td></tr>
              ) : (
                filtered.map((q: any) => (
                  <tr key={q._id} className="hover:bg-slate-50 transition-colors">
                    <td className="p-3 font-mono text-slate-600">
                      {q.date} <span className="block text-[10px] text-slate-400">{q.time}</span>
                    </td>
                    <td className="p-3 font-bold text-slate-900">
                      {q.customerName}
                      <span className="block text-[10px] font-mono text-slate-500 font-normal">{q.mobile}</span>
                    </td>
                    <td className="p-3">
                      <Badge variant="outline" className="font-semibold text-slate-700 bg-slate-50">
                        {q.reason}
                      </Badge>
                    </td>
                    <td className="p-3 font-semibold text-slate-800">
                      {q.interestedProduct}
                      <span className="block text-[10px] text-slate-400">{q.category}</span>
                    </td>
                    <td className="p-3 font-mono font-bold text-[#76C043]">
                      {q.budget > 0 ? `₹${q.budget.toLocaleString("en-IN")}` : "Flexible"}
                    </td>
                    <td className="p-3 text-slate-700">{q.staff}</td>
                    <td className="p-3 text-slate-600 font-mono text-[11px]">{q.followUpDate || "—"}</td>
                    <td className="p-3 text-center">
                      <Badge className={q.status === "Converted to Lead" ? "bg-purple-100 text-purple-800" : "bg-blue-100 text-blue-800"}>
                        {q.status}
                      </Badge>
                    </td>
                    <td className="p-3 text-right">
                      {q.status === "Open" ? (
                        <Button
                          size="sm"
                          onClick={() => convertMutation.mutate(q._id)}
                          disabled={convertMutation.isPending}
                          className="h-7 text-xs bg-emerald-600 hover:bg-emerald-700 text-white font-bold"
                        >
                          <Sparkles className="w-3 h-3 mr-1" /> Convert to Lead
                        </Button>
                      ) : (
                        <span className="text-[10px] font-mono font-bold text-purple-700">{q.leadId}</span>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* NEW WALK-IN MODAL */}
      <Dialog open={isNewModalOpen} onOpenChange={setIsNewModalOpen}>
        <DialogContent className="max-w-md p-6 rounded-2xl">
          <DialogHeader>
            <DialogTitle className="text-base font-bold flex items-center gap-2 text-slate-900">
              <Users className="w-4 h-4 text-[#3F63AD]" /> Log Walk-in Customer Enquiry
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3 text-xs pt-2">
            <div>
              <Label>Customer Name *</Label>
              <Input placeholder="Visitor name" value={form.customerName} onChange={(e) => setForm({ ...form, customerName: e.target.value })} className="mt-1 bg-slate-50" />
            </div>
            <div>
              <Label>Mobile Number (10 digits) *</Label>
              <Input maxLength={10} placeholder="Mobile number" value={form.mobile} onChange={(e) => setForm({ ...form, mobile: e.target.value })} className="mt-1 bg-slate-50 font-mono" />
            </div>
            <div>
              <Label>Visit Reason *</Label>
              <Select value={form.reason} onValueChange={(v) => setForm({ ...form, reason: v })}>
                <SelectTrigger className="mt-1 bg-slate-50"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="Product Enquiry">Product Enquiry</SelectItem>
                  <SelectItem value="Purchase">Purchase</SelectItem>
                  <SelectItem value="Price Enquiry">Price Enquiry</SelectItem>
                  <SelectItem value="Exchange">Exchange Old Unit</SelectItem>
                  <SelectItem value="Warranty">Warranty Support</SelectItem>
                  <SelectItem value="Service">Service / Repair</SelectItem>
                  <SelectItem value="Finance">Consumer Finance Enquiry</SelectItem>
                  <SelectItem value="Complaint">Complaint</SelectItem>
                  <SelectItem value="Other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <Label>Category</Label>
                <Select value={form.category} onValueChange={(v) => setForm({ ...form, category: v })}>
                  <SelectTrigger className="mt-1 bg-slate-50"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Electronics">Electronics (TV/Audio)</SelectItem>
                    <SelectItem value="Mobile">Mobile Phones</SelectItem>
                    <SelectItem value="Appliances">Home Appliances</SelectItem>
                    <SelectItem value="IT">Laptops & IT</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Budget Estimate (₹)</Label>
                <Input type="number" placeholder="e.g. 25000" value={form.budget || ""} onChange={(e) => setForm({ ...form, budget: Number(e.target.value) })} className="mt-1 bg-slate-50 font-mono" />
              </div>
            </div>
            <div>
              <Label>Interested Product / Model *</Label>
              <Input placeholder="e.g. Lloyd 43 inch Smart TV / iPhone 15" value={form.interestedProduct} onChange={(e) => setForm({ ...form, interestedProduct: e.target.value })} className="mt-1 bg-slate-50 font-semibold" />
            </div>
            <div>
              <Label>Follow-up Date (Optional)</Label>
              <Input type="date" value={form.followUpDate} onChange={(e) => setForm({ ...form, followUpDate: e.target.value })} className="mt-1 bg-slate-50" />
            </div>
            <div>
              <Label>Attended By Sales Staff</Label>
              <Input value={form.staff} onChange={(e) => setForm({ ...form, staff: e.target.value })} className="mt-1 bg-slate-50" />
            </div>
          </div>
          <DialogFooter className="mt-4">
            <Button variant="ghost" onClick={() => setIsNewModalOpen(false)}>Cancel</Button>
            <Button onClick={() => createMutation.mutate(form)} disabled={createMutation.isPending} className="bg-[#3F63AD] text-white font-bold">
              Save Entry
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </PageShell>
  );
}
