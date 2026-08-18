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
import { AlertTriangle, Plus, Search, CheckCircle2, XCircle, ShieldAlert, ShieldCheck } from "lucide-react";
import { toast } from "sonner";

export default function StockDiscrepanciesPage() {
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState("");
  const [isLogModalOpen, setIsLogModalOpen] = useState(false);

  const { data: items = [] } = useQuery({
    queryKey: ["items"],
    queryFn: async () => {
      const res = await fetch("/api/items");
      const json = await res.json();
      return json.success ? json.data : [];
    },
  });

  const { data: discrepancies = [], isLoading } = useQuery({
    queryKey: ["discrepancies"],
    queryFn: async () => {
      const res = await fetch("/api/inventory/discrepancies");
      const json = await res.json();
      return json.success ? json.data : [];
    },
  });

  const [form, setForm] = useState({
    productId: "",
    productName: "",
    vpCode: "",
    systemStock: 0,
    physicalStock: 0,
    difference: 0,
    reason: "Damaged in transit / Store breakage",
    reportedBy: "Store Staff",
  });

  const selectItemForDiscrepancy = (itemId: string) => {
    const it = items.find((i: any) => i._id === itemId);
    if (it) {
      setForm({
        ...form,
        productId: it._id,
        productName: it.name,
        vpCode: it.vpCode || it.code,
        systemStock: it.currentStock || 0,
        physicalStock: it.currentStock || 0,
        difference: 0,
      });
    }
  };

  const createDiscrepancyMutation = useMutation({
    mutationFn: async (payload: any) => {
      const res = await fetch("/api/inventory/discrepancies", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const json = await res.json();
      if (!json.success) throw new Error(json.error || "Failed to log discrepancy");
      return json.data;
    },
    onSuccess: () => {
      toast.success("Stock discrepancy logged for authorization");
      queryClient.invalidateQueries({ queryKey: ["discrepancies"] });
      setIsLogModalOpen(false);
    },
    onError: (err: any) => toast.error(err.message),
  });

  const updateStatusMutation = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      const res = await fetch("/api/inventory/discrepancies", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, status, approvedBy: "Admin / Manager" }),
      });
      const json = await res.json();
      if (!json.success) throw new Error(json.error || "Update failed");
      return json.data;
    },
    onSuccess: (data: any) => {
      toast.success(data.message || "Discrepancy updated");
      queryClient.invalidateQueries({ queryKey: ["discrepancies"] });
      queryClient.invalidateQueries({ queryKey: ["items"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard"] });
    },
    onError: (err: any) => toast.error(err.message),
  });

  const filtered = discrepancies.filter((d: any) =>
    (d.discrepancyNumber || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
    (d.productName || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
    (d.vpCode || "").toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <PageShell
      title="Stock Discrepancy & Leakage Audit Trail"
      description="Track and authorize stock count variances, audit discrepancies, and prevent unauthorized inventory changes."
    >
      <div className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3 bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
          <div className="relative flex-1 min-w-[260px] max-w-md">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <Input
              placeholder="Search discrepancy #, product or VP code..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9 bg-slate-50 border-slate-300 text-xs"
            />
          </div>

          <Button
            onClick={() => setIsLogModalOpen(true)}
            className="bg-red-600 hover:bg-red-700 text-white text-xs font-bold shadow-sm"
          >
            <AlertTriangle className="w-3.5 h-3.5 mr-1.5" /> Log Stock Discrepancy
          </Button>
        </div>

        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
          <table className="w-full text-xs text-left">
            <thead className="bg-slate-50 border-b text-slate-700 uppercase font-bold">
              <tr>
                <th className="p-3">Discrepancy #</th>
                <th className="p-3">Product Name & VP Code</th>
                <th className="p-3 text-center">System Stock</th>
                <th className="p-3 text-center">Physical Count</th>
                <th className="p-3 text-center">Variance</th>
                <th className="p-3">Reason / Justification</th>
                <th className="p-3">Reported By</th>
                <th className="p-3 text-center">Status</th>
                <th className="p-3 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {isLoading ? (
                <tr><td colSpan={9} className="p-6 text-center text-slate-500">Loading discrepancies...</td></tr>
              ) : filtered.length === 0 ? (
                <tr><td colSpan={9} className="p-6 text-center text-slate-500">No stock leakage or discrepancy records recorded.</td></tr>
              ) : (
                filtered.map((d: any) => (
                  <tr key={d._id} className="hover:bg-slate-50 transition-colors">
                    <td className="p-3 font-mono font-bold text-[#3F63AD]">{d.discrepancyNumber}</td>
                    <td className="p-3 font-bold text-slate-900">
                      {d.productName}
                      {d.vpCode && <span className="block text-[10px] font-mono text-blue-600 font-normal">VP: {d.vpCode}</span>}
                    </td>
                    <td className="p-3 text-center font-mono font-bold text-slate-700">{d.systemStock}</td>
                    <td className="p-3 text-center font-mono font-bold text-slate-900">{d.physicalStock}</td>
                    <td className="p-3 text-center font-mono font-bold">
                      <span className={d.difference < 0 ? "text-red-600 font-black" : "text-emerald-700 font-black"}>
                        {d.difference > 0 ? `+${d.difference}` : d.difference}
                      </span>
                    </td>
                    <td className="p-3 text-slate-700 max-w-xs">{d.reason}</td>
                    <td className="p-3 text-slate-600">{d.reportedBy}</td>
                    <td className="p-3 text-center">
                      <Badge className={
                        d.status === "Approved" ? "bg-emerald-100 text-emerald-800" :
                        d.status === "Rejected" ? "bg-red-100 text-red-800" :
                        "bg-amber-100 text-amber-800"
                      }>
                        {d.status}
                      </Badge>
                    </td>
                    <td className="p-3 text-right">
                      {d.status === "Pending Approval" ? (
                        <div className="flex items-center justify-end gap-1.5">
                          <Button
                            size="sm"
                            onClick={() => updateStatusMutation.mutate({ id: d._id, status: "Approved" })}
                            className="h-7 text-xs bg-emerald-600 hover:bg-emerald-700 text-white font-bold"
                          >
                            <ShieldCheck className="w-3 h-3 mr-1" /> Approve
                          </Button>
                          <Button
                            size="sm"
                            variant="destructive"
                            onClick={() => updateStatusMutation.mutate({ id: d._id, status: "Rejected" })}
                            className="h-7 text-xs font-bold"
                          >
                            Reject
                          </Button>
                        </div>
                      ) : (
                        <span className="text-[10px] font-mono text-slate-400">By {d.approvedBy || "Admin"}</span>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* LOG DISCREPANCY MODAL */}
      <Dialog open={isLogModalOpen} onOpenChange={setIsLogModalOpen}>
        <DialogContent className="max-w-md p-6 rounded-2xl">
          <DialogHeader>
            <DialogTitle className="text-base font-bold flex items-center gap-2 text-slate-900">
              <AlertTriangle className="w-4 h-4 text-red-600" /> Log Inventory Leakage / Discrepancy
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3 text-xs pt-2">
            <div>
              <Label>Select Product *</Label>
              <Select value={form.productId} onValueChange={selectItemForDiscrepancy}>
                <SelectTrigger className="mt-1 bg-slate-50"><SelectValue placeholder="Choose product item..." /></SelectTrigger>
                <SelectContent>
                  {items.map((it: any) => (
                    <SelectItem key={it._id} value={it._id}>
                      {it.name} ({it.vpCode || it.code}) • Stock: {it.currentStock}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <Label>System Stock</Label>
                <Input readOnly value={form.systemStock} className="mt-1 bg-slate-100 font-bold" />
              </div>
              <div>
                <Label>Actual Physical Count *</Label>
                <Input 
                  type="number" min="0" 
                  value={form.physicalStock} 
                  onChange={(e) => {
                    const val = Number(e.target.value);
                    setForm({ ...form, physicalStock: val, difference: val - form.systemStock });
                  }} 
                  className="mt-1 bg-white font-bold" 
                />
              </div>
            </div>
            <div>
              <Label>Calculated Variance</Label>
              <div className="h-8 rounded-md bg-slate-100 flex items-center px-3 font-mono font-bold text-sm">
                {form.difference < 0 ? (
                  <span className="text-red-600">{form.difference} units (Shortage / Leakage)</span>
                ) : (
                  <span className="text-emerald-700">+{form.difference} units (Surplus)</span>
                )}
              </div>
            </div>
            <div>
              <Label>Reason / Explanation *</Label>
              <Input 
                placeholder="e.g. Broken display unit, physical counting error" 
                value={form.reason} 
                onChange={(e) => setForm({ ...form, reason: e.target.value })} 
                className="mt-1 bg-slate-50" 
              />
            </div>
            <div>
              <Label>Reported By</Label>
              <Input value={form.reportedBy} onChange={(e) => setForm({ ...form, reportedBy: e.target.value })} className="mt-1 bg-slate-50" />
            </div>
          </div>
          <DialogFooter className="mt-4">
            <Button variant="ghost" onClick={() => setIsLogModalOpen(false)}>Cancel</Button>
            <Button 
              onClick={() => createDiscrepancyMutation.mutate(form)} 
              disabled={createDiscrepancyMutation.isPending || !form.productId} 
              className="bg-red-600 text-white font-bold"
            >
              Submit for Authorization
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </PageShell>
  );
}
