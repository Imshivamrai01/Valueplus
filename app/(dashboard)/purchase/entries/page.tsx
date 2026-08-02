"use client";

import { PageShell } from "@/components/shared/page-shell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Plus, Search, ClipboardList } from "lucide-react";
import { useState, useMemo } from "react";
import { toast } from "sonner";
import { formatCurrency, formatDate } from "@/lib/utils";

interface PurchaseEntryItem {
  id: string;
  billNo: string;
  supplierName: string;
  billDate: string;
  dueDate: string;
  subtotal: number;
  gst: number;
  total: number;
  paid: number;
  balance: number;
  status: "paid" | "pending" | "partial" | "overdue";
}

const INITIAL_ENTRIES: PurchaseEntryItem[] = [
  { id: "1", billNo: "BILL-APL-9081", supplierName: "Apple India Pvt Ltd", billDate: "2026-08-01", dueDate: "2026-08-31", subtotal: 1500000, gst: 270000, total: 1770000, paid: 1770000, balance: 0, status: "paid" },
  { id: "2", billNo: "BILL-SMG-7712", supplierName: "Samsung Electronics India", billDate: "2026-07-28", dueDate: "2026-08-27", subtotal: 1000000, gst: 180000, total: 1180000, paid: 500000, balance: 680000, status: "partial" },
  { id: "3", billNo: "BILL-BAT-4412", supplierName: "boAt Lifestyle Audio", billDate: "2026-07-25", dueDate: "2026-08-24", subtotal: 380000, gst: 68400, total: 448400, paid: 448400, balance: 0, status: "paid" },
  { id: "4", billNo: "BILL-SNY-3319", supplierName: "Sony India Distribution", billDate: "2026-07-20", dueDate: "2026-08-19", subtotal: 750000, gst: 135000, total: 885000, paid: 0, balance: 885000, status: "pending" },
];

export default function PurchaseEntriesPage() {
  const [entries, setEntries] = useState<PurchaseEntryItem[]>(INITIAL_ENTRIES);
  const [search, setSearch] = useState("");
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [formData, setFormData] = useState({
    billNo: "",
    supplierName: "",
    totalAmount: "",
  });

  const filtered = useMemo(() => {
    return entries.filter(
      (e) =>
        !search ||
        e.billNo.toLowerCase().includes(search.toLowerCase()) ||
        e.supplierName.toLowerCase().includes(search.toLowerCase())
    );
  }, [entries, search]);

  const handleSave = () => {
    if (!formData.supplierName || !formData.totalAmount) {
      toast.error("Please fill Supplier Name and Bill Amount");
      return;
    }

    const total = Number(formData.totalAmount) || 0;
    const subtotal = Math.round(total / 1.18);
    const gst = total - subtotal;

    const newEntry: PurchaseEntryItem = {
      id: String(Date.now()),
      billNo: formData.billNo || `BILL-2026-${String(entries.length + 88).padStart(4, "0")}`,
      supplierName: formData.supplierName,
      billDate: new Date().toISOString().split("T")[0],
      dueDate: "2026-08-30",
      subtotal,
      gst,
      total,
      paid: total,
      balance: 0,
      status: "paid",
    };

    setEntries([newEntry, ...entries]);
    toast.success(`Purchase Entry ${newEntry.billNo} recorded!`);
    setIsFormOpen(false);
  };

  return (
    <PageShell
      title="Purchase Entry (Supplier Bills)"
      subtitle="Record and manage supplier purchase invoices & payables"
      breadcrumbs={[{ label: "Purchase" }, { label: "Purchase Entry" }]}
      actions={
        <Button size="sm" onClick={() => setIsFormOpen(true)}>
          <Plus className="w-4 h-4 mr-1.5" /> New Purchase Entry
        </Button>
      }
    >
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[{ label: "Total Billed", value: formatCurrency(entries.reduce((a, b) => a + b.total, 0)) }, { label: "Paid to Suppliers", value: formatCurrency(entries.reduce((a, b) => a + b.paid, 0)) }, { label: "Payables Balance", value: formatCurrency(entries.reduce((a, b) => a + b.balance, 0)) }, { label: "Total Bills", value: entries.length }].map((s) => (
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
            <Input placeholder="Search Bill #, Supplier..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 border-b">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase">Supplier Bill #</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase">Supplier Name</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase">Bill Date</th>
                <th className="px-4 py-3 text-right text-xs font-semibold text-muted-foreground uppercase">Subtotal</th>
                <th className="px-4 py-3 text-right text-xs font-semibold text-muted-foreground uppercase">GST</th>
                <th className="px-4 py-3 text-right text-xs font-semibold text-muted-foreground uppercase">Total Amount</th>
                <th className="px-4 py-3 text-center text-xs font-semibold text-muted-foreground uppercase">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {filtered.map((e) => (
                <tr key={e.id} className="hover:bg-slate-50 transition-colors">
                  <td className="px-4 py-3 font-mono font-bold text-[#3F63AD]">{e.billNo}</td>
                  <td className="px-4 py-3 font-medium text-foreground">{e.supplierName}</td>
                  <td className="px-4 py-3 text-muted-foreground text-xs">{formatDate(e.billDate)}</td>
                  <td className="px-4 py-3 text-right">{formatCurrency(e.subtotal)}</td>
                  <td className="px-4 py-3 text-right text-muted-foreground">{formatCurrency(e.gst)}</td>
                  <td className="px-4 py-3 text-right font-semibold">{formatCurrency(e.total)}</td>
                  <td className="px-4 py-3 text-center">
                    <Badge variant={e.status === "paid" ? "success" : e.status === "partial" ? "info" : "warning"}>{e.status}</Badge>
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
                <ClipboardList className="w-6 h-6 text-[#76C043]" />
              </div>
              <div>
                <h3 className="text-xl font-bold tracking-tight">Record Supplier Purchase Bill</h3>
                <p className="text-xs text-slate-300 mt-0.5">
                  Input incoming purchase invoice, GST breakdown and supplier payables
                </p>
              </div>
            </div>
          </div>

          <div className="p-6 space-y-4 bg-slate-50/50">
            <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold text-slate-700">Supplier Bill / Invoice No.</Label>
                  <Input
                    placeholder="BILL-APL-9081"
                    value={formData.billNo}
                    onChange={(e) => setFormData({ ...formData, billNo: e.target.value })}
                    className="bg-slate-50 border-slate-300 font-mono"
                  />
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold text-slate-700">Supplier Name *</Label>
                  <Input
                    placeholder="e.g. Apple India Pvt Ltd"
                    value={formData.supplierName}
                    onChange={(e) => setFormData({ ...formData, supplierName: e.target.value })}
                    className="bg-slate-50 border-slate-300"
                  />
                </div>

                <div className="space-y-1.5 md:col-span-2">
                  <Label className="text-xs font-semibold text-slate-700">Total Purchase Bill Amount (incl. GST) ₹ *</Label>
                  <Input
                    type="number"
                    placeholder="250000"
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
              Save Purchase Entry
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </PageShell>
  );
}

