"use client";

import { PageShell } from "@/components/shared/page-shell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Plus, Search, FileText, Send, CheckCircle, Clock } from "lucide-react";
import { useState, useMemo } from "react";
import { toast } from "sonner";
import { formatCurrency, formatDate } from "@/lib/utils";

interface EstimateItem {
  id: string;
  estimateNo: string;
  customerName: string;
  date: string;
  expiryDate: string;
  totalAmount: number;
  status: "sent" | "accepted" | "expired" | "draft";
}

const INITIAL_ESTIMATES: EstimateItem[] = [
  { id: "1", estimateNo: "EST-2026-0045", customerName: "Gupta Electronics Ltd", date: "2026-08-01", expiryDate: "2026-08-15", totalAmount: 185000, status: "sent" },
  { id: "2", estimateNo: "EST-2026-0044", customerName: "Verma Exports Pvt Ltd", date: "2026-07-29", expiryDate: "2026-08-12", totalAmount: 320000, status: "accepted" },
  { id: "3", estimateNo: "EST-2026-0043", customerName: "Singh & Sons Retailers", date: "2026-07-25", expiryDate: "2026-08-08", totalAmount: 95000, status: "sent" },
  { id: "4", estimateNo: "EST-2026-0042", customerName: "Agarwal Mobile Hub", date: "2026-07-20", expiryDate: "2026-08-03", totalAmount: 145000, status: "expired" },
];

export default function EstimatesPage() {
  const [estimates, setEstimates] = useState<EstimateItem[]>(INITIAL_ESTIMATES);
  const [search, setSearch] = useState("");
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [formData, setFormData] = useState({
    customerName: "",
    expiryDate: "",
    totalAmount: "",
  });

  const filtered = useMemo(() => {
    return estimates.filter(
      (e) =>
        !search ||
        e.estimateNo.toLowerCase().includes(search.toLowerCase()) ||
        e.customerName.toLowerCase().includes(search.toLowerCase())
    );
  }, [estimates, search]);

  const handleSave = () => {
    if (!formData.customerName || !formData.totalAmount) {
      toast.error("Please fill Customer Name and Amount");
      return;
    }

    const newEst: EstimateItem = {
      id: String(Date.now()),
      estimateNo: `EST-2026-${String(estimates.length + 46).padStart(4, "0")}`,
      customerName: formData.customerName,
      date: new Date().toISOString().split("T")[0],
      expiryDate: formData.expiryDate || "2026-08-20",
      totalAmount: Number(formData.totalAmount) || 0,
      status: "sent",
    };

    setEstimates([newEst, ...estimates]);
    toast.success(`Estimate ${newEst.estimateNo} created & sent!`);
    setIsFormOpen(false);
  };

  return (
    <PageShell
      title="Estimates & Quotations"
      subtitle="Create and manage customer price quotes"
      breadcrumbs={[{ label: "Sales" }, { label: "Estimates" }]}
      actions={
        <Button size="sm" onClick={() => setIsFormOpen(true)}>
          <Plus className="w-4 h-4 mr-1.5" /> New Estimate
        </Button>
      }
    >
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[{ label: "Total Estimates", value: estimates.length }, { label: "Accepted", value: estimates.filter(e => e.status === "accepted").length }, { label: "Sent / Pending", value: estimates.filter(e => e.status === "sent").length }, { label: "Quoted Value", value: formatCurrency(estimates.reduce((a, b) => a + b.totalAmount, 0)) }].map((s) => (
          <div key={s.label} className="metric-card">
            <p className="text-2xl font-bold">{s.value}</p>
            <p className="text-xs text-muted-foreground mt-1">{s.label}</p>
          </div>
        ))}
      </div>

      <div className="data-table-container">
        <div className="flex items-center justify-between p-4 border-b">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input placeholder="Search estimates..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 border-b">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase">Estimate #</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase">Customer</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase">Date</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase">Valid Until</th>
                <th className="px-4 py-3 text-right text-xs font-semibold text-muted-foreground uppercase">Amount</th>
                <th className="px-4 py-3 text-center text-xs font-semibold text-muted-foreground uppercase">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {filtered.map((e) => (
                <tr key={e.id} className="hover:bg-slate-50 transition-colors">
                  <td className="px-4 py-3 font-mono font-bold text-[#3F63AD]">{e.estimateNo}</td>
                  <td className="px-4 py-3 font-medium text-foreground">{e.customerName}</td>
                  <td className="px-4 py-3 text-muted-foreground text-xs">{formatDate(e.date)}</td>
                  <td className="px-4 py-3 text-muted-foreground text-xs">{formatDate(e.expiryDate)}</td>
                  <td className="px-4 py-3 text-right font-semibold">{formatCurrency(e.totalAmount)}</td>
                  <td className="px-4 py-3 text-center">
                    <Badge variant={e.status === "accepted" ? "success" : e.status === "sent" ? "info" : "secondary"}>{e.status}</Badge>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
        <DialogContent className="max-w-2xl p-0 rounded-2xl border-none shadow-2xl overflow-hidden">
          {/* Header */}
          <div className="bg-gradient-to-r from-[#1B2537] via-[#2C3E5A] to-[#1B2537] text-white p-6 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl bg-white/10 flex items-center justify-center backdrop-blur-md border border-white/20">
                <FileText className="w-6 h-6 text-[#76C043]" />
              </div>
              <div>
                <h3 className="text-xl font-bold tracking-tight">Create Quotation / Estimate</h3>
                <p className="text-xs text-slate-300 mt-0.5">
                  Generate price estimate and commercial quotation for client approval
                </p>
              </div>
            </div>
          </div>

          <div className="p-6 space-y-4 bg-slate-50/50">
            <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1.5 md:col-span-2">
                  <Label className="text-xs font-semibold text-slate-700">Customer / Client Name *</Label>
                  <Input
                    placeholder="e.g. Gupta Electronics Ltd"
                    value={formData.customerName}
                    onChange={(e) => setFormData({ ...formData, customerName: e.target.value })}
                    className="bg-slate-50 border-slate-300"
                  />
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold text-slate-700">Quote Expiry Date</Label>
                  <Input
                    type="date"
                    value={formData.expiryDate}
                    onChange={(e) => setFormData({ ...formData, expiryDate: e.target.value })}
                    className="bg-slate-50 border-slate-300"
                  />
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold text-slate-700">Total Estimated Amount (₹) *</Label>
                  <Input
                    type="number"
                    placeholder="185000"
                    value={formData.totalAmount}
                    onChange={(e) => setFormData({ ...formData, totalAmount: e.target.value })}
                    className="bg-slate-50 border-slate-300 font-semibold"
                  />
                </div>
              </div>
            </div>
          </div>

          <div className="bg-slate-100 px-6 py-4 rounded-b-2xl border-t border-slate-200 flex items-center justify-end gap-3">
            <Button variant="outline" onClick={() => setIsFormOpen(false)} className="px-5">
              Cancel
            </Button>
            <Button onClick={handleSave} className="bg-[#3F63AD] hover:bg-[#2E4F95] text-white px-6 font-bold shadow-lg shadow-[#3F63AD]/20">
              Create & Send Estimate
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </PageShell>
  );
}

