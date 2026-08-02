"use client";

import { PageShell } from "@/components/shared/page-shell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Plus, Search, ArrowLeftRight, Warehouse } from "lucide-react";
import { useState, useMemo } from "react";
import { toast } from "sonner";
import { formatDate } from "@/lib/utils";

interface TransferItem {
  id: string;
  transferNo: string;
  fromWarehouse: string;
  toWarehouse: string;
  itemName: string;
  quantity: number;
  unit: string;
  date: string;
  status: "received" | "in-transit" | "draft";
}

const INITIAL_TRANSFERS: TransferItem[] = [
  { id: "1", transferNo: "STR-2026-0034", fromWarehouse: "Main Store - Mumbai", toWarehouse: "Pune Branch", itemName: "iPhone 15 Pro Max 256GB", quantity: 5, unit: "PCS", date: "2026-08-01", status: "in-transit" },
  { id: "2", transferNo: "STR-2026-0033", fromWarehouse: "Main Store - Mumbai", toWarehouse: "Delhi Hub", itemName: "AirPods Pro Gen 2", quantity: 15, unit: "PR", date: "2026-07-29", status: "received" },
  { id: "3", transferNo: "STR-2026-0032", fromWarehouse: "Delhi Hub", toWarehouse: "Bengaluru Store", itemName: "Sony Bravia 55\" 4K Smart TV", quantity: 3, unit: "PCS", date: "2026-07-25", status: "received" },
  { id: "4", transferNo: "STR-2026-0031", fromWarehouse: "Main Store - Mumbai", toWarehouse: "Bengaluru Store", itemName: "MacBook Air M3 16GB/512GB", quantity: 4, unit: "PCS", date: "2026-07-20", status: "received" },
];

