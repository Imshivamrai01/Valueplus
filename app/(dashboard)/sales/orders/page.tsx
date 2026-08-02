"use client";

import { PageShell } from "@/components/shared/page-shell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Plus, Search, ShoppingCart, CheckCircle, Clock, Truck, Printer } from "lucide-react";
import { useState, useMemo } from "react";
import { toast } from "sonner";
import { formatCurrency, formatDate } from "@/lib/utils";

interface OrderItem {
  id: string;
  orderNo: string;
  customerName: string;
  date: string;
  deliveryDate: string;
  itemsCount: number;
  totalAmount: number;
  paymentStatus: "Paid" | "Pending" | "Partial";
  orderStatus: "confirmed" | "processing" | "delivered" | "cancelled";
}

const INITIAL_ORDERS: OrderItem[] = [
  { id: "1", orderNo: "SO-2026-0301", customerName: "Sharma Enterprises Pvt Ltd", date: "2026-08-02", deliveryDate: "2026-08-05", itemsCount: 4, totalAmount: 245000, paymentStatus: "Paid", orderStatus: "processing" },
  { id: "2", orderNo: "SO-2026-0300", customerName: "Patel Industries", date: "2026-08-01", deliveryDate: "2026-08-04", itemsCount: 2, totalAmount: 129999, paymentStatus: "Partial", orderStatus: "confirmed" },
  { id: "3", orderNo: "SO-2026-0299", customerName: "Kapoor Tech Solutions", date: "2026-07-31", deliveryDate: "2026-08-02", itemsCount: 6, totalAmount: 384000, paymentStatus: "Paid", orderStatus: "delivered" },
  { id: "4", orderNo: "SO-2026-0298", customerName: "Gupta Electronics Ltd", date: "2026-07-30", deliveryDate: "2026-08-03", itemsCount: 1, totalAmount: 64990, paymentStatus: "Pending", orderStatus: "processing" },
  { id: "5", orderNo: "SO-2026-0297", customerName: "Mehta Trading Co.", date: "2026-07-28", deliveryDate: "2026-07-31", itemsCount: 8, totalAmount: 512000, paymentStatus: "Paid", orderStatus: "delivered" },
];

