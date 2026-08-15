"use client";

import { PageShell } from "@/components/shared/page-shell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Plus, Search, ShoppingCart, CheckCircle, Clock, Truck, Printer, Eye, User, FileText, CalendarDays, WalletCards } from "lucide-react";
import { useState, useMemo, useEffect } from "react";
import { toast } from "sonner";
import { formatCurrency, formatDate } from "@/lib/utils";
import { useQuery } from "@tanstack/react-query";
import { InvoiceCreationModal } from "@/components/InvoiceCreationModal";
import { DateRangeFilter, resolveDateRange, isDateInRange } from "@/components/shared/date-range-filter";
import { TableShimmer } from "@/components/shared/shimmer-skeleton";

export default function SalesOrdersPage() {
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [dateFilter, setDateFilter] = useState("This Month");
  const [dateRange, setDateRange] = useState(() => resolveDateRange("This Month"));
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState<any | null>(null);

  const fetchOrders = async () => {
    try {
      const res = await fetch("/api/orders");
      const json = await res.json();
      if (json.success) {
        setOrders(json.data);
      }
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOrders();
  }, []);

  const { data: customers = [] } = useQuery({
    queryKey: ["customers"],
    queryFn: async () => {
      const res = await fetch("/api/customers");
      const json = await res.json();
      return json.success ? json.data : [];
    }
  });

  const filtered = useMemo(() => {
    return orders.filter((o) => {
      const matchesSearch = !search ||
        o.invoiceNumber?.toLowerCase().includes(search.toLowerCase()) ||
        o.customerName?.toLowerCase().includes(search.toLowerCase());
      const matchesDate = isDateInRange(o.date || o.createdAt, dateRange.start, dateRange.end);
      return matchesSearch && matchesDate;
    });
  }, [orders, search, dateRange]);


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
        {[{ label: "Total Orders", value: orders.length }, { label: "Confirmed", value: orders.filter(o => o.status === "confirmed" || o.orderStatus === "confirmed").length || orders.length }, { label: "Processing", value: orders.filter(o => o.status === "processing" || o.orderStatus === "processing").length }, { label: "Total Value", value: formatCurrency(orders.reduce((a, b) => a + (b.total || b.totalAmount || 0), 0)) }].map((s) => (
          <div key={s.label} className="metric-card">
            <p className="text-2xl font-bold">{s.value}</p>
            <p className="text-xs text-muted-foreground mt-1">{s.label}</p>
          </div>
        ))}
      </div>

      <div className="data-table-container">
        <div className="flex flex-wrap items-center justify-between gap-3 p-4 border-b">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input placeholder="Search orders, customers..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
          </div>
          <DateRangeFilter 
            value={dateFilter} 
            onChange={(val, s, e) => {
              setDateFilter(val);
              if (s && e) setDateRange({ start: s, end: e });
            }}
            className="w-40"
            showIcon={true}
          />
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 border-b">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase">Order #</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase">Customer</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase">Items</th>
                <th className="px-4 py-3 text-right text-xs font-semibold text-muted-foreground uppercase">Order Value</th>
                <th className="px-4 py-3 text-right text-xs font-semibold text-muted-foreground uppercase">Adv. Paid</th>
                <th className="px-4 py-3 text-right text-xs font-semibold text-muted-foreground uppercase">Balance</th>
                <th className="px-4 py-3 text-center text-xs font-semibold text-muted-foreground uppercase">Status</th>
                <th className="px-4 py-3 text-center text-xs font-semibold text-muted-foreground uppercase">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {loading ? (
                <tr><td colSpan={8} className="p-0"><TableShimmer rows={6} cols={8} /></td></tr>
              ) : filtered.length === 0 ? (
                <tr><td colSpan={8} className="text-center p-8 text-muted-foreground">No sales orders found</td></tr>
              ) : filtered.map((o) => (
                <tr key={o._id || o.id} className="hover:bg-slate-50 transition-colors">
                  <td className="px-4 py-3 font-mono font-bold text-[#3F63AD]">
                    {o.invoiceNumber || o.orderNo}
                    <div className="text-[10px] text-muted-foreground font-sans font-normal mt-0.5">{formatDate(o.date)}</div>
                  </td>
                  <td className="px-4 py-3 font-medium text-foreground">
                    {o.customerName}
                  </td>
                  <td className="px-4 py-3 text-xs text-muted-foreground max-w-[200px] truncate">
                    {o.items?.length > 0 
                      ? <span title={o.items.map((i: any) => i.name || i.itemName).join(", ")}>
                          {o.items.length} Items ({o.items.map((i: any) => i.name || i.itemName).join(", ")})
                        </span>
                      : o.itemsCount + " Items"}
                  </td>
                  <td className="px-4 py-3 text-right font-bold text-slate-800">{formatCurrency(o.total || o.totalAmount)}</td>
                  <td className="px-4 py-3 text-right font-semibold text-emerald-600">{formatCurrency(o.paidAmount || 0)}</td>
                  <td className="px-4 py-3 text-right font-semibold text-red-600">{formatCurrency(o.balanceAmount || o.total || o.totalAmount)}</td>
                  <td className="px-4 py-3 text-center">
                    <Badge variant={o.balanceAmount === 0 ? "success" : o.paidAmount > 0 ? "info" : "warning"}>{o.balanceAmount === 0 ? "Paid" : o.paidAmount > 0 ? "Partial" : "Pending"}</Badge>
                  </td>
                  <td className="px-4 py-3 text-center">
                    <Button variant="ghost" size="icon" className="h-8 w-8 text-[#3F63AD] hover:bg-blue-50" onClick={() => setSelectedOrder(o)}>
                      <Eye className="w-4 h-4" />
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <InvoiceCreationModal 
        mode="sales-order" 
        isOpen={isFormOpen} 
        onClose={() => setIsFormOpen(false)} 
        onSuccess={() => { setIsFormOpen(false); fetchOrders(); }} 
      />

      {selectedOrder && (
        <Dialog open={!!selectedOrder} onOpenChange={() => setSelectedOrder(null)}>
          <DialogContent className="max-w-4xl p-0 rounded-2xl border-none shadow-2xl overflow-hidden bg-slate-50/50">
            {/* Header */}
            <div className="bg-gradient-to-r from-[#1B2537] via-[#2C3E5A] to-[#1B2537] text-white p-6 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-xl bg-white/10 flex items-center justify-center backdrop-blur-md border border-white/20">
                  <ShoppingCart className="w-6 h-6 text-[#76C043]" />
                </div>
                <div>
                  <h3 className="text-xl font-bold tracking-tight">Sales Order: {selectedOrder.invoiceNumber || selectedOrder.orderNo}</h3>
                  <p className="text-xs text-slate-300 mt-0.5 flex items-center gap-2">
                    <CalendarDays className="w-3.5 h-3.5" /> Booked on: {formatDate(selectedOrder.date)} 
                    <span className="opacity-50">|</span> 
                    Expected Delivery: {formatDate(selectedOrder.dueDate || selectedOrder.deliveryDate)}
                  </p>
                </div>
              </div>
              <Badge variant="outline" className="bg-white/10 text-white border-white/30 text-sm py-1 px-3">
                {selectedOrder.status ? selectedOrder.status.toUpperCase() : "CONFIRMED"}
              </Badge>
            </div>

            <div className="p-6 space-y-6 overflow-y-auto max-h-[70vh]">
              {/* Customer Details */}
              <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex items-start gap-4">
                <div className="w-10 h-10 rounded-full bg-blue-100 flex flex-none items-center justify-center">
                  <User className="w-5 h-5 text-[#3F63AD]" />
                </div>
                <div className="flex-1">
                  <h4 className="font-bold text-slate-900">{selectedOrder.customerName || selectedOrder.customer}</h4>
                  <div className="text-sm text-slate-500 mt-1 grid grid-cols-2 gap-2">
                    <p><strong>Phone:</strong> {selectedOrder.customerPhone || "N/A"}</p>
                    <p><strong>Email:</strong> {selectedOrder.customerEmail || "N/A"}</p>
                    <p className="col-span-2"><strong>Billing Address:</strong> {selectedOrder.customerAddress || "N/A"}, {selectedOrder.customerCity || ""}</p>
                  </div>
                </div>
              </div>

              {/* Line Items */}
              <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                <div className="bg-slate-100 p-3 border-b flex items-center gap-2">
                  <FileText className="w-4 h-4 text-slate-500" />
                  <span className="font-bold text-slate-700 text-sm uppercase">Order Items ({selectedOrder.items?.length || selectedOrder.itemsCount})</span>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-slate-50 border-b">
                      <tr>
                        <th className="px-4 py-2 text-left font-semibold text-slate-500">Item Details</th>
                        <th className="px-4 py-2 text-center font-semibold text-slate-500">Qty</th>
                        <th className="px-4 py-2 text-right font-semibold text-slate-500">Rate (₹)</th>
                        <th className="px-4 py-2 text-right font-semibold text-slate-500">Total (₹)</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y">
                      {selectedOrder.items?.map((item: any, idx: number) => (
                        <tr key={idx} className="hover:bg-slate-50">
                          <td className="px-4 py-3">
                            <p className="font-bold text-slate-900">{item.name || item.itemName}</p>
                            {item.description && <p className="text-xs text-slate-500 mt-0.5">{item.description}</p>}
                          </td>
                          <td className="px-4 py-3 text-center font-semibold">{item.quantity || item.qty || 1}</td>
                          <td className="px-4 py-3 text-right text-slate-600">{formatCurrency(item.rate || 0)}</td>
                          <td className="px-4 py-3 text-right font-bold text-slate-800">{formatCurrency((item.rate || 0) * (item.quantity || item.qty || 1))}</td>
                        </tr>
                      ))}
                      {(!selectedOrder.items || selectedOrder.items.length === 0) && (
                        <tr>
                          <td colSpan={4} className="px-4 py-8 text-center text-slate-500 font-medium italic">
                            Detailed item list not available for this legacy order.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Payment Summary */}
              <div className="bg-gradient-to-br from-emerald-50 to-teal-50/30 p-5 rounded-xl border border-emerald-100 shadow-sm flex flex-col md:flex-row items-center justify-between gap-6">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-full bg-emerald-100 flex items-center justify-center">
                    <WalletCards className="w-6 h-6 text-emerald-600" />
                  </div>
                  <div>
                    <p className="text-sm font-bold text-emerald-900">Payment Summary</p>
                    <p className="text-xs text-emerald-700/80 mt-0.5">Advance tracking & balance details</p>
                  </div>
                </div>
                
                <div className="flex items-center gap-6 text-right">
                  <div>
                    <p className="text-[11px] font-bold text-slate-500 uppercase">Order Value</p>
                    <p className="font-bold text-slate-900">{formatCurrency(selectedOrder.total || selectedOrder.totalAmount || 0)}</p>
                  </div>
                  <div className="w-px h-8 bg-slate-200"></div>
                  <div>
                    <p className="text-[11px] font-bold text-emerald-600 uppercase">Advance Paid</p>
                    <p className="font-black text-emerald-700">{formatCurrency(selectedOrder.paidAmount || 0)}</p>
                  </div>
                  <div className="w-px h-8 bg-slate-200"></div>
                  <div>
                    <p className="text-[11px] font-bold text-red-500 uppercase">Balance Due</p>
                    <p className="font-black text-red-600 text-lg">{formatCurrency(selectedOrder.balanceAmount || selectedOrder.total || selectedOrder.totalAmount || 0)}</p>
                  </div>
                </div>
              </div>
            </div>

            <DialogFooter className="bg-slate-100 px-6 py-4 rounded-b-2xl border-t border-slate-200 flex items-center justify-between">
              <div className="text-xs text-slate-500 font-medium flex items-center gap-2">
                Sales Exec: <span className="font-bold text-slate-700">{selectedOrder.salesExecutive || selectedOrder.salesPerson || (selectedOrder.notes?.includes("Estimate generated by ") ? selectedOrder.notes.split("Estimate generated by ")[1] : "N/A")}</span>
              </div>
              <Button onClick={() => setSelectedOrder(null)} className="bg-slate-800 hover:bg-slate-900 text-white px-8 font-bold">
                Close
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </PageShell>
  );
}