export default function StockTransferPage() {
  const [transfers, setTransfers] = useState<TransferItem[]>(INITIAL_TRANSFERS);
  const [search, setSearch] = useState("");
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [formData, setFormData] = useState({
    fromWarehouse: "Main Store - Mumbai",
    toWarehouse: "Pune Branch",
    itemName: "",
    quantity: "1",
    unit: "PCS",
  });

  const filtered = useMemo(() => {
    return transfers.filter(
      (t) =>
        !search ||
        t.transferNo.toLowerCase().includes(search.toLowerCase()) ||
        t.itemName.toLowerCase().includes(search.toLowerCase()) ||
        t.fromWarehouse.toLowerCase().includes(search.toLowerCase()) ||
        t.toWarehouse.toLowerCase().includes(search.toLowerCase())
    );
  }, [transfers, search]);

  const handleSave = () => {
    if (!formData.itemName || !formData.quantity) {
      toast.error("Please fill Item Name and Quantity");
      return;
    }

    const newTransfer: TransferItem = {
      id: String(Date.now()),
      transferNo: `STR-2026-${String(transfers.length + 35).padStart(4, "0")}`,
      fromWarehouse: formData.fromWarehouse,
      toWarehouse: formData.toWarehouse,
      itemName: formData.itemName,
      quantity: Number(formData.quantity) || 1,
      unit: formData.unit,
      date: new Date().toISOString().split("T")[0],
      status: "in-transit",
    };

    setTransfers([newTransfer, ...transfers]);
    toast.success(`Stock Transfer ${newTransfer.transferNo} initiated!`);
    setIsFormOpen(false);
  };

  return (
    <PageShell
      title="Stock Transfer"
      subtitle="Transfer stock between stores and warehouses"
      breadcrumbs={[{ label: "Inventory" }, { label: "Stock Transfer" }]}
      actions={
        <Button size="sm" onClick={() => setIsFormOpen(true)}>
          <Plus className="w-4 h-4 mr-1.5" /> New Stock Transfer
        </Button>
      }
    >
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[{ label: "Total Transfers", value: transfers.length }, { label: "In-Transit", value: transfers.filter(t => t.status === "in-transit").length }, { label: "Received", value: transfers.filter(t => t.status === "received").length }, { label: "Active Warehouses", value: 4 }].map((s) => (
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
            <Input placeholder="Search transfers, stores..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 border-b">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase">Transfer #</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase">From Store → To Store</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase">Item Name</th>
                <th className="px-4 py-3 text-center text-xs font-semibold text-muted-foreground uppercase">Quantity</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase">Date</th>
                <th className="px-4 py-3 text-center text-xs font-semibold text-muted-foreground uppercase">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {filtered.map((t) => (
                <tr key={t.id} className="hover:bg-slate-50 transition-colors">
                  <td className="px-4 py-3 font-mono font-bold text-[#3F63AD]">{t.transferNo}</td>
                  <td className="px-4 py-3">
                    <p className="font-semibold text-foreground">{t.fromWarehouse}</p>
                    <p className="text-xs text-muted-foreground">→ <span className="font-medium text-slate-700">{t.toWarehouse}</span></p>
                  </td>
                  <td className="px-4 py-3 font-medium text-foreground">{t.itemName}</td>
                  <td className="px-4 py-3 text-center font-bold">{t.quantity} {t.unit}</td>
                  <td className="px-4 py-3 text-muted-foreground text-xs">{formatDate(t.date)}</td>
                  <td className="px-4 py-3 text-center">
                    <Badge variant={t.status === "received" ? "success" : "info"}>{t.status}</Badge>
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
                <ArrowLeftRight className="w-6 h-6 text-[#76C043]" />
              </div>
              <div>
                <h3 className="text-xl font-bold tracking-tight">Inter-Store Stock Transfer</h3>
                <p className="text-xs text-slate-300 mt-0.5">
                  Transfer stock items between central hubs, regional warehouses & branch outlets
                </p>
              </div>
            </div>
          </div>

          <div className="p-6 space-y-4 bg-slate-50/50">
            <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold text-slate-700">Source Store (From Warehouse) *</Label>
                  <Select value={formData.fromWarehouse} onValueChange={(v) => setFormData({ ...formData, fromWarehouse: v })}>
                    <SelectTrigger className="bg-slate-50 border-slate-300"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Main Store - Mumbai">Main Store - Mumbai</SelectItem>
                      <SelectItem value="Pune Branch">Pune Branch</SelectItem>
                      <SelectItem value="Delhi Hub">Delhi Hub</SelectItem>
                      <SelectItem value="Bengaluru Store">Bengaluru Store</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold text-slate-700">Destination Store (To Warehouse) *</Label>
                  <Select value={formData.toWarehouse} onValueChange={(v) => setFormData({ ...formData, toWarehouse: v })}>
                    <SelectTrigger className="bg-slate-50 border-slate-300"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Main Store - Mumbai">Main Store - Mumbai</SelectItem>
                      <SelectItem value="Pune Branch">Pune Branch</SelectItem>
                      <SelectItem value="Delhi Hub">Delhi Hub</SelectItem>
                      <SelectItem value="Bengaluru Store">Bengaluru Store</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1.5 md:col-span-2">
                  <Label className="text-xs font-semibold text-slate-700">Item Name & Model *</Label>
                  <Input
                    placeholder="e.g. iPhone 15 Pro Max 256GB"
                    value={formData.itemName}
                    onChange={(e) => setFormData({ ...formData, itemName: e.target.value })}
                    className="bg-slate-50 border-slate-300"
                  />
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold text-slate-700">Transfer Quantity</Label>
                  <Input
                    type="number"
                    value={formData.quantity}
                    onChange={(e) => setFormData({ ...formData, quantity: e.target.value })}
                    className="bg-slate-50 border-slate-300 font-bold"
                  />
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold text-slate-700">Unit of Measurement</Label>
                  <Select value={formData.unit} onValueChange={(v) => setFormData({ ...formData, unit: v })}>
                    <SelectTrigger className="bg-slate-50 border-slate-300"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="PCS">PCS</SelectItem>
                      <SelectItem value="BOX">BOX</SelectItem>
                      <SelectItem value="SET">SET</SelectItem>
                      <SelectItem value="PR">PR</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-slate-100 px-6 py-4 rounded-b-2xl border-t border-slate-200 flex items-center justify-end gap-3">
            <Button variant="outline" onClick={() => setIsFormOpen(false)} className="px-5">
              Cancel
            </Button>
            <Button onClick={handleSave} className="bg-[#3F63AD] hover:bg-[#2E4F95] text-white px-6 font-bold shadow-lg shadow-[#3F63AD]/20">
              Initiate Stock Transfer
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </PageShell>
  );
}

