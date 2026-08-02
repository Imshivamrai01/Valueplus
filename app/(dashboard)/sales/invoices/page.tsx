"use client";

import { useState, useMemo } from "react";
import { 
  Plus, Search, Download, Eye, Edit, Trash2, MoreHorizontal, Receipt, CheckCircle, 
  Clock, AlertTriangle, XCircle, Printer, ShoppingCart, User, Building, CreditCard, 
  Sparkles, CheckCircle2, FileText, Calendar, MapPin, Calculator, ShieldCheck
} from "lucide-react";
import { toast } from "sonner";
import { PageShell } from "@/components/shared/page-shell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { formatCurrency, formatDate, downloadCSV } from "@/lib/utils";
import ValueplusInvoice from "@/app/invoice/page";

// ─── CATALOG PRESETS FOR QUICK BILLING ──────────────────────
const CATALOG_ITEMS = [
  { name: "iPhone 15 Pro Max 256GB", hsn: "85171300", rate: 144900, gstRate: 18, unit: "PCS" },
  { name: "Samsung Galaxy S24 Ultra 512GB", hsn: "85171300", rate: 129999, gstRate: 18, unit: "PCS" },
  { name: "MacBook Air M3 16GB/512GB", hsn: "84713010", rate: 124900, gstRate: 18, unit: "PCS" },
  { name: "Sony Bravia 55 inch 4K TV", hsn: "85285900", rate: 64990, gstRate: 28, unit: "PCS" },
  { name: "AirPods Pro (2nd Gen) USB-C", hsn: "85183000", rate: 22900, gstRate: 18, unit: "PR" },
  { name: "boAt Airdopes 141 TWS Earbuds", hsn: "85183000", rate: 1299, gstRate: 18, unit: "PR" },
  { name: "OnePlus 12 5G 16GB/512GB", hsn: "85171300", rate: 64999, gstRate: 18, unit: "PCS" },
  { name: "LG 1.5 Ton 5 Star Split AC", hsn: "84151010", rate: 44490, gstRate: 28, unit: "UNT" },
  { name: "SanDisk 1TB Portable SSD", hsn: "85235100", rate: 10999, gstRate: 18, unit: "PCS" },
];

const CUSTOMERS = [
  { name: "Sharma Enterprises Pvt Ltd", phone: "9876543210", email: "billing@sharma.in", gst: "09AAFCV1234M1ZQ", city: "Prayagraj", state: "Uttar Pradesh (09)" },
  { name: "Patel Industries", phone: "9812345678", email: "accounts@patel.com", gst: "27AAACV9876K1Z5", city: "Mumbai", state: "Maharashtra (27)" },
  { name: "Kapoor Tech Solutions", phone: "9801234567", email: "info@kapoortech.in", gst: "07AAACK1122J1Z9", city: "New Delhi", state: "Delhi (07)" },
  { name: "Gupta Electronics Ltd", phone: "9890123456", email: "contact@gupta.co.in", gst: "09AAFCG5544B1Z2", city: "Noida", state: "Uttar Pradesh (09)" },
  { name: "Mehta Trading Co.", phone: "9855512345", email: "mehta@trading.in", gst: "24AAACM7788P1Z8", city: "Ahmedabad", state: "Gujarat (24)" },
];

const STATUSES = ["paid", "pending", "overdue", "partial", "cancelled", "draft"] as const;

function generateInvoices() {
  const invoices = [];
  let date = new Date("2025-04-01");
  for (let i = 1; i <= 25; i++) {
    const customerObj = CUSTOMERS[i % CUSTOMERS.length];
    const total = Math.round((15000 + Math.random() * 250000) / 100) * 100;
    const status = i < 18 ? "paid" : i < 22 ? "pending" : "partial";
    const paid = status === "paid" ? total : status === "partial" ? Math.round(total * 0.5) : 0;
    date = new Date(date.getTime() + Math.random() * 3 * 86400000);
    invoices.push({
      id: `INV-2026-${String(i + 120).padStart(4, "0")}`,
      customer: customerObj.name,
      phone: customerObj.phone,
      gstin: customerObj.gst,
      date: date.toISOString().split("T")[0],
      dueDate: new Date(date.getTime() + 30 * 86400000).toISOString().split("T")[0],
      subtotal: Math.round(total / 1.18),
      gst: Math.round(total - total / 1.18),
      total,
      paid,
      balance: total - paid,
      status,
    });
  }
  return invoices;
}