export default function SalesOrdersPage() {
  const [orders, setOrders] = useState<OrderItem[]>(INITIAL_ORDERS);
  const [search, setSearch] = useState("");
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [formData, setFormData] = useState({
    customerName: "",
    deliveryDate: "",
    itemsCount: "1",
    totalAmount: "",
    paymentStatus: "Pending",
  });

  const filtered = useMemo(() => {
    return orders.filter(
      (o) =>
        !search ||
        o.orderNo.toLowerCase().includes(search.toLowerCase()) ||
        o.customerName.toLowerCase().includes(search.toLowerCase())
    );
  }, [orders, search]);

  const handleSave = () => {
    if (!formData.customerName || !formData.totalAmount) {
      toast.error("Please fill Customer Name and Order Amount");
      return;
    }

    const newOrder: OrderItem = {
      id: String(Date.now()),
      orderNo: `SO-2026-${String(orders.length + 302).padStart(4, "0")}`,
      customerName: formData.customerName,
      date: new Date().toISOString().split("T")[0],
      deliveryDate: formData.deliveryDate || "2026-08-10",
      itemsCount: Number(formData.itemsCount) || 1,
      totalAmount: Number(formData.totalAmount) || 0,
      paymentStatus: formData.paymentStatus as any,
      orderStatus: "confirmed",
    };

    setOrders([newOrder, ...orders]);
    toast.success(`Sales Order ${newOrder.orderNo} created!`);
    setIsFormOpen(false);
  };

  return (
    <PageShell
      title="Sales Orders"
      subtitle="Track customer sales orders and delivery schedules"
      breadcrumbs={[{ label: "Sales" }, { label: "Sales Orders" }]}
      actions={
        <Button size="sm" onClick={() => setIsFormOpen(true)}>
          <Plus className="w-4 h-4 mr-1.5" /> New Sales Order
        </Button>
      }
    >
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[{ label: "Total Orders", value: orders.length }, { label: "Confirmed", value: orders.filter(o => o.orderStatus === "confirmed").value || orders.length }, { label: "Processing", value: orders.filter(o => o.orderStatus === "processing").length }, { label: "Total Value", value: formatCurrency(orders.reduce((a, b) => a + b.totalAmount, 0)) }].map((s) => (
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
            <Input placeholder="Search orders, customers..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 border-b">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase">Order #</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase">Customer</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase">Order Date</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase">Delivery Date</th>
                <th className="px-4 py-3 text-right text-xs font-semibold text-muted-foreground uppercase">Total Amount</th>
                <th className="px-4 py-3 text-center text-xs font-semibold text-muted-foreground uppercase">Payment</th>
                <th className="px-4 py-3 text-center text-xs font-semibold text-muted-foreground uppercase">Order Status</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {filtered.map((o) => (
                <tr key={o.id} className="hover:bg-slate-50 transition-colors">
                  <td className="px-4 py-3 font-mono font-bold text-[#3F63AD]">{o.orderNo}</td>
                  <td className="px-4 py-3 font-medium text-foreground">{o.customerName}</td>
                  <td className="px-4 py-3 text-muted-foreground text-xs">{formatDate(o.date)}</td>
                  <td className="px-4 py-3 text-muted-foreground text-xs">{formatDate(o.deliveryDate)}</td>
                  <td className="px-4 py-3 text-right font-semibold">{formatCurrency(o.totalAmount)}</td>
                  <td className="px-4 py-3 text-center">
                    <Badge variant={o.paymentStatus === "Paid" ? "success" : o.paymentStatus === "Partial" ? "info" : "warning"}>{o.paymentStatus}</Badge>
                  </td>
                  <td className="px-4 py-3 text-center">
                    <Badge variant={o.orderStatus === "delivered" ? "success" : "info"}>{o.orderStatus}</Badge>
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
                <ShoppingCart className="w-6 h-6 text-[#76C043]" />
              </div>
              <div>
                <h3 className="text-xl font-bold tracking-tight">Record Sales Order</h3>
                <p className="text-xs text-slate-300 mt-0.5">
                  Book confirmed customer order with delivery schedules and payment terms
                </p>
              </div>
            </div>
          </div>

          <div className="p-6 space-y-4 bg-slate-50/50">
            <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1.5 md:col-span-2">
                  <Label className="text-xs font-semibold text-slate-700">Customer / Business Name *</Label>
                  <Input
                    placeholder="e.g. Sharma Enterprises Pvt Ltd"
                    value={formData.customerName}
                    onChange={(e) => setFormData({ ...formData, customerName: e.target.value })}
                    className="bg-slate-50 border-slate-300"
                  />
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold text-slate-700">Expected Delivery Date</Label>
                  <Input
                    type="date"
                    value={formData.deliveryDate}
                    onChange={(e) => setFormData({ ...formData, deliveryDate: e.target.value })}
                    className="bg-slate-50 border-slate-300"
                  />
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold text-slate-700">Total Order Value (₹) *</Label>
                  <Input
                    type="number"
                    placeholder="150000"
                    value={formData.totalAmount}
                    onChange={(e) => setFormData({ ...formData, totalAmount: e.target.value })}
                    className="bg-slate-50 border-slate-300 font-semibold"
                  />
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold text-slate-700">Number of Items</Label>
                  <Input
                    type="number"
                    value={formData.itemsCount}
                    onChange={(e) => setFormData({ ...formData, itemsCount: e.target.value })}
                    className="bg-slate-50 border-slate-300"
                  />
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold text-slate-700">Payment Status</Label>
                  <Select value={formData.paymentStatus} onValueChange={(v) => setFormData({ ...formData, paymentStatus: v })}>
                    <SelectTrigger className="bg-slate-50 border-slate-300"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Paid">Paid</SelectItem>
                      <SelectItem value="Pending">Pending</SelectItem>
                      <SelectItem value="Partial">Partial</SelectItem>
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
              Create Sales Order
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </PageShell>
  );
}

