"use client";

import { useState, useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import {
  TrendingUp, TrendingDown, DollarSign, ShoppingCart, Package,
  Users, AlertTriangle, ArrowRight, Eye, MoreHorizontal,
  IndianRupee, Receipt, Wallet, CreditCard, Activity,
  Star, Sparkles, Calendar, Clock, CheckCircle2, Search,
  X, Filter, ExternalLink, Printer, Send, ShieldAlert, Plus, FileText, Download, Trash2, Building, Building2, UserCheck, Tv, Smartphone, Laptop, Fan, HardDrive, Headphones,
} from "lucide-react";
import {
  AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
} from "recharts";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn, formatCurrency, indianNumberFormat } from "@/lib/utils";
import ValueplusInvoice from "@/app/invoice/page";
import { InvoiceCreationModal } from "@/components/InvoiceCreationModal";



// ─── DUMMY DATA FOR CHARTS ────────────────────────────────────
const DAILY_REVENUE = [
  { date: "25 Jul", revenue: 85000, expense: 52000, profit: 33000 },
  { date: "26 Jul", revenue: 92000, expense: 58000, profit: 34000 },
  { date: "27 Jul", revenue: 110000, expense: 65000, profit: 45000 },
  { date: "28 Jul", revenue: 78000, expense: 49000, profit: 29000 },
  { date: "29 Jul", revenue: 95000, expense: 61000, profit: 34000 },
  { date: "30 Jul", revenue: 105000, expense: 62000, profit: 43000 },
  { date: "31 Jul", revenue: 125000, expense: 71000, profit: 54000 },
  { date: "01 Aug", revenue: 234500, expense: 98200, profit: 136300 },
];

const INVENTORY_STATUS = [
  { name: "In Stock", value: 68, color: "#10B981" },
  { name: "Low Stock", value: 18, color: "#F59E0B" },
  { name: "Out of Stock", value: 14, color: "#EF4444" },
];

const TOP_PRODUCTS = [
  { name: "Dell XPS 15 9530 Laptop", sales: 24, revenue: 3599760, growth: 18.4 },
  { name: "Apple MacBook Pro 16\"", sales: 18, revenue: 4498200, growth: 14.2 },
  { name: "Samsung 27\" 4K Monitor", sales: 35, revenue: 1049965, growth: 22.1 },
  { name: "Logitech MX Master 3S Mouse", sales: 85, revenue: 764575, growth: 9.6 },
  { name: "HP LaserJet Pro MFP Printer", sales: 14, revenue: 553000, growth: 12.0 },
];

const TOP_CUSTOMERS = [
  { name: "Reliance Retail Ltd", city: "Mumbai", amount: 176989, invoices: 2, status: "active" },
  { name: "Tata Consultancy Services Ltd", city: "Delhi", amount: 316111, invoices: 3, status: "active" },
  { name: "Infosys Limited", city: "Bengaluru", amount: 189500, invoices: 2, status: "active" },
];

// ─── CUSTOM TOOLTIP ────────────────────────────────────────────
function CustomTooltip({ active, payload, label }: { active?: boolean; payload?: Array<{ name: string; value: number; color: string }>; label?: string }) {
  if (active && payload && payload.length) {
    return (
      <div className="bg-white border border-border rounded-xl shadow-xl p-3 text-sm">
        <p className="font-semibold text-foreground mb-1.5">{label}</p>
        {payload.map((entry) => (
          <div key={entry.name} className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-1.5">
              <div className="w-2 h-2 rounded-full" style={{ backgroundColor: entry.color }} />
              <span className="text-muted-foreground capitalize">{entry.name}</span>
            </div>
            <span className="font-semibold">{indianNumberFormat(entry.value)}</span>
          </div>
        ))}
      </div>
    );
  }
  return null;
}

// ─── STATUS BADGE ──────────────────────────────────────────────
function StatusBadge({ status }: { status: string }) {
  const map: Record<string, { variant: "success" | "warning" | "destructive" | "info" | "secondary"; label: string }> = {
    paid: { variant: "success", label: "Paid" },
    sent: { variant: "info", label: "Sent / Pending" },
    pending: { variant: "warning", label: "Pending" },
    overdue: { variant: "destructive", label: "Overdue" },
    partial: { variant: "info", label: "Partial" },
    active: { variant: "success", label: "Active" },
  };
  const config = map[status] ?? { variant: "secondary", label: status };
  return <Badge variant={config.variant}>{config.label}</Badge>;
}

// ─── MAIN DASHBOARD PAGE ───────────────────────────────────────


