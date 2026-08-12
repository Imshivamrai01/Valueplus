"use client";

import { PageShell } from "@/components/shared/page-shell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Plus, Search, ArrowLeftRight, Warehouse, Trash2, AlertTriangle } from "lucide-react";
import { useState, useMemo } from "react";
import { toast } from "sonner";
import { formatDate } from "@/lib/utils";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

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

export default function StockTransferPage() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [transferToDelete, setTransferToDelete] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    fromWarehouse: "Main Store - Mumbai",
    toWarehouse: "Pune Branch",
    items: [{ itemId: "", itemName: "", quantity: 1, unit: "PCS" }],
  });

  const { data: items = [] } = useQuery({ 
    queryKey: ["items"], 
    queryFn: async () => {
      const res = await fetch("/api/items");
      const json = await res.json();
      return json.success ? json.data : [];
    }
  });

  const handleItemChange = (index: number, field: string, value: any) => {
    const updated = [...formData.items];
    if (field === "itemId") {
      const it = items.find((i: any) => i._id === value);
      updated[index].itemId = value;
      updated[index].itemName = it ? it.name : "";
      updated[index].unit = it ? it.unit : "PCS";
    } else {
      updated[index] = { ...updated[index], [field]: value };
    }
    setFormData({ ...formData, items: updated });
  };

  const { data: transfers = [], isLoading: loading } = useQuery({
    queryKey: ["stock-transfers"],
    queryFn: async () => {
      const res = await fetch("/api/stock-transfers");
      const json = await res.json();
      return json.success ? json.data : [];
    }
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

  const createTransferMutation = useMutation({
    mutationFn: async (payload: any) => {
      const res = await fetch("/api/stock-transfers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });
      const json = await res.json();
      if (!json.success) throw new Error(json.error || "Failed to create stock transfer");
      return json.data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["stock-transfers"] });
      toast.success(`Stock Transfer ${data.transferNo || ""} initiated!`);
      setIsFormOpen(false);
      setFormData({ fromWarehouse: "Main Store - Mumbai", toWarehouse: "Pune Branch", items: [{ itemId: "", itemName: "", quantity: 1, unit: "PCS" }] });
    },
    onError: (error: any) => {
      toast.error(error.message || "An error occurred");
    }
  });

  const deleteTransferMutation = useMutation({
    mutationFn: async (transferNo: string) => {
      const res = await fetch(`/api/stock-transfers?transferNo=${encodeURIComponent(transferNo)}`, { method: "DELETE" });
      const json = await res.json();
      if (!json.success) throw new Error(json.error || "Failed to delete stock transfer");
      return json;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["stock-transfers"] });
      toast.success("Stock Transfer deleted successfully");
      setTransferToDelete(null);
    },
    onError: (error: any) => {
      toast.error(error.message || "An error occurred while deleting");
    }
  });

  const handleSave = () => {
    if (formData.items.length === 0 || !formData.items[0].itemId) {
      toast.error("Please add at least one item to transfer");
      return;
    }

    const payload = {
      fromWarehouse: formData.fromWarehouse,
      toWarehouse: formData.toWarehouse,
      items: formData.items,
      date: new Date().toISOString().split("T")[0],
      status: "in-transit",
    };

    createTransferMutation.mutate(payload);
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
                <th className="px-4 py-3 text-center text-xs font-semibold text-muted-foreground uppercase w-10">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {loading ? (
                <tr>
                  <td colSpan={7} className="px-4 py-8 text-center text-muted-foreground">Loading...</td>
                </tr>
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-8 text-center text-muted-foreground">No stock transfers found</td>
                </tr>
              ) : (
                filtered.map((t: any) => (
                <tr key={t._id || t.id || t.transferNo || Math.random().toString()} className="hover:bg-slate-50 transition-colors">
                  <td className="px-4 py-3 font-mono font-bold text-[#3F63AD]">{t.transferNo}</td>
                  <td className="px-4 py-3">
                    <p className="font-semibold text-foreground">{t.fromWarehouse}</p>
                    <p className="text-xs text-muted-foreground">→ <span className="font-medium text-slate-700">{t.toWarehouse}</span></p>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex flex-col gap-1 text-xs">
                      {t.items?.map((line: any, i: number) => (
                        <span key={i} className="text-slate-700">
                          <span className="font-bold">{line.quantity}</span> x {line.itemName}
                        </span>
                      ))}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-center font-bold">{t.items?.reduce((acc: number, item: any) => acc + item.quantity, 0)} Items</td>
                  <td className="px-4 py-3 text-muted-foreground text-xs">{formatDate(t.date)}</td>
                  <td className="px-4 py-3 text-center">
                    <Badge variant={t.status === "received" ? "success" : "info"}>{t.status}</Badge>
                  </td>
                  <td className="px-4 py-3 text-center">
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      className="h-8 w-8 text-red-500 hover:text-red-700 hover:bg-red-50"
                      onClick={() => setTransferToDelete(t.transferNo)}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </td>
                </tr>
                ))
              )}
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

              </div>

              <div>
                <h4 className="font-medium text-sm mb-2 text-slate-700">Items to Transfer *</h4>
                <div className="border border-slate-200 rounded-lg overflow-hidden">
                  <table className="w-full text-sm">
                    <thead className="bg-slate-50 border-b">
                      <tr>
                        <th className="px-3 py-2 text-left text-xs font-semibold text-slate-600">Product Item</th>
                        <th className="px-3 py-2 text-right text-xs font-semibold text-slate-600 w-24">Quantity</th>
                        <th className="px-3 py-2 text-center text-xs font-semibold text-slate-600 w-12"></th>
                      </tr>
                    </thead>
                    <tbody className="divide-y">
                      {formData.items.map((line, idx) => (
                        <tr key={idx} className="bg-white">
                          <td className="p-2">
                            <Select value={line.itemId} onValueChange={(val) => handleItemChange(idx, "itemId", val)}>
                              <SelectTrigger className="w-full bg-transparent border-slate-200 h-8 text-sm">
                                <SelectValue placeholder="Select Product..." />
                              </SelectTrigger>
                              <SelectContent>
                                {items.map((it: any) => (
                                  <SelectItem key={it._id} value={it._id}>
                                    {it.name} <span className="text-muted-foreground ml-2">(Stock: {it.currentStock || 0})</span>
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </td>
                          <td className="p-2">
                            <Input
                              type="number"
                              min="1"
                              className="h-8 text-right bg-transparent"
                              value={line.quantity}
                              onKeyDown={(e) => ["-", "+", "e", "E"].includes(e.key) && e.preventDefault()}
                              onChange={(e) => handleItemChange(idx, "quantity", Math.max(1, Number(e.target.value)))}
                            />
                          </td>
                          <td className="p-2 text-center">
                            <button
                              type="button"
                              onClick={() => setFormData({ ...formData, items: formData.items.filter((_, i) => i !== idx) })}
                              className="text-red-500 hover:text-red-700 hover:bg-red-50 p-1.5 rounded"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  <div className="bg-slate-50 p-2 border-t">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="h-7 text-xs border-dashed text-slate-600"
                      onClick={() => setFormData({ ...formData, items: [...formData.items, { itemId: "", itemName: "", quantity: 1, unit: "PCS" }] })}
                    >
                      <Plus className="w-3 h-3 mr-1" /> Add Product
                    </Button>
                  </div>
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

      {/* DELETE CONFIRMATION MODAL */}
      <Dialog open={!!transferToDelete} onOpenChange={(open) => !open && setTransferToDelete(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-red-600 flex items-center gap-2">
              <AlertTriangle className="w-5 h-5" />
              Confirm Deletion
            </DialogTitle>
            <DialogDescription>
              Are you sure you want to delete transfer <span className="font-bold">{transferToDelete}</span>? 
              This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="mt-4">
            <Button variant="outline" onClick={() => setTransferToDelete(null)} disabled={deleteTransferMutation.isPending}>
              Cancel
            </Button>
            <Button 
              variant="destructive" 
              onClick={() => transferToDelete && deleteTransferMutation.mutate(transferToDelete)}
              disabled={deleteTransferMutation.isPending}
            >
              {deleteTransferMutation.isPending ? "Deleting..." : "Delete Transfer"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </PageShell>
  );
}

