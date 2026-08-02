"use client";

import { PageShell } from "@/components/shared/page-shell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Plus, Search, ShoppingBag, Truck } from "lucide-react";
import { useState, useMemo } from "react";
import { toast } from "sonner";
import { formatCurrency, formatDate } from "@/lib/utils";

interface POItem {
  id: string;
  poNo: string;
  supplierName: string;
  date: string;
  expectedDate: string;
  totalAmount: number;
  status: "sent" | "received" | "partial" | "pending";
}

const INITIAL_POS: POItem[] = [
  { id: "1", poNo: "PO-2026-0112", supplierName: "Apple India Pvt Ltd", date: "2026-08-01", expectedDate: "2026-08-06", totalAmount: 1850000, status: "sent" },
  { id: "2", poNo: "PO-2026-0111", supplierName: "Samsung Electronics India", date: "2026-07-28", expectedDate: "2026-08-02", totalAmount: 1240000, status: "received" },
  { id: "3", poNo: "PO-2026-0110", supplierName: "boAt Lifestyle Audio", date: "2026-07-25", expectedDate: "2026-07-30", totalAmount: 450000, status: "received" },
  { id: "4", poNo: "PO-2026-0109", supplierName: "Sony India Distribution", date: "2026-07-22", expectedDate: "2026-07-29", totalAmount: 890000, status: "partial" },
];

export default function PurchaseOrdersPage() {
  const [pos, setPos] = useState<POItem[]>(INITIAL_POS);
  const [search, setSearch] = useState("");
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [formData, setFormData] = useState({
    supplierName: "",
    expectedDate: "",
    totalAmount: "",
  });

  const filtered = useMemo(() => {
    return pos.filter(
      (p) =>
        !search ||
        p.poNo.toLowerCase().includes(search.toLowerCase()) ||
        p.supplierName.toLowerCase().includes(search.toLowerCase())
    );
  }, [pos, search]);

  const handleSave = () => {
    if (!formData.supplierName || !formData.totalAmount) {
      toast.error("Please fill Supplier Name and Total Amount");
      return;
    }

    const newPO: POItem = {
      id: String(Date.now()),
      poNo: `PO-2026-${String(pos.length + 113).padStart(4, "0")}`,
      supplierName: formData.supplierName,
      date: new Date().toISOString().split("T")[0],
      expectedDate: formData.expectedDate || "2026-08-10",
      totalAmount: Number(formData.totalAmount) || 0,
      status: "sent",
    };

    setPos([newPO, ...pos]);
    toast.success(`Purchase Order ${newPO.poNo} sent to ${newPO.supplierName}`);
    setIsFormOpen(false);
  };

  return (
    <PageShell
      title="Purchase Orders"
      subtitle="Manage inventory restock purchase orders to suppliers"
      breadcrumbs={[{ label: "Purchase" }, { label: "Purchase Orders" }]}
      actions={
        <Button size="sm" onClick={() => setIsFormOpen(true)}>
          <Plus className="w-4 h-4 mr-1.5" /> New Purchase Order
        </Button>
      }
    >
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[{ label: "Total POs", value: pos.length }, { label: "Received", value: pos.filter(p => p.status === "received").length }, { label: "In-Transit / Sent", value: pos.filter(p => p.status === "sent").length }, { label: "Total PO Value", value: formatCurrency(pos.reduce((a, b) => a + b.totalAmount, 0)) }].map((s) => (
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
            <Input placeholder="Search PO #, supplier..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 border-b">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase">PO #</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase">Supplier Name</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase">Order Date</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase">Expected Date</th>
                <th className="px-4 py-3 text-right text-xs font-semibold text-muted-foreground uppercase">PO Amount</th>
                <th className="px-4 py-3 text-center text-xs font-semibold text-muted-foreground uppercase">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {filtered.map((p) => (
                <tr key={p.id} className="hover:bg-slate-50 transition-colors">
                  <td className="px-4 py-3 font-mono font-bold text-[#3F63AD]">{p.poNo}</td>
                  <td className="px-4 py-3 font-medium text-foreground">{p.supplierName}</td>
                  <td className="px-4 py-3 text-muted-foreground text-xs">{formatDate(p.date)}</td>
                  <td className="px-4 py-3 text-muted-foreground text-xs">{formatDate(p.expectedDate)}</td>
                  <td className="px-4 py-3 text-right font-semibold">{formatCurrency(p.totalAmount)}</td>
                  <td className="px-4 py-3 text-center">
                    <Badge variant={p.status === "received" ? "success" : p.status === "partial" ? "info" : "warning"}>{p.status}</Badge>
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
                <ShoppingBag className="w-6 h-6 text-[#76C043]" />
              </div>
              <div>
                <h3 className="text-xl font-bold tracking-tight">Create Purchase Order (PO)</h3>
                <p className="text-xs text-slate-300 mt-0.5">
                  Issue inventory restocking order to electronics manufacturer or distributor
                </p>
              </div>
            </div>
          </div>

          <div className="p-6 space-y-4 bg-slate-50/50">
            <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1.5 md:col-span-2">
                  <Label className="text-xs font-semibold text-slate-700">Supplier / Vendor Name *</Label>
                  <Input
                    placeholder="e.g. Apple India Pvt Ltd"
                    value={formData.supplierName}
                    onChange={(e) => setFormData({ ...formData, supplierName: e.target.value })}
                    className="bg-slate-50 border-slate-300"
                  />
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold text-slate-700">Expected Delivery Date</Label>
                  <Input
                    type="date"
                    value={formData.expectedDate}
                    onChange={(e) => setFormData({ ...formData, expectedDate: e.target.value })}
                    className="bg-slate-50 border-slate-300"
                  />
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold text-slate-700">Estimated Total Order Value (₹) *</Label>
                  <Input
                    type="number"
                    placeholder="500000"
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
              Send Purchase Order
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </PageShell>
  );
}

