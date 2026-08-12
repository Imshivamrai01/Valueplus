import React, { useState, useMemo, useEffect } from "react";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Plus, Trash2, ClipboardList, FileMinus, ShoppingBag } from "lucide-react";
import { toast } from "sonner";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

function formatCurrency(val: number) {
  return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 2 }).format(val);
}

export function PurchaseCreationModal({ isOpen, onClose, mode = "entry" }: { isOpen: boolean; onClose: () => void; mode?: "entry" | "debit-note" | "order" }) {
  const queryClient = useQueryClient();

  const { data: suppliers = [] } = useQuery({
    queryKey: ["suppliers"],
    queryFn: async () => {
      const res = await fetch("/api/suppliers");
      const json = await res.json();
      return json.success ? json.data : [];
    }
  });

  const { data: catalogItems = [] } = useQuery({
    queryKey: ["items"],
    queryFn: async () => {
      const res = await fetch("/api/items");
      const json = await res.json();
      return json.success ? json.data : [];
    }
  });

  const { data: purchaseEntries = [] } = useQuery({
    queryKey: ["purchase-entries"],
    queryFn: async () => {
      const res = await fetch("/api/purchase-entries");
      const json = await res.json();
      return json.success ? json.data : [];
    }
  });

  const { data: purchaseOrders = [] } = useQuery({
    queryKey: ["purchase-orders"],
    queryFn: async () => {
      const res = await fetch("/api/purchase-orders");
      const json = await res.json();
      return json.success ? json.data : [];
    }
  });

  const [form, setForm] = useState({
    billNo: "",
    billDate: new Date().toISOString().split("T")[0],
    supplierName: "",
    linkedPoNo: "",
    items: [] as any[],
  });

  const handleLoadPO = (poNo: string) => {
    const po = purchaseOrders.find((p: any) => p.poNo === poNo);
    if (!po) return;
    
    setForm(prev => ({
      ...prev,
      supplierName: po.supplierName,
      linkedPoNo: poNo,
      items: po.items.map((i: any) => ({
        id: Math.random().toString(),
        itemId: i.itemId,
        name: i.name,
        quantity: i.quantity,
        rate: i.rate,
        gstRate: i.gstRate || 18,
      }))
    }));
  };

  useEffect(() => {
    if (isOpen && !form.billNo) {
      setForm(prev => {
        let newNo = "";
        if (mode === "order") {
          const count = purchaseOrders.length;
          newNo = `PO-2026-${String(count + 1).padStart(4, "0")}`;
        } else {
          const count = purchaseEntries.filter((x: any) => x.type === mode).length;
          if (mode === "debit-note") {
            newNo = `DN-2026-${String(count + 1).padStart(4, "0")}`;
          } else {
            newNo = `BILL-2026-${String(count + 1).padStart(4, "0")}`;
          }
        }
        return { ...prev, billNo: newNo };
      });
    }
  }, [isOpen, mode, purchaseEntries, purchaseOrders, form.billNo]);

  const addLineItem = () => {
    setForm(prev => ({
      ...prev,
      items: [
        ...prev.items,
        {
          id: Math.random().toString(),
          itemId: "",
          name: "",
          quantity: 1,
          rate: 0,
          gstRate: 18,
        }
      ]
    }));
  };

  const removeLineItem = (id: string) => {
    setForm(prev => ({
      ...prev,
      items: prev.items.filter(item => item.id !== id)
    }));
  };

  const handleItemSelect = (rowId: string, itemId: string) => {
    const catalogItem = catalogItems.find((i: any) => i._id === itemId);
    if (!catalogItem) return;

    setForm(prev => ({
      ...prev,
      items: prev.items.map(item =>
        item.id === rowId
          ? {
              ...item,
              itemId: catalogItem._id,
              name: catalogItem.name,
              rate: catalogItem.purchasePrice || 0,
              gstRate: catalogItem.gstRate || 18,
            }
          : item
      )
    }));
  };

  const updateLineItem = (rowId: string, field: string, value: any) => {
    setForm(prev => ({
      ...prev,
      items: prev.items.map(item => (item.id === rowId ? { ...item, [field]: value } : item))
    }));
  };

  const totals = useMemo(() => {
    let subtotal = 0;
    let gst = 0;

    form.items.forEach(item => {
      const rowTotal = item.quantity * item.rate;
      const rowGst = rowTotal * (item.gstRate / 100);
      subtotal += rowTotal;
      gst += rowGst;
    });

    return {
      subtotal,
      gst,
      total: subtotal + gst,
    };
  }, [form.items]);

  const saveMutation = useMutation({
    mutationFn: async () => {
      const payload = {
        type: mode,
        billNo: form.billNo,
        supplierName: form.supplierName,
        billDate: form.billDate,
        linkedPoNo: form.linkedPoNo,
        items: form.items.map(i => ({
          itemId: i.itemId,
          name: i.name,
          quantity: Number(i.quantity),
          rate: Number(i.rate),
          gstRate: Number(i.gstRate),
        })),
        subtotal: totals.subtotal,
        gst: totals.gst,
        total: totals.total,
        total: totals.total,
        paid: mode === "entry" ? totals.total : 0, // Assume fully paid for bills for now, 0 for debit notes
        balance: mode === "debit-note" ? totals.total : 0,
        status: mode === "entry" ? "paid" : (mode === "order" ? "sent" : "pending")
      };

      if (mode === "order") {
        payload.poNo = payload.billNo;
        payload.date = payload.billDate;
        payload.expectedDate = new Date(Date.now() + 10 * 24 * 60 * 60 * 1000).toISOString().split("T")[0]; // default expected date
        payload.totalAmount = payload.total;
      }

      const endpoint = mode === "order" ? "/api/purchase-orders" : "/api/purchase-entries";

      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });
      const json = await res.json();
      if (!json.success) throw new Error(json.error || "Failed to save");
      return json.data;
    },
    onSuccess: () => {
      toast.success(mode === "order" ? "Purchase Order Sent" : mode === "entry" ? "Purchase Bill Recorded" : "Debit Note Issued");
      queryClient.invalidateQueries({ queryKey: ["purchase-entries"] });
      queryClient.invalidateQueries({ queryKey: ["debit-notes"] });
      queryClient.invalidateQueries({ queryKey: ["purchase-orders"] });
      queryClient.invalidateQueries({ queryKey: ["items"] }); // invalidate inventory
      onClose();
      // Reset form
      setForm({
        billNo: "",
        billDate: new Date().toISOString().split("T")[0],
        supplierName: "",
        linkedPoNo: "",
        items: [],
      });
    },
    onError: (error: any) => {
      toast.error(error.message || "An error occurred");
    }
  });

  const handleSave = () => {
    if (!form.supplierName) {
      toast.error("Please select a supplier");
      return;
    }
    if (form.items.length === 0) {
      toast.error("Please add at least one item");
      return;
    }
    const hasIncompleteItem = form.items.some(i => !i.itemId || i.quantity <= 0);
    if (hasIncompleteItem) {
      toast.error("Please select products and ensure quantity > 0");
      return;
    }
    saveMutation.mutate();
  };

  const isDebit = mode === "debit-note";
  const isOrder = mode === "order";

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-5xl p-0 overflow-hidden bg-slate-50 flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className={`p-6 text-white flex items-center justify-between shrink-0 ${isDebit ? 'bg-gradient-to-r from-red-950 via-red-900 to-red-950' : (isOrder ? 'bg-gradient-to-r from-amber-900 via-amber-800 to-amber-900' : 'bg-gradient-to-r from-[#1B2537] via-[#2C3E5A] to-[#1B2537]')}`}>
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-white/10 flex items-center justify-center backdrop-blur-md border border-white/20">
              {isDebit ? <FileMinus className="w-6 h-6 text-red-400" /> : (isOrder ? <ShoppingBag className="w-6 h-6 text-amber-400" /> : <ClipboardList className="w-6 h-6 text-[#76C043]" />)}
            </div>
            <div>
              <DialogTitle className="text-xl font-bold tracking-tight">
                {isDebit ? "Issue Debit Note" : (isOrder ? "Create Purchase Order" : "Record Supplier Purchase Bill")}
              </DialogTitle>
              <DialogDescription className={`text-xs mt-0.5 ${isDebit ? 'text-red-200' : (isOrder ? 'text-amber-200' : 'text-slate-300')}`}>
                {isDebit ? "Record purchase returns to reduce supplier payables & inventory" : (isOrder ? "Issue inventory restocking order to electronics manufacturer or distributor" : "Log incoming inventory and track accounts payable")}
              </DialogDescription>
            </div>
          </div>
        </div>

        {/* Scrollable Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Supplier Details */}
          <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm space-y-4">
            <h4 className="text-sm font-semibold text-slate-800 flex items-center gap-2 mb-2">
              1. Supplier Information
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-1.5">
                <Label className="text-xs text-slate-600">{isOrder ? "Order No." : "Bill/Note No."}</Label>
                <Input
                  value={form.billNo}
                  onChange={(e) => setForm({ ...form, billNo: e.target.value })}
                  className="bg-slate-50 font-mono text-sm"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs text-slate-600">Date</Label>
                <Input
                  type="date"
                  value={form.billDate}
                  onChange={(e) => setForm({ ...form, billDate: e.target.value })}
                  className="bg-slate-50 text-sm"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs text-slate-600">Supplier Name *</Label>
                <Select value={form.supplierName} onValueChange={(v) => setForm({ ...form, supplierName: v })}>
                  <SelectTrigger className="bg-slate-50 text-sm">
                    <SelectValue placeholder="Select supplier..." />
                  </SelectTrigger>
                  <SelectContent>
                    {suppliers.map((s: any) => (
                      <SelectItem key={s._id} value={s.name}>{s.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {mode === "entry" && (
              <div className="mt-4 pt-4 border-t border-slate-100 flex items-center gap-4">
                <Label className="text-xs text-slate-600 w-32 shrink-0">Link Purchase Order</Label>
                <Select value={form.linkedPoNo} onValueChange={handleLoadPO}>
                  <SelectTrigger className="bg-slate-50 text-sm max-w-sm">
                    <SelectValue placeholder="Select a pending PO to load items..." />
                  </SelectTrigger>
                  <SelectContent>
                    {purchaseOrders.filter((po: any) => po.status !== "received").map((po: any) => (
                      <SelectItem key={po.poNo} value={po.poNo}>
                        {po.poNo} - {po.supplierName} ({formatCurrency(po.totalAmount)})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>

          {/* Line Items */}
          <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <h4 className="text-sm font-semibold text-slate-800 flex items-center gap-2">
                2. Product Line Items
              </h4>
              <Button size="sm" variant="outline" onClick={addLineItem} className="h-8 border-dashed">
                <Plus className="w-4 h-4 mr-1" /> Add Product
              </Button>
            </div>

            <div className="border rounded-lg overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-slate-50 border-b">
                  <tr>
                    <th className="px-3 py-2 text-left font-medium text-slate-600 w-1/3">Product Item</th>
                    <th className="px-3 py-2 text-right font-medium text-slate-600 w-24">Qty</th>
                    <th className="px-3 py-2 text-right font-medium text-slate-600 w-32">Rate (₹)</th>
                    <th className="px-3 py-2 text-right font-medium text-slate-600 w-24">GST %</th>
                    <th className="px-3 py-2 text-right font-medium text-slate-600 w-32">Amount</th>
                    <th className="px-3 py-2 text-center font-medium text-slate-600 w-12"></th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {form.items.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="px-3 py-8 text-center text-muted-foreground text-sm">
                        No items added. Click "Add Product" to begin.
                      </td>
                    </tr>
                  ) : (
                    form.items.map((item, index) => {
                      const amount = item.quantity * item.rate;
                      return (
                        <tr key={item.id} className="group hover:bg-slate-50/50">
                          <td className="px-3 py-2 align-top">
                            <Select value={item.itemId} onValueChange={(val) => handleItemSelect(item.id, val)}>
                              <SelectTrigger className="h-8 text-xs border-transparent bg-transparent hover:bg-slate-100 p-1">
                                <SelectValue placeholder="Search catalog..." />
                              </SelectTrigger>
                              <SelectContent>
                                {catalogItems.map((c: any) => (
                                  <SelectItem key={c._id} value={c._id}>{c.name}</SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </td>
                          <td className="px-3 py-2 align-top">
                            <Input
                              type="number"
                              min={1}
                              value={item.quantity}
                              onKeyDown={(e) => ["-", "+", "e", "E"].includes(e.key) && e.preventDefault()}
                              onChange={(e) => updateLineItem(item.id, "quantity", Math.max(1, Number(e.target.value)))}
                              className="h-8 text-xs text-right"
                            />
                          </td>
                          <td className="px-3 py-2 align-top">
                            <Input
                              type="number"
                              min={0}
                              value={item.rate}
                              onKeyDown={(e) => ["-", "+", "e", "E"].includes(e.key) && e.preventDefault()}
                              onChange={(e) => updateLineItem(item.id, "rate", Math.max(0, Number(e.target.value)))}
                              className="h-8 text-xs text-right"
                            />
                          </td>
                          <td className="px-3 py-2 align-top">
                            <Select value={String(item.gstRate)} onValueChange={(val) => updateLineItem(item.id, "gstRate", Number(val))}>
                              <SelectTrigger className="h-8 text-xs text-right">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                {[0, 5, 12, 18, 28].map((rate) => (
                                  <SelectItem key={rate} value={String(rate)}>{rate}%</SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </td>
                          <td className="px-3 py-2 align-top text-right font-medium pt-3.5">
                            {formatCurrency(amount)}
                          </td>
                          <td className="px-3 py-2 align-top text-center pt-2.5">
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-6 w-6 text-slate-400 hover:text-red-600 hover:bg-red-50"
                              onClick={() => removeLineItem(item.id)}
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Footer & Totals */}
        <div className="bg-slate-100 p-6 rounded-b-2xl border-t border-slate-200 shrink-0">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
            <div className="space-y-1">
              <div className="flex items-center gap-4 text-sm text-slate-600">
                <span>Subtotal: {formatCurrency(totals.subtotal)}</span>
                <span>GST: {formatCurrency(totals.gst)}</span>
              </div>
              <div className="text-xl font-bold text-slate-900">
                Total {isDebit ? "Credit" : "Amount"}: {formatCurrency(totals.total)}
              </div>
            </div>
            <div className="flex items-center gap-3 w-full md:w-auto">
              <Button variant="outline" onClick={onClose} className="w-full md:w-auto px-6">
                Cancel
              </Button>
              <Button 
                onClick={handleSave} 
                disabled={saveMutation.isPending}
                className={`w-full md:w-auto px-8 font-bold shadow-lg ${isDebit ? 'bg-red-600 hover:bg-red-700 shadow-red-600/20' : (isOrder ? 'bg-amber-600 hover:bg-amber-700 shadow-amber-600/20' : 'bg-[#3F63AD] hover:bg-[#2E4F95] shadow-[#3F63AD]/20')}`}
              >
                {saveMutation.isPending ? "Saving..." : (isDebit ? "Save Debit Note" : (isOrder ? "Send Purchase Order" : "Save Purchase Entry"))}
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