export default function DashboardPage() {
  const router = useRouter();

  // Period Filter State
  const [period, setPeriod] = useState<"today" | "yesterday" | "week" | "month" | "all">("today");
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<any>(null);

  // Drilldown Modal State
  const [activeModal, setActiveModal] = useState<"cash" | "online" | "finance" | "orders" | null>(null);
  const [searchQuery, setSearchQuery] = useState("");

  // Form Modals State
  const [openInvoiceModal, setOpenInvoiceModal] = useState(false);
  const [openEstimateModal, setOpenEstimateModal] = useState(false);
  const [openCustomerModal, setOpenCustomerModal] = useState(false);
  const [openItemModal, setOpenItemModal] = useState(false);
  const [openPaymentModal, setOpenPaymentModal] = useState(false);

  // Official Invoice Print Preview State
  const [activePrintInvoice, setActivePrintInvoice] = useState<any | null>(null);

  // Submitting State
  const [submitting, setSubmitting] = useState(false);



  // Simple Forms
  const [estimateForm, setEstimateForm] = useState({ customerName: "", total: "", notes: "" });
  const [customerForm, setCustomerForm] = useState({ name: "", phone: "", email: "", gstNumber: "", city: "Mumbai", creditLimit: "50000" });
  const [itemForm, setItemForm] = useState({ name: "", hsnCode: "8471", gstRate: "18", purchasePrice: "", sellingPrice: "", openingStock: "10" });
  const [paymentForm, setPaymentForm] = useState({ partyName: "", amount: "", paymentMode: "Cash Counter", notes: "" });

  // Fetch Dashboard Stats
  const fetchStats = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/dashboard/stats?period=${period}`);
      const json = await res.json();
      if (json.success) {
        setData(json);
      }
    } catch (err) {
      console.error("Dashboard fetch error:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStats();
  }, [period]);

  // Open Invoice Modal
  const handleOpenInvoiceModal = () => {
    setOpenInvoiceModal(true);
  };

  const handleCreateEstimate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!estimateForm.customerName || !estimateForm.total) return;
    setSubmitting(true);
    try {
      const res = await fetch("/api/dashboard/stats", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ entityType: "invoice", customerName: estimateForm.customerName, total: estimateForm.total, status: "draft", notes: "Estimate / Quotation" }),
      });
      const json = await res.json();
      if (json.success) {
        setOpenEstimateModal(false);
        setEstimateForm({ customerName: "", total: "", notes: "" });
        await fetchStats();
      }
    } catch (err) {
      console.error(err);
    } finally {
      setSubmitting(false);
    }
  };

  const handleAddCustomer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!customerForm.name || !customerForm.phone) return;
    setSubmitting(true);
    try {
      const res = await fetch("/api/dashboard/stats", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ entityType: "customer", ...customerForm }),
      });
      const json = await res.json();
      if (json.success) {
        setOpenCustomerModal(false);
        setCustomerForm({ name: "", phone: "", email: "", gstNumber: "", city: "Mumbai", creditLimit: "50000" });
        await fetchStats();
      }
    } catch (err) {
      console.error(err);
    } finally {
      setSubmitting(false);
    }
  };

  const handleAddItem = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!itemForm.name || !itemForm.sellingPrice) return;
    setSubmitting(true);
    try {
      const res = await fetch("/api/dashboard/stats", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ entityType: "item", ...itemForm }),
      });
      const json = await res.json();
      if (json.success) {
        setOpenItemModal(false);
        setItemForm({ name: "", hsnCode: "8471", gstRate: "18", purchasePrice: "", sellingPrice: "", openingStock: "10" });
        await fetchStats();
      }
    } catch (err) {
      console.error(err);
    } finally {
      setSubmitting(false);
    }
  };

  const handleRecordPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!paymentForm.partyName || !paymentForm.amount) return;
    setSubmitting(true);
    try {
      const res = await fetch("/api/dashboard/stats", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ entityType: "payment", ...paymentForm }),
      });
      const json = await res.json();
      if (json.success) {
        setOpenPaymentModal(false);
        setPaymentForm({ partyName: "", amount: "", paymentMode: "Cash Counter", notes: "" });
        await fetchStats();
      }
    } catch (err) {
      console.error(err);
    } finally {
      setSubmitting(false);
    }
  };

  const metrics = data?.metrics || {
    totalRevenue: 493100,
    cashRevenue: 222789,
    onlineRevenue: 316111,
    financeRevenue: 176989,
    totalOrders: 6,
    pendingOrders: 2,
    lowStockItems: 2,
  };

  const transactions = data?.transactions || { cash: [], online: [], finance: [] };
  const recentInvoices = data?.recentInvoices || [];

  const getFilteredTransactions = () => {
    if (!activeModal) return [];
    let list: any[] = [];
    if (activeModal === "cash") list = transactions.cash || [];
    if (activeModal === "online") list = transactions.online || [];
    if (activeModal === "finance") list = transactions.finance || [];
    if (activeModal === "orders") list = recentInvoices || [];

    if (!searchQuery.trim()) return list;
    return list.filter((item: any) =>
      (item.customer || item.customerName || "").toLowerCase().includes(searchQuery.toLowerCase()) ||
      (item.id || item.invoiceNumber || "").toLowerCase().includes(searchQuery.toLowerCase())
    );
  };

  // Trigger Official Invoice Section Print & Preview
  const handlePrintTrigger = (inv: any) => {
    setActivePrintInvoice(inv);
  };

  return (
    <div className="page-container">
      {/* ─── HEADER WITH PERIOD FILTER TABS ────────────────────────── */}
      <div className="flex flex-col xl:flex-row gap-6 items-start xl:items-center justify-between bg-white p-6 rounded-[24px] border border-slate-100 shadow-[0_8px_30px_rgb(0,0,0,0.04)]">
        <div className="flex items-center gap-4 flex-1">
          <div className="w-12 h-12 rounded-full bg-blue-50 flex items-center justify-center border border-blue-100/50 flex-shrink-0">
            <Activity className="w-6 h-6 text-[#3F63AD]" />
          </div>
          <div>
            <h1 className="text-2xl font-black text-slate-900 tracking-tight flex flex-wrap items-center gap-3">
              Executive Dashboard
              <Badge variant="success" className="text-[10px] px-2.5 py-1 uppercase tracking-widest bg-emerald-50 text-emerald-600 border border-emerald-200/50 font-bold shadow-sm whitespace-nowrap flex items-center flex-shrink-0">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse mr-1.5" />
                Live Sync
              </Badge>
            </h1>
            <p className="text-sm text-slate-500 font-medium mt-1">
              Real-time Sales, Cash, Online & Finance Audit · FY 2026–27
            </p>
          </div>
        </div>

        {/* PERIOD FILTER DROPDOWN */}
        <div className="w-full xl:w-56 mt-2 xl:mt-0">
          <Select value={period} onValueChange={(v: any) => setPeriod(v)}>
            <SelectTrigger className="h-11 rounded-[14px] bg-slate-50 border-slate-200 font-bold text-slate-700 shadow-sm w-full">
              <Calendar className="w-4 h-4 mr-2 text-[#3F63AD]" />
              <SelectValue placeholder="Select Period" />
            </SelectTrigger>
            <SelectContent className="rounded-xl border-slate-100 shadow-xl">
              <SelectItem value="today" className="font-semibold cursor-pointer">Today</SelectItem>
              <SelectItem value="yesterday" className="font-semibold cursor-pointer">Yesterday</SelectItem>
              <SelectItem value="week" className="font-semibold cursor-pointer">This Week</SelectItem>
              <SelectItem value="month" className="font-semibold cursor-pointer">This Month</SelectItem>
              <SelectItem value="all" className="font-semibold cursor-pointer">All Time</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* HEADER QUICK BUTTONS */}
        <div className="flex flex-col sm:flex-row items-center gap-3 w-full xl:w-auto mt-2 xl:mt-0">
          <Button variant="outline" onClick={() => router.push("/reports")} className="h-11 px-5 rounded-[14px] font-semibold border-slate-200 text-slate-700 hover:bg-slate-50 shadow-sm w-full sm:w-auto">
            <Eye className="w-4 h-4 mr-2 text-[#3F63AD]" /> View Reports
          </Button>
          <Button onClick={handleOpenInvoiceModal} className="h-11 px-6 rounded-[14px] font-bold bg-gradient-to-r from-[#3F63AD] to-[#2C4A85] text-white hover:shadow-lg hover:shadow-blue-500/25 transition-all w-full sm:w-auto border-none">
            <Receipt className="w-4 h-4 mr-2" /> Create Invoice
          </Button>
        </div>
      </div>

      <div className="page-content space-y-6 mt-6">
        {/* ─── PAYMENT & SALES BREAKDOWN CARDS (CLICKABLE) ───────────────── */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-bold text-foreground uppercase tracking-wider flex items-center gap-2">
              <CreditCard className="w-4 h-4 text-[#3F63AD]" /> Payment & Sales Audit ({period.toUpperCase()})
            </h2>
            <span className="text-xs text-muted-foreground font-medium">Click any card to open detailed transaction ledger</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* CASH PAYMENT CARD */}
            <div
              onClick={() => { setActiveModal("cash"); setSearchQuery(""); }}
              className="metric-card cursor-pointer hover:border-[#76C043] transition-all hover:shadow-md group relative overflow-hidden bg-gradient-to-br from-white to-emerald-50/40"
            >
              <div className="flex items-start justify-between">
                <div>
                  <div className="flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-[#76C043]" />
                    <p className="text-xs font-semibold text-slate-600 uppercase tracking-wide">Cash Collections</p>
                  </div>
                  <p className="text-2xl font-black text-slate-900 mt-2">
                    {formatCurrency(metrics.cashRevenue || 0)}
                  </p>
                  <p className="text-xs font-medium text-emerald-700 mt-1 flex items-center gap-1">
                    <Clock className="w-3 h-3" /> {(transactions.cash || []).length} Cash Transactions
                  </p>
                </div>
                <div className="w-12 h-12 rounded-2xl bg-[#76C043]/15 flex items-center justify-center text-[#76C043] group-hover:scale-110 transition-transform">
                  <IndianRupee className="w-6 h-6" />
                </div>
              </div>
              <div className="mt-4 pt-3 border-t border-emerald-100 flex items-center justify-between text-xs text-[#76C043] font-semibold">
                <span>Audit Cash Ledger</span>
                <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
              </div>
            </div>

            {/* ONLINE / UPI PAYMENT CARD */}
            <div
              onClick={() => { setActiveModal("online"); setSearchQuery(""); }}
              className="metric-card cursor-pointer hover:border-[#3F63AD] transition-all hover:shadow-md group relative overflow-hidden bg-gradient-to-br from-white to-blue-50/40"
            >
              <div className="flex items-start justify-between">
                <div>
                  <div className="flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-[#3F63AD]" />
                    <p className="text-xs font-semibold text-slate-600 uppercase tracking-wide">Digital / UPI Receipts</p>
                  </div>
                  <p className="text-2xl font-black text-slate-900 mt-2">
                    {formatCurrency(metrics.onlineRevenue || 0)}
                  </p>
                  <p className="text-xs font-medium text-blue-700 mt-1 flex items-center gap-1">
                    <CheckCircle2 className="w-3 h-3" /> {(transactions.online || []).length} Online Transactions
                  </p>
                </div>
                <div className="w-12 h-12 rounded-2xl bg-[#3F63AD]/15 flex items-center justify-center text-[#3F63AD] group-hover:scale-110 transition-transform">
                  <CreditCard className="w-6 h-6" />
                </div>
              </div>
              <div className="mt-4 pt-3 border-t border-blue-100 flex items-center justify-between text-xs text-[#3F63AD] font-semibold">
                <span>Audit Digital Receipts</span>
                <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
              </div>
            </div>

            {/* FINANCE / CREDIT CARD */}
            <div
              onClick={() => { setActiveModal("finance"); setSearchQuery(""); }}
              className="metric-card cursor-pointer hover:border-amber-500 transition-all hover:shadow-md group relative overflow-hidden bg-gradient-to-br from-white to-amber-50/40"
            >
              <div className="flex items-start justify-between">
                <div>
                  <div className="flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-amber-500" />
                    <p className="text-xs font-semibold text-slate-600 uppercase tracking-wide">Finance & Khata Credit</p>
                  </div>
                  <p className="text-2xl font-black text-slate-900 mt-2">
                    {formatCurrency(metrics.financeRevenue || 0)}
                  </p>
                  <p className="text-xs font-medium text-amber-700 mt-1 flex items-center gap-1">
                    <ShieldAlert className="w-3 h-3" /> {(transactions.finance || []).length} Finance & Credit Trx
                  </p>
                </div>
                <div className="w-12 h-12 rounded-2xl bg-amber-500/15 flex items-center justify-center text-amber-600 group-hover:scale-110 transition-transform">
                  <Wallet className="w-6 h-6" />
                </div>
              </div>
              <div className="mt-4 pt-3 border-t border-amber-100 flex items-center justify-between text-xs text-amber-700 font-semibold">
                <span>Audit Credit & Due Dates</span>
                <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
              </div>
            </div>

            {/* TOTAL ORDERS CARD */}
            <div
              onClick={() => { setActiveModal("orders"); setSearchQuery(""); }}
              className="metric-card cursor-pointer hover:border-purple-500 transition-all hover:shadow-md group relative overflow-hidden bg-gradient-to-br from-white to-purple-50/40"
            >
              <div className="flex items-start justify-between">
                <div>
                  <div className="flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-purple-500" />
                    <p className="text-xs font-semibold text-slate-600 uppercase tracking-wide">Total Sales Orders</p>
                  </div>
                  <p className="text-2xl font-black text-slate-900 mt-2">
                    {metrics.totalOrders || 0} Orders
                  </p>
                  <p className="text-xs font-medium text-purple-700 mt-1 flex items-center gap-1">
                    <ShoppingCart className="w-3 h-3" /> {formatCurrency(metrics.totalRevenue || 0)} Revenue
                  </p>
                </div>
                <div className="w-12 h-12 rounded-2xl bg-purple-500/15 flex items-center justify-center text-purple-600 group-hover:scale-110 transition-transform">
                  <Package className="w-6 h-6" />
                </div>
              </div>
              <div className="mt-4 pt-3 border-t border-purple-100 flex items-center justify-between text-xs text-purple-700 font-semibold">
                <span>Audit Order Details</span>
                <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
              </div>
            </div>
          </div>
        </div>

        {/* ─── QUICK ACTION BUTTONS STRIP ───────────────────────────────── */}
        <div className="bg-slate-900 text-white p-4 rounded-2xl flex flex-wrap items-center justify-between gap-3 shadow-md">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center font-bold text-[#76C043]">
              VP
            </div>
            <div>
              <p className="text-sm font-bold">Quick Actions Form Launchers</p>
              <p className="text-xs text-slate-400">Click any button to open inline creation forms directly on this dashboard</p>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Button size="sm" onClick={handleOpenInvoiceModal} className="bg-[#3F63AD] hover:bg-[#2E4F95] text-xs h-8 font-semibold">
              + Create Invoice
            </Button>
            <Button size="sm" onClick={() => setOpenEstimateModal(true)} className="bg-slate-800 hover:bg-slate-700 text-xs h-8 font-medium">
              + New Estimate
            </Button>
            <Button size="sm" onClick={() => setOpenCustomerModal(true)} className="bg-slate-800 hover:bg-slate-700 text-xs h-8 font-medium">
              + Add Customer
            </Button>
            <Button size="sm" onClick={() => setOpenItemModal(true)} className="bg-slate-800 hover:bg-slate-700 text-xs h-8 font-medium">
              + Add Item
            </Button>
            <Button size="sm" onClick={() => setOpenPaymentModal(true)} className="bg-[#76C043] hover:bg-emerald-600 text-xs h-8 font-bold text-slate-950">
              Record Payment
            </Button>
          </div>
        </div>

        {/* ─── REVENUE & PROFIT CHARTS ──────────────────────────────────── */}
        <div className="grid lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 data-table-container p-6">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h3 className="font-bold text-foreground text-base">Sales Revenue & Operational Analytics</h3>
                <p className="text-xs text-muted-foreground mt-0.5">Live performance tracking from MongoDB</p>
              </div>
              <Badge variant="secondary">Period: {period.toUpperCase()}</Badge>
            </div>
            <ResponsiveContainer width="100%" height={260}>
              <AreaChart data={DAILY_REVENUE} margin={{ top: 0, right: 0, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="revGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#3F63AD" stopOpacity={0.2} />
                    <stop offset="95%" stopColor="#3F63AD" stopOpacity={0.01} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" />
                <XAxis dataKey="date" tick={{ fontSize: 11, fill: "#94A3B8" }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 11, fill: "#94A3B8" }} axisLine={false} tickLine={false} tickFormatter={(v) => `₹${(v / 1000).toFixed(0)}k`} />
                <Tooltip content={<CustomTooltip />} />
                <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 12 }} />
                <Area type="monotone" dataKey="revenue" name="Total Revenue" stroke="#3F63AD" strokeWidth={2.5} fill="url(#revGradient)" />
                <Area type="monotone" dataKey="expense" name="Operational Cost" stroke="#EF4444" strokeWidth={2} fill="none" />
                <Area type="monotone" dataKey="profit" name="Net Profit Margin" stroke="#76C043" strokeWidth={2} fill="none" strokeDasharray="4 2" />
              </AreaChart>
            </ResponsiveContainer>
          </div>

          {/* INVENTORY STATUS */}
          <div className="data-table-container p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-bold text-foreground text-base">Inventory Distribution</h3>
              <Button variant="ghost" size="sm" onClick={() => setOpenItemModal(true)} className="h-7 px-2 text-xs text-[#3F63AD]">
                + Add Item <Plus className="w-3 h-3 ml-1" />
              </Button>
            </div>
            <ResponsiveContainer width="100%" height={180}>
              <PieChart>
                <Pie data={INVENTORY_STATUS} cx="50%" cy="50%" innerRadius={50} outerRadius={75} paddingAngle={3} dataKey="value">
                  {INVENTORY_STATUS.map((entry, i) => (
                    <Cell key={i} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip formatter={(v: number) => [`${v}%`, ""]} />
              </PieChart>
            </ResponsiveContainer>
            <div className="space-y-2 mt-2">
              {INVENTORY_STATUS.map((item) => (
                <div key={item.name} className="flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2">
                    <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: item.color }} />
                    <span className="text-muted-foreground">{item.name}</span>
                  </div>
                  <span className="font-bold">{item.value}%</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* ─── TOP PRODUCTS & TOP CUSTOMERS ─────────────────────────────── */}
        <div className="grid lg:grid-cols-2 gap-6">
          <div className="data-table-container p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-bold text-foreground text-base">Top Selling Products</h3>
              <Button variant="ghost" size="sm" onClick={() => router.push("/masters/items")} className="text-[#3F63AD] h-7 text-xs">
                View Items <ArrowRight className="w-3 h-3 ml-1" />
              </Button>
            </div>
            <div className="space-y-3">
              {TOP_PRODUCTS.map((prod, i) => (
                <div key={prod.name} className="flex items-center justify-between p-2.5 rounded-xl hover:bg-slate-50 transition-colors border border-transparent hover:border-slate-200">
                  <div className="flex items-center gap-3">
                    <div className="w-7 h-7 rounded-lg bg-[#3F63AD]/10 text-[#3F63AD] font-bold text-xs flex items-center justify-center">
                      {i + 1}
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-foreground">{prod.name}</p>
                      <p className="text-xs text-muted-foreground">{prod.sales} units sold</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-bold text-foreground">{formatCurrency(prod.revenue)}</p>
                    <span className="text-[10px] text-emerald-600 font-semibold">+{prod.growth}% growth</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="data-table-container p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-bold text-foreground text-base">Top Purchasing Customers</h3>
              <Button variant="ghost" size="sm" onClick={() => setOpenCustomerModal(true)} className="text-[#3F63AD] h-7 text-xs">
                + New Customer <Plus className="w-3 h-3 ml-1" />
              </Button>
            </div>
            <div className="space-y-3">
              {TOP_CUSTOMERS.map((cust) => (
                <div key={cust.name} className="flex items-center justify-between p-2.5 rounded-xl hover:bg-slate-50 transition-colors border border-transparent hover:border-slate-200">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-[#3F63AD] to-[#2E4F95] text-white font-bold text-xs flex items-center justify-center">
                      {cust.name.charAt(0)}
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-foreground">{cust.name}</p>
                      <p className="text-xs text-muted-foreground">{cust.city} · {cust.invoices} invoices</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-bold text-foreground">{formatCurrency(cust.amount)}</p>
                    <Badge variant="success" className="text-[10px]">Active Khata</Badge>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* ─── RECENT INVOICES LIST ─────────────────────────────────────── */}
        <div className="data-table-container">
          <div className="flex items-center justify-between p-5 border-b">
            <div>
              <h3 className="font-bold text-foreground text-base">Recent Invoices & Transactions</h3>
              <p className="text-xs text-muted-foreground mt-0.5">Click any invoice to preview & print official GST Tax Invoice template</p>
            </div>
            <Button size="sm" onClick={handleOpenInvoiceModal} className="bg-[#3F63AD] hover:bg-[#2E4F95] text-xs">
              + Create Invoice
            </Button>
          </div>

          <div className="divide-y divide-border">
            {recentInvoices.map((inv: any) => (
              <div
                key={inv._id || inv.invoiceNumber}
                onClick={() => handlePrintTrigger(inv)}
                className="flex items-center justify-between p-4 hover:bg-slate-50 transition-colors cursor-pointer group"
              >
                <div className="flex items-center gap-3.5">
                  <div className="w-10 h-10 rounded-xl bg-[#3F63AD]/10 flex items-center justify-center text-[#3F63AD] group-hover:bg-[#3F63AD] group-hover:text-white transition-colors">
                    <Printer className="w-5 h-5" />
                  </div>
                  <div>
                    <p className="text-sm font-bold text-foreground group-hover:text-[#3F63AD] transition-colors">{inv.invoiceNumber}</p>
                    <p className="text-xs text-muted-foreground">{inv.customerName} · {inv.date}</p>
                  </div>
                </div>

                <div className="flex items-center gap-6">
                  <div className="text-right">
                    <p className="text-sm font-bold text-foreground">{formatCurrency(inv.total)}</p>
                    <p className="text-[11px] text-muted-foreground">{inv.paymentTerms || "Net 30"}</p>
                  </div>
                  <StatusBadge status={inv.status} />
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={(e) => {
                      e.stopPropagation();
                      handlePrintTrigger(inv);
                    }}
                    className="h-8 text-xs font-semibold border-[#3F63AD] text-[#3F63AD] hover:bg-[#3F63AD] hover:text-white"
                  >
                    <Printer className="w-3.5 h-3.5 mr-1" /> View Official Invoice
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ─── OFFICIAL INVOICE PRINT & PREVIEW MODAL ────────────────────── */}
      <Dialog open={!!activePrintInvoice} onOpenChange={() => setActivePrintInvoice(null)}>
        <DialogContent className="max-w-5xl max-h-[92vh] overflow-y-auto p-2">
          <ValueplusInvoice invoiceData={activePrintInvoice} />
        </DialogContent>
      </Dialog>

      {/* ─── 1. NEW SALES INVOICE (BILLING COUNTER) MODAL ──────────────── */}
      <InvoiceCreationModal 
        isOpen={openInvoiceModal} 
        onClose={() => setOpenInvoiceModal(false)}
        onSuccess={() => {
          setOpenInvoiceModal(false);
          fetchStats();
        }}
      />

      {/* ─── 2. NEW ESTIMATE MODAL FORM ─────────────────────────────── */}
      <Dialog open={openEstimateModal} onOpenChange={setOpenEstimateModal}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold flex items-center gap-2">
              <FileText className="w-5 h-5 text-purple-600" /> Create New Estimate / Quotation
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              Generate a sales quotation for client approval.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleCreateEstimate} className="space-y-3 mt-2">
            <div>
              <Label className="text-xs font-semibold">Customer Name *</Label>
              <Input
                required
                placeholder="e.g. Tata Consultancy Services"
                value={estimateForm.customerName}
                onChange={(e) => setEstimateForm({ ...estimateForm, customerName: e.target.value })}
                className="h-9 text-xs mt-1"
              />
            </div>
            <div>
              <Label className="text-xs font-semibold">Estimated Total Value (₹) *</Label>
              <Input
                required
                type="number"
                placeholder="e.g. 250000"
                value={estimateForm.total}
                onChange={(e) => setEstimateForm({ ...estimateForm, total: e.target.value })}
                className="h-9 text-xs mt-1 font-bold"
              />
            </div>
            <div>
              <Label className="text-xs font-semibold">Terms & Notes</Label>
              <Input
                placeholder="Valid for 15 days from issue"
                value={estimateForm.notes}
                onChange={(e) => setEstimateForm({ ...estimateForm, notes: e.target.value })}
                className="h-9 text-xs mt-1"
              />
            </div>
            <DialogFooter className="pt-2">
              <Button type="button" variant="outline" size="sm" onClick={() => setOpenEstimateModal(false)}>
                Cancel
              </Button>
              <Button type="submit" size="sm" disabled={submitting} className="bg-purple-600 hover:bg-purple-700 text-white">
                {submitting ? "Saving..." : "Save Estimate"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* ─── 3. ADD CUSTOMER MODAL FORM ─────────────────────────────── */}
      <Dialog open={openCustomerModal} onOpenChange={setOpenCustomerModal}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold flex items-center gap-2">
              <Users className="w-5 h-5 text-emerald-600" /> Add New Customer
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              Add a new buyer to your customer directory and khata.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleAddCustomer} className="space-y-3 mt-2">
            <div>
              <Label className="text-xs font-semibold">Customer / Business Name *</Label>
              <Input
                required
                placeholder="e.g. Apex Enterprises Pvt Ltd"
                value={customerForm.name}
                onChange={(e) => setCustomerForm({ ...customerForm, name: e.target.value })}
                className="h-9 text-xs mt-1"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs font-semibold">Phone Number *</Label>
                <Input
                  required
                  placeholder="+91 98200 12345"
                  value={customerForm.phone}
                  onChange={(e) => setCustomerForm({ ...customerForm, phone: e.target.value })}
                  className="h-9 text-xs mt-1"
                />
              </div>
              <div>
                <Label className="text-xs font-semibold">Email Address</Label>
                <Input
                  type="email"
                  placeholder="contact@apex.com"
                  value={customerForm.email}
                  onChange={(e) => setCustomerForm({ ...customerForm, email: e.target.value })}
                  className="h-9 text-xs mt-1"
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs font-semibold">GSTIN Number</Label>
                <Input
                  placeholder="27AAACA1234A1Z5"
                  value={customerForm.gstNumber}
                  onChange={(e) => setCustomerForm({ ...customerForm, gstNumber: e.target.value })}
                  className="h-9 text-xs mt-1"
                />
              </div>
              <div>
                <Label className="text-xs font-semibold">Credit Limit (₹)</Label>
                <Input
                  type="number"
                  placeholder="50000"
                  value={customerForm.creditLimit}
                  onChange={(e) => setCustomerForm({ ...customerForm, creditLimit: e.target.value })}
                  className="h-9 text-xs mt-1"
                />
              </div>
            </div>
            <DialogFooter className="pt-2">
              <Button type="button" variant="outline" size="sm" onClick={() => setOpenCustomerModal(false)}>
                Cancel
              </Button>
              <Button type="submit" size="sm" disabled={submitting} className="bg-emerald-600 hover:bg-emerald-700 text-white">
                {submitting ? "Saving..." : "Save Customer"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* ─── 4. ADD ITEM MODAL FORM ─────────────────────────────────── */}
      <Dialog open={openItemModal} onOpenChange={setOpenItemModal}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold flex items-center gap-2">
              <Package className="w-5 h-5 text-amber-600" /> Add New Inventory Item
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              Add a new product item into stock inventory.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleAddItem} className="space-y-3 mt-2">
            <div>
              <Label className="text-xs font-semibold">Item Name *</Label>
              <Input
                required
                placeholder="e.g. Wireless Gaming Mouse"
                value={itemForm.name}
                onChange={(e) => setItemForm({ ...itemForm, name: e.target.value })}
                className="h-9 text-xs mt-1"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs font-semibold">HSN Code</Label>
                <Input
                  placeholder="8471"
                  value={itemForm.hsnCode}
                  onChange={(e) => setItemForm({ ...itemForm, hsnCode: e.target.value })}
                  className="h-9 text-xs mt-1"
                />
              </div>
              <div>
                <Label className="text-xs font-semibold">GST Rate (%)</Label>
                <select
                  value={itemForm.gstRate}
                  onChange={(e) => setItemForm({ ...itemForm, gstRate: e.target.value })}
                  className="w-full h-9 rounded-md border border-input bg-transparent px-3 text-xs mt-1"
                >
                  <option value="0">0%</option>
                  <option value="5">5%</option>
                  <option value="12">12%</option>
                  <option value="18">18%</option>
                  <option value="28">28%</option>
                </select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs font-semibold">Purchase Price (₹)</Label>
                <Input
                  type="number"
                  placeholder="1200"
                  value={itemForm.purchasePrice}
                  onChange={(e) => setItemForm({ ...itemForm, purchasePrice: e.target.value })}
                  className="h-9 text-xs mt-1"
                />
              </div>
              <div>
                <Label className="text-xs font-semibold">Selling Price (₹) *</Label>
                <Input
                  required
                  type="number"
                  placeholder="1800"
                  value={itemForm.sellingPrice}
                  onChange={(e) => setItemForm({ ...itemForm, sellingPrice: e.target.value })}
                  className="h-9 text-xs mt-1 font-bold"
                />
              </div>
            </div>
            <div>
              <Label className="text-xs font-semibold">Opening Stock Quantity</Label>
              <Input
                type="number"
                placeholder="25"
                value={itemForm.openingStock}
                onChange={(e) => setItemForm({ ...itemForm, openingStock: e.target.value })}
                className="h-9 text-xs mt-1"
              />
            </div>
            <DialogFooter className="pt-2">
              <Button type="button" variant="outline" size="sm" onClick={() => setOpenItemModal(false)}>
                Cancel
              </Button>
              <Button type="submit" size="sm" disabled={submitting} className="bg-amber-600 hover:bg-amber-700 text-white">
                {submitting ? "Saving..." : "Save Product Item"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* ─── 5. RECORD PAYMENT MODAL FORM ───────────────────────────── */}
      <Dialog open={openPaymentModal} onOpenChange={setOpenPaymentModal}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold flex items-center gap-2">
              <IndianRupee className="w-5 h-5 text-[#76C043]" /> Record Payment Receipt
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              Record a payment collection from a customer or cash counter.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleRecordPayment} className="space-y-3 mt-2">
            <div>
              <Label className="text-xs font-semibold">Customer / Party Name *</Label>
              <Input
                required
                placeholder="e.g. Reliance Retail Ltd"
                value={paymentForm.partyName}
                onChange={(e) => setPaymentForm({ ...paymentForm, partyName: e.target.value })}
                className="h-9 text-xs mt-1"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs font-semibold">Amount Received (₹) *</Label>
                <Input
                  required
                  type="number"
                  placeholder="50000"
                  value={paymentForm.amount}
                  onChange={(e) => setPaymentForm({ ...paymentForm, amount: e.target.value })}
                  className="h-9 text-xs mt-1 font-bold text-emerald-600"
                />
              </div>
              <div>
                <Label className="text-xs font-semibold">Payment Mode</Label>
                <select
                  value={paymentForm.paymentMode}
                  onChange={(e) => setPaymentForm({ ...paymentForm, paymentMode: e.target.value })}
                  className="w-full h-9 rounded-md border border-input bg-transparent px-3 text-xs mt-1"
                >
                  <option value="Cash Counter">Cash Counter</option>
                  <option value="UPI / PhonePe">UPI / PhonePe / GPay</option>
                  <option value="Bank Transfer">HDFC Bank Transfer</option>
                  <option value="Cheque">Cheque</option>
                </select>
              </div>
            </div>
            <div>
              <Label className="text-xs font-semibold">Reference Notes</Label>
              <Input
                placeholder="e.g. Received via UPI Ref #9823"
                value={paymentForm.notes}
                onChange={(e) => setPaymentForm({ ...paymentForm, notes: e.target.value })}
                className="h-9 text-xs mt-1"
              />
            </div>
            <DialogFooter className="pt-2">
              <Button type="button" variant="outline" size="sm" onClick={() => setOpenPaymentModal(false)}>
                Cancel
              </Button>
              <Button type="submit" size="sm" disabled={submitting} className="bg-[#76C043] hover:bg-emerald-600 text-slate-950 font-bold">
                {submitting ? "Saving..." : "Record Payment Entry"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* ─── PETPOOJA INTERACTIVE DRILLDOWN MODAL ───────────────────────── */}
      <Dialog open={!!activeModal} onOpenChange={() => setActiveModal(null)}>
        <DialogContent className="max-w-3xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold flex items-center gap-2">
              {activeModal === "cash" && <><IndianRupee className="w-6 h-6 text-[#76C043]" /> Cash Payment Transactions Ledger</>}
              {activeModal === "online" && <><CreditCard className="w-6 h-6 text-[#3F63AD]" /> Online & Digital Payment Receipts</>}
              {activeModal === "finance" && <><Wallet className="w-6 h-6 text-amber-600" /> Finance & Credit Ledger (Udhaar)</>}
              {activeModal === "orders" && <><Package className="w-6 h-6 text-purple-600" /> Total Orders & Breakdown</>}
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              Selected Period Filter: <span className="font-bold uppercase text-foreground">{period}</span> · Transaction Audit Log
            </DialogDescription>
          </DialogHeader>

          {/* SEARCH BAR IN MODAL */}
          <div className="relative my-2">
            <Search className="w-4 h-4 absolute left-3 top-3 text-muted-foreground" />
            <Input
              placeholder="Search by customer name or invoice number..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 text-xs h-9"
            />
          </div>

          {/* DRILLDOWN TABLE */}
          <div className="border rounded-xl overflow-hidden mt-2">
            <table className="w-full text-xs text-left">
              <thead className="bg-slate-100 text-slate-700 font-bold border-b">
                <tr>
                  <th className="p-3">Invoice / Ref #</th>
                  <th className="p-3">Customer Name</th>
                  <th className="p-3">Date & Timestamp</th>
                  <th className="p-3">Payment Mode</th>
                  <th className="p-3 text-right">Amount</th>
                  <th className="p-3 text-center">Status</th>
                  <th className="p-3 text-center">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {getFilteredTransactions().length === 0 ? (
                  <tr>
                    <td colSpan={7} className="text-center p-6 text-muted-foreground">
                      No matching transactions found for this filter.
                    </td>
                  </tr>
                ) : (
                  getFilteredTransactions().map((tx: any, idx: number) => (
                    <tr key={idx} className="hover:bg-slate-50 transition-colors">
                      <td
                        className="p-3 font-bold text-[#3F63AD] cursor-pointer hover:underline"
                        onClick={() => handlePrintTrigger(tx)}
                      >
                        {tx.id || tx.invoiceNumber}
                      </td>
                      <td className="p-3 font-medium text-foreground">{tx.customer || tx.customerName}</td>
                      <td className="p-3 text-muted-foreground flex items-center gap-1 mt-1">
                        <Clock className="w-3 h-3 text-slate-400" /> {tx.time || tx.date}
                      </td>
                      <td className="p-3 font-medium">
                        <Badge variant="outline" className="text-[10px]">
                          {tx.mode || tx.paymentTerms || "Cash"}
                        </Badge>
                      </td>
                      <td className="p-3 font-bold text-right text-foreground">
                        {formatCurrency(tx.amount || tx.total)}
                      </td>
                      <td className="p-3 text-center">
                        <StatusBadge status={tx.status} />
                      </td>
                      <td className="p-3 text-center">
                        <div className="flex items-center justify-center gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7"
                            title="Print Invoice"
                            onClick={() => handlePrintTrigger(tx)}
                          >
                            <Printer className="w-3.5 h-3.5 text-[#3F63AD]" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7"
                            title="Send WhatsApp Reminder"
                            onClick={() => alert(`Sending reminder to ${tx.customer || tx.customerName}`)}
                          >
                            <Send className="w-3.5 h-3.5 text-emerald-600" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          <div className="flex items-center justify-between pt-4 border-t mt-4 text-xs">
            <span className="text-muted-foreground font-medium">
              Showing {getFilteredTransactions().length} entries for {period} filter
            </span>
            <Button size="sm" onClick={() => setActiveModal(null)} className="h-8">
              Close Audit
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