const ALL_INVOICES = generateInvoices();

const STATUS_CONFIG = {
  paid: { variant: "success" as const, icon: CheckCircle, label: "Paid" },
  pending: { variant: "warning" as const, icon: Clock, label: "Pending" },
  overdue: { variant: "destructive" as const, icon: AlertTriangle, label: "Overdue" },
  partial: { variant: "info" as const, icon: Clock, label: "Partial" },
  cancelled: { variant: "secondary" as const, icon: XCircle, label: "Cancelled" },
  draft: { variant: "secondary" as const, icon: Receipt, label: "Draft" },
};

export default function InvoicesPage() {
  const [invoices, setInvoices] = useState(ALL_INVOICES);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [page, setPage] = useState(1);
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const [isBillingFormOpen, setIsBillingFormOpen] = useState(false);

  // Billing Counter Form State
  const [billingForm, setBillingForm] = useState({
    invoiceNo: `INV-2026-${String(invoices.length + 121).padStart(4, "0")}`,
    invoiceDate: new Date().toISOString().split("T")[0],
    dueDate: new Date(Date.now() + 15 * 86400000).toISOString().split("T")[0],
    customerName: "Sharma Enterprises Pvt Ltd",
    customerPhone: "+91 98765 43210",
    customerEmail: "billing@sharma.in",
    customerGstin: "09AAFCV1234M1ZQ",
    customerAddress: "18, Nehru Market, Civil Lines, Prayagraj, UP – 211001",
    placeOfSupply: "Uttar Pradesh (09)",
    paymentMode: "UPI",
    paymentStatus: "Paid",
    lineItems: [
      { id: "1", name: "iPhone 15 Pro Max 256GB", hsn: "85171300", serialImei: "IMEI 359182049182341", qty: 1, unit: "PCS", rate: 144900, discount: 2000, gstRate: 18 },
      { id: "2", name: "AirPods Pro (2nd Gen) USB-C", hsn: "85183000", serialImei: "SN AAP-9018241", qty: 1, unit: "PR", rate: 22900, discount: 500, gstRate: 18 },
    ],
  });

  const PER_PAGE = 12;

  const filtered = useMemo(() =>
    invoices.filter((inv) =>
      (!search || inv.id.toLowerCase().includes(search.toLowerCase()) || inv.customer.toLowerCase().includes(search.toLowerCase())) &&
      (statusFilter === "all" || inv.status === statusFilter)
    ), [invoices, search, statusFilter]);

  const paginated = filtered.slice((page - 1) * PER_PAGE, page * PER_PAGE);
  const totalPages = Math.ceil(filtered.length / PER_PAGE);

  const stats = useMemo(() => ({
    total: invoices.reduce((a, i) => a + i.total, 0),
    paid: invoices.filter(i => i.status === "paid").reduce((a, i) => a + i.total, 0),
    pending: invoices.filter(i => ["pending", "overdue"].includes(i.status)).reduce((a, i) => a + i.balance, 0),
    overdue: invoices.filter(i => i.status === "overdue").length,
  }), [invoices]);

  // Billing Calculations
  const billCalculations = useMemo(() => {
    let subtotal = 0;
    let totalTaxable = 0;
    let totalGst = 0;

    billingForm.lineItems.forEach((item) => {
      const lineTaxable = (item.rate - item.discount) * item.qty;
      const lineGst = lineTaxable * (item.gstRate / 100);
      subtotal += item.rate * item.qty;
      totalTaxable += lineTaxable;
      totalGst += lineGst;
    });

    const isIntraState = billingForm.placeOfSupply.includes("09") || billingForm.placeOfSupply.toLowerCase().includes("uttar pradesh");
    const cgst = isIntraState ? totalGst / 2 : 0;
    const sgst = isIntraState ? totalGst / 2 : 0;
    const igst = isIntraState ? 0 : totalGst;
    const grandTotal = Math.round(totalTaxable + totalGst);

    return { subtotal, totalTaxable, totalGst, cgst, sgst, igst, grandTotal };
  }, [billingForm]);

  const openInvoicePreview = () => {
    setIsPreviewOpen(true);
  };

  const handleSelectCustomer = (custName: string) => {
    const found = CUSTOMERS.find((c) => c.name === custName);
    if (found) {
      setBillingForm((prev) => ({
        ...prev,
        customerName: found.name,
        customerPhone: found.phone,
        customerEmail: found.email,
        customerGstin: found.gst,
        placeOfSupply: found.state,
      }));
    } else {
      setBillingForm((prev) => ({ ...prev, customerName: custName }));
    }
  };

  const addLineItem = () => {
    const defaultItem = CATALOG_ITEMS[0];
    setBillingForm((prev) => ({
      ...prev,
      lineItems: [
        ...prev.lineItems,
        {
          id: String(Date.now()),
          name: defaultItem.name,
          hsn: defaultItem.hsn,
          serialImei: "",
          qty: 1,
          unit: defaultItem.unit,
          rate: defaultItem.rate,
          discount: 0,
          gstRate: defaultItem.gstRate,
        },
      ],
    }));
  };

  const handleLineItemChange = (index: number, field: string, value: any) => {
    setBillingForm((prev) => {
      const updated = [...prev.lineItems];
      if (field === "name") {
        const found = CATALOG_ITEMS.find((c) => c.name === value);
        if (found) {
          updated[index] = {
            ...updated[index],
            name: found.name,
            hsn: found.hsn,
            rate: found.rate,
            gstRate: found.gstRate,
            unit: found.unit,
          };
        } else {
          updated[index] = { ...updated[index], name: value };
        }
      } else {
        updated[index] = { ...updated[index], [field]: value };
      }
      return { ...prev, lineItems: updated };
    });
  };

  const removeLineItem = (index: number) => {
    setBillingForm((prev) => ({
      ...prev,
      lineItems: prev.lineItems.filter((_, i) => i !== index),
    }));
  };

  const handleGenerateInvoice = () => {
    if (!billingForm.customerName || billingForm.lineItems.length === 0) {
      toast.error("Please specify Customer Name and at least 1 Line Item");
      return;
    }

    const grandTotal = billCalculations.grandTotal;
    const isPaid = billingForm.paymentStatus === "Paid";
    const newInv = {
      id: billingForm.invoiceNo,
      customer: billingForm.customerName,
      phone: billingForm.customerPhone,
      gstin: billingForm.customerGstin,
      date: billingForm.invoiceDate,
      dueDate: billingForm.dueDate,
      subtotal: billCalculations.totalTaxable,
      gst: billCalculations.totalGst,
      total: grandTotal,
      paid: isPaid ? grandTotal : 0,
      balance: isPaid ? 0 : grandTotal,
      status: (isPaid ? "paid" : "pending") as any,
    };

    setInvoices([newInv, ...invoices]);
    toast.success(`GST Tax Invoice ${newInv.id} Generated Successfully!`);
    setIsBillingFormOpen(false);
    setIsPreviewOpen(true); // Open the printable invoice sheet
  };

  return (
    <PageShell
      title="Invoices & GST Billing"
      subtitle={`${invoices.length} GST Tax Invoices generated`}
      breadcrumbs={[{ label: "Sales", href: "/sales/invoices" }, { label: "Invoices" }]}
      actions={
        <>
          <Button variant="outline" size="sm" onClick={() => downloadCSV(invoices.map(i => ({ ...i })), "invoices.csv")}>
            <Download className="w-4 h-4 mr-1.5" /> Export
          </Button>
          <Button size="sm" onClick={() => setIsBillingFormOpen(true)} className="bg-[#3F63AD] hover:bg-[#2E4F95] text-white font-bold shadow-md">
            <Plus className="w-4 h-4 mr-1.5" /> New Invoice Billing
          </Button>
        </>
      }
    >
      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="metric-card">
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Total Invoiced</p>
          <p className="text-2xl font-bold mt-1.5">{formatCurrency(stats.total)}</p>
          <p className="text-xs text-muted-foreground mt-2">{invoices.length} invoices</p>
        </div>
        <div className="metric-card">
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Collected Amount</p>
          <p className="text-2xl font-bold mt-1.5 text-emerald-600">{formatCurrency(stats.paid)}</p>
          <p className="text-xs text-muted-foreground mt-2">{invoices.filter(i => i.status === "paid").length} paid</p>
        </div>
        <div className="metric-card">
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Pending Receivables</p>
          <p className="text-2xl font-bold mt-1.5 text-amber-600">{formatCurrency(stats.pending)}</p>
          <p className="text-xs text-muted-foreground mt-2">Pending collection</p>
        </div>
        <div className="metric-card">
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Overdue Accounts</p>
          <p className="text-2xl font-bold mt-1.5 text-red-600">{stats.overdue}</p>
          <p className="text-xs text-muted-foreground mt-2">Needs attention</p>
        </div>
      </div>

      {/* Table */}
      <div className="data-table-container">
        <div className="flex flex-wrap items-center gap-3 p-4 border-b">
          <div className="relative flex-1 min-w-48">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input placeholder="Search invoice #, customer..." value={search} onChange={(e) => { setSearch(e.target.value); setPage(1); }} className="pl-9" />
          </div>
          <Select value={statusFilter} onValueChange={(v) => { setStatusFilter(v); setPage(1); }}>
            <SelectTrigger className="w-36"><SelectValue placeholder="Status" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              {Object.entries(STATUS_CONFIG).map(([k, v]) => <SelectItem key={k} value={k}>{v.label}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 border-b">
              <tr>
                {["Invoice #", "Customer Name", "Invoice Date", "Due Date", "Taxable", "GST", "Total Amount", "Paid", "Balance", "Status", ""].map((h) => (
                  <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wide whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y">
              {paginated.length === 0 ? (
                <tr><td colSpan={11} className="py-16 text-center text-muted-foreground">No invoices found</td></tr>
              ) : paginated.map((inv) => {
                const statusConf = STATUS_CONFIG[inv.status];
                return (
                  <tr key={inv.id} className="hover:bg-slate-50/70 transition-colors">
                    <td className="px-4 py-3 font-mono font-bold text-[#3F63AD] cursor-pointer" onClick={openInvoicePreview}>{inv.id}</td>
                    <td className="px-4 py-3 font-semibold text-foreground max-w-[200px] truncate">{inv.customer}</td>
                    <td className="px-4 py-3 text-muted-foreground text-xs whitespace-nowrap">{formatDate(inv.date)}</td>
                    <td className="px-4 py-3 text-muted-foreground text-xs whitespace-nowrap">{formatDate(inv.dueDate)}</td>
                    <td className="px-4 py-3 text-right">{formatCurrency(inv.subtotal)}</td>
                    <td className="px-4 py-3 text-right text-muted-foreground">{formatCurrency(inv.gst)}</td>
                    <td className="px-4 py-3 text-right font-bold text-slate-900">{formatCurrency(inv.total)}</td>
                    <td className="px-4 py-3 text-right text-emerald-600 font-semibold">{formatCurrency(inv.paid)}</td>
                    <td className="px-4 py-3 text-right text-amber-600 font-semibold">{formatCurrency(inv.balance)}</td>
                    <td className="px-4 py-3"><Badge variant={statusConf.variant}>{statusConf.label}</Badge></td>
                    <td className="px-4 py-3 text-center">
                      <div className="flex items-center justify-center gap-1">
                        <Button variant="outline" size="sm" onClick={openInvoicePreview} className="gap-1 text-xs">
                          <Eye className="w-3.5 h-3.5" /> View & Print
                        </Button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        <div className="flex items-center justify-between px-4 py-3 border-t text-sm text-muted-foreground">
          <p>Showing {Math.min((page - 1) * PER_PAGE + 1, filtered.length)}–{Math.min(page * PER_PAGE, filtered.length)} of {filtered.length}</p>
          <div className="flex items-center gap-1">
            <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1} className="px-3 py-1.5 rounded-lg border hover:bg-slate-50 disabled:opacity-50">Previous</button>
            <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages} className="px-3 py-1.5 rounded-lg border hover:bg-slate-50 disabled:opacity-50">Next</button>
          </div>
        </div>
      </div>

      {/* NEW INVOICE BILLING FORM MODAL (BILLING COUNTER) */}
      <Dialog open={isBillingFormOpen} onOpenChange={setIsBillingFormOpen}>
        <DialogContent className="max-w-4xl max-h-[92vh] overflow-y-auto p-0 rounded-2xl border-none shadow-2xl">
          {/* Header */}
          <div className="bg-gradient-to-r from-[#1B2537] via-[#2C3E5A] to-[#1B2537] text-white p-6 rounded-t-2xl flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl bg-white/10 flex items-center justify-center backdrop-blur-md border border-white/20">
                <Receipt className="w-6 h-6 text-[#76C043]" />
              </div>
              <div>
                <h3 className="text-xl font-bold tracking-tight flex items-center gap-2">
                  New Sales Invoice (Billing Counter)
                  <span className="text-xs px-2.5 py-0.5 rounded-full bg-[#76C043]/20 text-[#76C043] border border-[#76C043]/30 font-mono">
                    GST Billing
                  </span>
                </h3>
                <p className="text-xs text-slate-300 mt-0.5">
                  Enter customer info, add mobile/electronics products, calculate GST & generate tax invoice
                </p>
              </div>
            </div>
          </div>

          <div className="p-6 space-y-6 bg-slate-50/50">
            {/* 1. Customer & Bill Meta */}
            <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm space-y-4">
              <h4 className="text-xs font-extrabold uppercase tracking-wider text-[#3F63AD] flex items-center gap-2">
                <User className="w-4 h-4 text-[#3F63AD]" /> 1. Customer Particulars & Invoice Details
              </h4>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-1.5 md:col-span-2">
                  <Label className="text-xs font-semibold text-slate-700">Customer Name *</Label>
                  <Select value={billingForm.customerName} onValueChange={handleSelectCustomer}>
                    <SelectTrigger className="bg-slate-50 border-slate-300"><SelectValue placeholder="Select or type customer" /></SelectTrigger>
                    <SelectContent>
                      {CUSTOMERS.map((c) => (
                        <SelectItem key={c.name} value={c.name}>
                          {c.name} ({c.city})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold text-slate-700">Invoice Number</Label>
                  <Input value={billingForm.invoiceNo} readOnly className="bg-slate-100 border-slate-300 font-mono font-bold text-[#3F63AD]" />
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold text-slate-700">Phone Contact</Label>
                  <Input
                    value={billingForm.customerPhone}
                    onChange={(e) => setBillingForm({ ...billingForm, customerPhone: e.target.value })}
                    className="bg-slate-50 border-slate-300 font-mono"
                  />
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold text-slate-700">GSTIN Number</Label>
                  <Input
                    value={billingForm.customerGstin}
                    onChange={(e) => setBillingForm({ ...billingForm, customerGstin: e.target.value })}
                    className="bg-slate-50 border-slate-300 font-mono"
                  />
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold text-slate-700">Place of Supply (State)</Label>
                  <Select value={billingForm.placeOfSupply} onValueChange={(v) => setBillingForm({ ...billingForm, placeOfSupply: v })}>
                    <SelectTrigger className="bg-slate-50 border-slate-300"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Uttar Pradesh (09)">Uttar Pradesh (09) — Intra-state</SelectItem>
                      <SelectItem value="Maharashtra (27)">Maharashtra (27) — Inter-state</SelectItem>
                      <SelectItem value="Delhi (07)">Delhi (07) — Inter-state</SelectItem>
                      <SelectItem value="Karnataka (29)">Karnataka (29) — Inter-state</SelectItem>
                      <SelectItem value="Gujarat (24)">Gujarat (24) — Inter-state</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1.5 md:col-span-3">
                  <Label className="text-xs font-semibold text-slate-700">Customer Address</Label>
                  <Input
                    value={billingForm.customerAddress}
                    onChange={(e) => setBillingForm({ ...billingForm, customerAddress: e.target.value })}
                    className="bg-slate-50 border-slate-300"
                  />
                </div>
              </div>
            </div>

            {/* 2. Products / Items Table */}
            <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm space-y-4">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-extrabold uppercase tracking-wider text-[#3F63AD] flex items-center gap-2">
                  <ShoppingCart className="w-4 h-4 text-[#3F63AD]" /> 2. Items & Serial / IMEI Particulars
                </h4>
                <Button size="sm" onClick={addLineItem} variant="outline" className="text-xs gap-1 border-[#3F63AD] text-[#3F63AD]">
                  <Plus className="w-3.5 h-3.5" /> Add Product Row
                </Button>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead className="bg-slate-100 border-b text-slate-700 uppercase">
                    <tr>
                      <th className="p-2 text-left w-64">Item Description</th>
                      <th className="p-2 text-left w-36">Serial / IMEI No.</th>
                      <th className="p-2 text-[#3F63AD] text-center w-16">Qty</th>
                      <th className="p-2 text-right w-24">Rate (₹)</th>
                      <th className="p-2 text-right w-20">Disc (₹)</th>
                      <th className="p-2 text-center w-20">GST %</th>
                      <th className="p-2 text-right w-28">Line Total (₹)</th>
                      <th className="p-2 text-center w-10"></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {billingForm.lineItems.map((item, idx) => {
                      const lineTotal = (item.rate - item.discount) * item.qty * (1 + item.gstRate / 100);
                      return (
                        <tr key={item.id} className="hover:bg-slate-50">
                          <td className="p-2">
                            <Select value={item.name} onValueChange={(v) => handleLineItemChange(idx, "name", v)}>
                              <SelectTrigger className="h-8 text-xs bg-slate-50 border-slate-300"><SelectValue /></SelectTrigger>
                              <SelectContent>
                                {CATALOG_ITEMS.map((c) => (
                                  <SelectItem key={c.name} value={c.name}>
                                    {c.name}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </td>
                          <td className="p-2">
                            <Input
                              placeholder="IMEI / Serial"
                              value={item.serialImei}
                              onChange={(e) => handleLineItemChange(idx, "serialImei", e.target.value)}
                              className="h-8 text-xs bg-slate-50 font-mono"
                            />
                          </td>
                          <td className="p-2">
                            <Input
                              type="number"
                              value={item.qty}
                              onChange={(e) => handleLineItemChange(idx, "qty", Number(e.target.value))}
                              className="h-8 text-xs bg-slate-50 text-center font-bold"
                            />
                          </td>
                          <td className="p-2">
                            <Input
                              type="number"
                              value={item.rate}
                              onChange={(e) => handleLineItemChange(idx, "rate", Number(e.target.value))}
                              className="h-8 text-xs bg-slate-50 text-right"
                            />
                          </td>
                          <td className="p-2">
                            <Input
                              type="number"
                              value={item.discount}
                              onChange={(e) => handleLineItemChange(idx, "discount", Number(e.target.value))}
                              className="h-8 text-xs bg-slate-50 text-right"
                            />
                          </td>
                          <td className="p-2">
                            <Select value={String(item.gstRate)} onValueChange={(v) => handleLineItemChange(idx, "gstRate", Number(v))}>
                              <SelectTrigger className="h-8 text-xs bg-slate-50 border-slate-300"><SelectValue /></SelectTrigger>
                              <SelectContent>
                                <SelectItem value="0">0%</SelectItem>
                                <SelectItem value="5">5%</SelectItem>
                                <SelectItem value="12">12%</SelectItem>
                                <SelectItem value="18">18%</SelectItem>
                                <SelectItem value="28">28%</SelectItem>
                              </SelectContent>
                            </Select>
                          </td>
                          <td className="p-2 text-right font-bold text-slate-900">
                            {formatCurrency(lineTotal)}
                          </td>
                          <td className="p-2 text-center">
                            {billingForm.lineItems.length > 1 && (
                              <button onClick={() => removeLineItem(idx)} className="text-red-500 hover:text-red-700 p-1">
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>

            {/* 3. Payment Mode & Bill Summary Box */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm space-y-4">
                <h4 className="text-xs font-extrabold uppercase tracking-wider text-[#3F63AD] flex items-center gap-2">
                  <CreditCard className="w-4 h-4 text-[#3F63AD]" /> 3. Payment Terms & Mode
                </h4>
                <div className="space-y-3">
                  <div className="space-y-1.5">
                    <Label className="text-xs font-semibold text-slate-700">Payment Method</Label>
                    <Select value={billingForm.paymentMode} onValueChange={(v) => setBillingForm({ ...billingForm, paymentMode: v })}>
                      <SelectTrigger className="bg-slate-50 border-slate-300"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="UPI">UPI (Google Pay / PhonePe / Paytm)</SelectItem>
                        <SelectItem value="Cash">Cash Counter Payment</SelectItem>
                        <SelectItem value="Credit Card">Credit Card / Debit Card POS</SelectItem>
                        <SelectItem value="Bank Transfer">Bank Transfer (NEFT / RTGS)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-1.5">
                    <Label className="text-xs font-semibold text-slate-700">Payment Status</Label>
                    <Select value={billingForm.paymentStatus} onValueChange={(v) => setBillingForm({ ...billingForm, paymentStatus: v })}>
                      <SelectTrigger className="bg-slate-50 border-slate-300"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Paid">Paid in Full</SelectItem>
                        <SelectItem value="Pending">Pending / Credit Bill</SelectItem>
                        <SelectItem value="Partial">Partial Advance Paid</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>

              {/* Bill Totals Card */}
              <div className="bg-[#1B2537] text-white p-5 rounded-xl border border-slate-800 shadow-md space-y-2 text-xs">
                <h4 className="text-xs font-extrabold uppercase tracking-wider text-[#76C043] flex items-center gap-2 border-b border-white/10 pb-2">
                  <Calculator className="w-4 h-4 text-[#76C043]" /> GST Tax Calculation Summary
                </h4>
                <div className="flex justify-between py-1 border-b border-white/5">
                  <span className="text-slate-400">Gross Items Total:</span>
                  <span>{formatCurrency(billCalculations.subtotal)}</span>
                </div>
                <div className="flex justify-between py-1 border-b border-white/5">
                  <span className="text-slate-400">Taxable Value:</span>
                  <span className="font-semibold">{formatCurrency(billCalculations.totalTaxable)}</span>
                </div>
                {billCalculations.cgst > 0 ? (
                  <>
                    <div className="flex justify-between py-1 border-b border-white/5 text-slate-300">
                      <span>CGST @ 9%:</span>
                      <span>{formatCurrency(billCalculations.cgst)}</span>
                    </div>
                    <div className="flex justify-between py-1 border-b border-white/5 text-slate-300">
                      <span>SGST @ 9%:</span>
                      <span>{formatCurrency(billCalculations.sgst)}</span>
                    </div>
                  </>
                ) : (
                  <div className="flex justify-between py-1 border-b border-white/5 text-slate-300">
                    <span>IGST @ 18%:</span>
                    <span>{formatCurrency(billCalculations.igst)}</span>
                  </div>
                )}
                <div className="flex justify-between items-center pt-2 text-base font-black text-white">
                  <span>Grand Total Amount:</span>
                  <span className="text-[#76C043] text-xl">{formatCurrency(billCalculations.grandTotal)}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="bg-slate-100 px-6 py-4 rounded-b-2xl border-t border-slate-200 flex items-center justify-between">
            <span className="text-xs text-slate-500 font-medium">
              * Generates official GST Tax Invoice with VALUEPLUS brand & printable layout
            </span>
            <div className="flex items-center gap-3">
              <Button variant="outline" onClick={() => setIsBillingFormOpen(false)} className="px-5">
                Cancel
              </Button>
              <Button onClick={handleGenerateInvoice} className="bg-[#3F63AD] hover:bg-[#2E4F95] text-white px-6 font-bold shadow-lg shadow-[#3F63AD]/25 gap-2">
                <Printer className="w-4 h-4" /> Generate & Print GST Invoice
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* FULL INVOICE PREVIEW MODAL */}
      <Dialog open={isPreviewOpen} onOpenChange={setIsPreviewOpen}>
        <DialogContent className="max-w-5xl max-h-[92vh] overflow-y-auto p-2">
          <ValueplusInvoice />
        </DialogContent>
      </Dialog>
    </PageShell>
  );
}
