"use client";

import { useState, useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import {
  TrendingUp, TrendingDown, DollarSign, ShoppingCart, Package,
  Users, AlertTriangle, ArrowRight, Eye, MoreHorizontal,
  IndianRupee, Receipt, Wallet, CreditCard, Activity,
  Star, Sparkles, Calendar, Clock, CheckCircle2, Search,
  X, Filter, ExternalLink, Printer, Send, ShieldAlert, Plus, FileText, Download, Trash2, Building, Building2, UserCheck, Tv, Smartphone, Laptop, Fan, HardDrive, Headphones, BarChart3, PieChart as PieChartIcon, ArrowUpRight, MessageCircle
} from "lucide-react";
import {
  AreaChart, Area, BarChart, Bar, LineChart, Line, PieChart, Pie, Cell,
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
import { cn, formatCurrency, indianNumberFormat, formatDateShort } from "@/lib/utils";
import ValueplusInvoice from "@/app/invoice/page";
import { InvoiceCreationModal } from "@/components/InvoiceCreationModal";
import { DateRangeFilter, resolveDateRange } from "@/components/shared/date-range-filter";
import { Skeleton, MetricCardsShimmer, TableShimmer, ChartShimmer, DistributionShimmer } from "@/components/shared/shimmer-skeleton";



// ─── DUMMY DATA FOR CHARTS ────────────────────────────────────
const BASE_PAYMENT_MODES = [
  { name: "Cash", value: 222789, color: "#76C043" },
  { name: "UPI/Online", value: 316111, color: "#3F63AD" },
  { name: "Finance", value: 176989, color: "#F59E0B" },
];

const BASE_DAILY_REVENUE = [
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
    const total = payload.reduce((acc, curr) => acc + (curr.value || 0), 0);
    return (
      <div className="bg-[#1B2537]/95 backdrop-blur-md border border-white/20 rounded-xl shadow-2xl p-3.5 text-xs text-white min-w-[210px] space-y-2">
        <div className="flex items-center justify-between pb-1.5 border-b border-white/10">
          <span className="font-bold text-slate-300">{label}</span>
          <span className="font-mono font-extrabold text-[#76C043]">{formatCurrency(total)}</span>
        </div>
        <div className="space-y-1.5">
          {payload.map((entry) => (
            <div key={entry.name} className="flex items-center justify-between gap-4">
              <div className="flex items-center gap-2">
                <div className="w-2.5 h-2.5 rounded-full shadow-sm" style={{ backgroundColor: entry.color }} />
                <span className="text-slate-300 capitalize">{entry.name}</span>
              </div>
              <span className="font-mono font-bold text-slate-100">{formatCurrency(entry.value)}</span>
            </div>
          ))}
        </div>
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
  const [dateFilter, setDateFilter] = useState("Today");
  const [startDate, setStartDate] = useState(() => new Date().toISOString().split("T")[0]);
  const [endDate, setEndDate] = useState(() => new Date().toISOString().split("T")[0]);

  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<any>(null);

  // Widget specific states
  const [widgetFilters, setWidgetFilters] = useState({
    trends: "Today",
    pie: "Today",
    expenses: "Today",
    products: "Today",
    customers: "Today",
    logs: "Today",
    recent: "Today"
  });
  const [widgetData, setWidgetData] = useState<any>({});
  const [widgetLoading, setWidgetLoading] = useState({
    trends: false,
    pie: false,
    expenses: false,
    products: false,
    customers: false,
    logs: false,
    recent: false
  });

  // Drilldown Modal State
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

  const fetchStats = async (startOverride?: string, endOverride?: string) => {
    const s = startOverride || startDate;
    const e = endOverride || endDate;
    setLoading(true);
    try {
      const res = await fetch(`/api/dashboard/stats?startDate=${s}&endDate=${e}`);
      const json = await res.json();
      if (json.success) {
        setData(json);
        // Hydrate all widgets simultaneously in 1 shot!
        setWidgetData({
          trends: json,
          pie: json,
          expenses: json,
          products: json,
          customers: json,
          logs: json,
          recent: json,
        });
      }
    } catch (err) {
      console.error("Dashboard fetch error:", err);
    } finally {
      setLoading(false);
    }
  };

  const fetchWidgetData = async (widgetName: string, filterValue: string, customStart?: string, customEnd?: string) => {
    setWidgetLoading(prev => ({ ...prev, [widgetName]: true }));
    try {
      const { start, end } = resolveDateRange(filterValue, customStart, customEnd);
      const res = await fetch(`/api/dashboard/stats?startDate=${start}&endDate=${end}`);
      const json = await res.json();
      if (json.success) {
        setWidgetData((prev: any) => ({ ...prev, [widgetName]: json }));
      }
    } catch (err) {
      console.error(`Error fetching widget ${widgetName}:`, err);
    } finally {
      setWidgetLoading(prev => ({ ...prev, [widgetName]: false }));
    }
  };

  const refreshAllDashboard = () => {
    fetchStats();
  };

  useEffect(() => {
    fetchStats();

    const handleSync = () => {
      refreshAllDashboard();
    };
    if (typeof window !== "undefined") {
      window.addEventListener("erp-invoice-created", handleSync);
      window.addEventListener("erp-purchase-created", handleSync);
    }
    return () => {
      if (typeof window !== "undefined") {
        window.removeEventListener("erp-invoice-created", handleSync);
        window.removeEventListener("erp-purchase-created", handleSync);
      }
    };
  }, []);

  const handleWidgetFilterChange = (widgetName: string, val: string, customStart?: string, customEnd?: string) => {
    setWidgetFilters(prev => ({ ...prev, [widgetName]: val }));
    fetchWidgetData(widgetName, val, customStart, customEnd);
  };

  const handleUniversalFilterChange = (val: string, customStart?: string, customEnd?: string) => {
    setDateFilter(val);
    let s = startDate;
    let e = endDate;
    if (val === "Custom Date" && customStart && customEnd) {
      s = customStart;
      e = customEnd;
      setStartDate(customStart);
      setEndDate(customEnd);
    } else if (val !== "Custom Date") {
      const resolved = resolveDateRange(val);
      s = resolved.start;
      e = resolved.end;
      setStartDate(s);
      setEndDate(e);
    }
    const newFilters = {
      trends: val,
      pie: val,
      expenses: val,
      products: val,
      customers: val,
      logs: val,
      recent: val
    };
    setWidgetFilters(newFilters);
    fetchStats(s, e);
  };

  useEffect(() => {
    const today = new Date();
    today.setHours(23, 59, 59, 999);
    
    if (dateFilter === "Today") {
      setStartDate(new Date().toISOString().split("T")[0]);
      setEndDate(new Date().toISOString().split("T")[0]);
    } else if (dateFilter === "Yesterday") {
      const y = new Date();
      y.setDate(y.getDate() - 1);
      setStartDate(y.toISOString().split("T")[0]);
      setEndDate(y.toISOString().split("T")[0]);
    } else if (dateFilter === "Last 7 Days") {
      const d = new Date();
      d.setDate(d.getDate() - 7);
      setStartDate(d.toISOString().split("T")[0]);
      setEndDate(new Date().toISOString().split("T")[0]);
    } else if (dateFilter === "This Month") {
      const d = new Date();
      d.setDate(1);
      setStartDate(d.toISOString().split("T")[0]);
      setEndDate(new Date().toISOString().split("T")[0]);
    } else if (dateFilter === "Last Month") {
      const d = new Date();
      d.setMonth(d.getMonth() - 1);
      d.setDate(1);
      const endD = new Date(d.getFullYear(), d.getMonth() + 1, 0);
      setStartDate(d.toISOString().split("T")[0]);
      setEndDate(endD.toISOString().split("T")[0]);
    } else if (dateFilter === "Last 3 Months") {
      const d = new Date();
      d.setMonth(d.getMonth() - 3);
      setStartDate(d.toISOString().split("T")[0]);
      setEndDate(new Date().toISOString().split("T")[0]);
    } else if (dateFilter === "Last Year") {
      const d = new Date();
      d.setFullYear(d.getFullYear() - 1);
      setStartDate(d.toISOString().split("T")[0]);
      setEndDate(new Date().toISOString().split("T")[0]);
    }
  }, [dateFilter]);

  useEffect(() => {
    fetchStats();
  }, [startDate, endDate]);

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
        refreshAllDashboard();
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
        refreshAllDashboard();
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
        refreshAllDashboard();
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
        refreshAllDashboard();
      }
    } catch (err) {
      console.error(err);
    } finally {
      setSubmitting(false);
    }
  };

  // Derived metrics based on real API data
  const metrics = data?.metrics || {
    totalRevenue: 0,
    cashRevenue: 0,
    onlineRevenue: 0,
    financeRevenue: 0,
    totalOrders: 0,
    pendingOrders: 0,
    lowStockItems: 0,
  };

  const PAYMENT_MODES = [
    { name: "Cash", value: metrics.cashRevenue || 0, color: "#76C043" },
    { name: "UPI/Online", value: metrics.onlineRevenue || 0, color: "#3F63AD" },
    { name: "Finance", value: metrics.financeRevenue || 0, color: "#F59E0B" },
  ];

  const DAILY_REVENUE = data?.dailyRevenue || [];

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
      <div className="flex flex-col xl:flex-row gap-4 items-start xl:items-center justify-between bg-white px-6 py-4 rounded-[8px] border border-slate-200 shadow-[0_1px_2px_rgba(0,0,0,0.05)]">
        <div className="flex items-center gap-4 flex-1">
          <div className="min-w-0">
            <h1 className="text-xl font-bold text-slate-800 tracking-tight">
              Business Overview
            </h1>
          </div>
        </div>

        {/* UNIVERSAL TIME FILTER */}
        <div className="flex flex-col sm:flex-row items-center gap-3 w-full xl:w-auto mt-2 xl:mt-0">
          <DateRangeFilter 
            value={dateFilter} 
            onChange={handleUniversalFilterChange} 
            showIcon={true} 
            className="w-[180px] h-9" 
          />
        </div>

        {/* HEADER QUICK BUTTONS */}
        <div className="flex flex-col sm:flex-row items-center gap-3 w-full xl:w-auto mt-2 xl:mt-0 border-l pl-4 border-slate-200">
          <Button onClick={handleOpenInvoiceModal} className="h-9 px-5 rounded-[4px] font-bold bg-[#76C043] hover:bg-[#60a82c] text-white shadow-sm transition-all w-full sm:w-auto border-none">
            <Receipt className="w-4 h-4 mr-2" /> New Bill
          </Button>
        </div>
      </div>

      <div className="page-content space-y-6 mt-6">
        {/* ─── PAYMENT & SALES BREAKDOWN CARDS (CLICKABLE) ───────────────── */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-bold text-foreground uppercase tracking-wider flex items-center gap-2">
              <CreditCard className="w-4 h-4 text-[#3F63AD]" /> Key Business Metrics
            </h2>
            <span className="text-xs text-muted-foreground font-medium">Click any card to open detailed transaction ledger</span>
          </div>

          <div className="w-full">
            {loading ? (
              <MetricCardsShimmer count={4} />
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <>
                {/* GROSS SALES CARD */}
                <div
                  onClick={() => router.push(`/dashboard/reports?type=all&dateFilter=${dateFilter}`)}
                  className="bg-white rounded-[8px] border border-slate-200 shadow-[0_1px_2px_rgba(0,0,0,0.05)] p-4 cursor-pointer hover:border-[#76C043] hover:shadow-lg hover:-translate-y-1 transition-all duration-300 flex flex-col justify-between"
                >
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Gross Sales</span>
                    <IndianRupee className="w-5 h-5 text-slate-400" />
                  </div>
                  <div className="mb-2">
                    <p className="text-[26px] leading-none font-bold text-slate-900">
                      {formatCurrency(metrics.cashRevenue + metrics.onlineRevenue + metrics.financeRevenue)}
                    </p>
                  </div>
                  <div className="flex items-center justify-between mt-auto pt-3 border-t border-slate-100">
                    <span className="text-[11px] font-semibold text-emerald-600 flex items-center gap-1">
                      <TrendingUp className="w-3 h-3" /> +12.4% vs last week
                    </span>
                    <ArrowRight className="w-3 h-3 text-slate-300" />
                  </div>
                </div>

                {/* TOTAL BILLS CARD */}
                <div
                  onClick={() => router.push(`/dashboard/reports?type=orders&dateFilter=${dateFilter}`)}
                  className="bg-white rounded-[8px] border border-slate-200 shadow-[0_1px_2px_rgba(0,0,0,0.05)] p-4 cursor-pointer hover:border-blue-500 hover:shadow-lg hover:-translate-y-1 transition-all duration-300 flex flex-col justify-between"
                >
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Total Bills</span>
                    <Receipt className="w-5 h-5 text-slate-400" />
                  </div>
                  <div className="mb-2">
                    <p className="text-[26px] leading-none font-bold text-slate-900">
                      {metrics.totalOrders || 0}
                    </p>
                  </div>
                  <div className="flex items-center justify-between mt-auto pt-3 border-t border-slate-100">
                    <span className="text-[11px] font-semibold text-amber-500 flex items-center gap-1">
                      <Clock className="w-3 h-3" /> Peak hours: 1PM - 3PM
                    </span>
                    <ArrowRight className="w-3 h-3 text-slate-300" />
                  </div>
                </div>

                {/* AOV CARD */}
                <div
                  onClick={() => router.push(`/dashboard/reports?type=aov&dateFilter=${dateFilter}`)}
                  className="bg-white rounded-[8px] border border-slate-200 shadow-[0_1px_2px_rgba(0,0,0,0.05)] p-4 cursor-pointer hover:border-indigo-500 hover:shadow-lg hover:-translate-y-1 transition-all duration-300 flex flex-col justify-between"
                >
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Avg Order Value (AOV)</span>
                    <TrendingUp className="w-5 h-5 text-slate-400" />
                  </div>
                  <div className="mb-2">
                    <p className="text-[26px] leading-none font-bold text-slate-900">
                      {formatCurrency(metrics.totalOrders ? ((metrics.cashRevenue + metrics.onlineRevenue + metrics.financeRevenue) / metrics.totalOrders) : 0)}
                    </p>
                  </div>
                  <div className="flex items-center justify-between mt-auto pt-3 border-t border-slate-100">
                    <span className="text-[11px] font-medium text-slate-500 flex items-center gap-1">
                      Revenue per invoice
                    </span>
                    <ArrowRight className="w-3 h-3 text-slate-300" />
                  </div>
                </div>

                {/* LOW STOCK CARD */}
                <div
                  onClick={() => router.push(`/inventory/low-stock`)}
                  className="bg-white rounded-[8px] border border-slate-200 shadow-[0_1px_2px_rgba(0,0,0,0.05)] p-4 cursor-pointer hover:border-rose-500 hover:shadow-lg hover:-translate-y-1 transition-all duration-300 flex flex-col justify-between"
                >
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Low Stock Alerts</span>
                    <Package className="w-5 h-5 text-slate-400" />
                  </div>
                  <div className="mb-2">
                    <p className="text-[26px] leading-none font-bold text-rose-500">
                      {metrics.lowStockItems || 0}
                    </p>
                  </div>
                  <div className="flex items-center justify-between mt-auto pt-3 border-t border-slate-100">
                    <span className="text-[11px] font-semibold text-rose-500 flex items-center gap-1">
                      <ShieldAlert className="w-3 h-3" /> Requires attention
                    </span>
                    <ArrowRight className="w-3 h-3 text-slate-300" />
                  </div>
                </div>
              </>
              </div>
            )}
          </div>
        </div>

        {/* ─── SALES & PAYMENT CHARTS (PETPOOJA STYLE) ──────────────────────────────────── */}
        <div className="grid lg:grid-cols-3 gap-6 mt-6">
          <div className="lg:col-span-2 bg-white rounded-[12px] shadow-[0_2px_8px_rgba(0,0,0,0.06)] hover:shadow-xl transition-all duration-300 border border-slate-200 p-6 flex flex-col justify-between">
            {/* Header with Live Stats Pills */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6 pb-4 border-b border-slate-100">
              <div>
                <div className="flex items-center gap-2.5">
                  <h3 className="font-extrabold text-slate-900 text-lg tracking-tight">Sales & Order Trends</h3>
                  <span className="px-2.5 py-0.5 rounded-full bg-blue-50 text-[#3F63AD] border border-blue-200 text-xs font-bold font-mono">
                    {formatCurrency(
                      ((widgetData.trends?.metrics?.cashRevenue || 0) + (widgetData.trends?.metrics?.onlineRevenue || 0) + (widgetData.trends?.metrics?.financeRevenue || 0)) || (widgetData.trends?.dailyRevenue?.reduce((acc: number, curr: any) => acc + (curr.revenue || 0), 0) || 0)
                    )} Total
                  </span>
                </div>
                <p className="text-xs text-slate-500 mt-1 flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5 text-slate-400" />
                  {widgetFilters.trends === 'Today' ? 'Hourly Business Trajectory' : 'Daily Sales Timeline'}
                </p>
              </div>

              <div className="flex items-center gap-2.5">
                {/* Live Mode Badges */}
                <div className="hidden md:flex items-center gap-2 text-[11px] font-semibold">
                  <span className="px-2 py-1 rounded-md bg-emerald-50 text-emerald-700 border border-emerald-200 flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-[#76C043]" />
                    Cash: {formatCurrency(widgetData.trends?.metrics?.cashRevenue || 0)}
                  </span>
                  <span className="px-2 py-1 rounded-md bg-blue-50 text-[#3F63AD] border border-blue-200 flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-[#3F63AD]" />
                    Online: {formatCurrency(widgetData.trends?.metrics?.onlineRevenue || 0)}
                  </span>
                  <span className="px-2 py-1 rounded-md bg-amber-50 text-amber-700 border border-amber-200 flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-[#F59E0B]" />
                    Finance: {formatCurrency(widgetData.trends?.metrics?.financeRevenue || 0)}
                  </span>
                </div>

                <DateRangeFilter 
                  value={widgetFilters.trends} 
                  onChange={(val, start, end) => handleWidgetFilterChange('trends', val, start, end)}
                  className="w-[125px]"
                />
              </div>
            </div>

            {widgetLoading.trends ? (
              <div className="w-full h-[260px] flex items-end justify-between px-4 animate-pulse pt-10">
                {Array.from({ length: 8 }).map((_, i) => (
                  <div key={i} className="w-[8%] bg-slate-200 rounded-t-sm" style={{ height: `${Math.random() * 60 + 20}%` }}></div>
                ))}
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={260}>
                <AreaChart data={widgetData.trends?.dailyRevenue || []} margin={{ top: 10, right: 10, left: -5, bottom: 0 }}>
                  <defs>
                    <linearGradient id="colorCash" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#76C043" stopOpacity={0.3}/>
                      <stop offset="95%" stopColor="#76C043" stopOpacity={0}/>
                    </linearGradient>
                    <linearGradient id="colorOnline" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#3F63AD" stopOpacity={0.3}/>
                      <stop offset="95%" stopColor="#3F63AD" stopOpacity={0}/>
                    </linearGradient>
                    <linearGradient id="colorFinance" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#F59E0B" stopOpacity={0.3}/>
                      <stop offset="95%" stopColor="#F59E0B" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" vertical={false} />
                  <XAxis dataKey="date" tick={{ fontSize: 11, fill: "#64748B", fontWeight: 500 }} axisLine={false} tickLine={false} />
                  <YAxis yAxisId="left" tick={{ fontSize: 11, fill: "#64748B", fontWeight: 500 }} axisLine={false} tickLine={false} tickFormatter={(v) => `₹${(v / 1000).toFixed(0)}k`} />
                  <Tooltip content={<CustomTooltip />} />
                  <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 11, paddingTop: '12px', fontWeight: 600 }} />
                  <Area yAxisId="left" type="monotone" dataKey="cash" name="Cash (₹)" stroke="#76C043" strokeWidth={3} fillOpacity={1} fill="url(#colorCash)" dot={{ r: 4, stroke: "#76C043", strokeWidth: 2, fill: "#fff" }} activeDot={{ r: 6, stroke: "#76C043", strokeWidth: 2, fill: "#fff" }} />
                  <Area yAxisId="left" type="monotone" dataKey="online" name="Online (₹)" stroke="#3F63AD" strokeWidth={3} fillOpacity={1} fill="url(#colorOnline)" dot={{ r: 4, stroke: "#3F63AD", strokeWidth: 2, fill: "#fff" }} activeDot={{ r: 6, stroke: "#3F63AD", strokeWidth: 2, fill: "#fff" }} />
                  <Area yAxisId="left" type="monotone" dataKey="finance" name="Finance (₹)" stroke="#F59E0B" strokeWidth={3} fillOpacity={1} fill="url(#colorFinance)" dot={{ r: 4, stroke: "#F59E0B", strokeWidth: 2, fill: "#fff" }} activeDot={{ r: 6, stroke: "#F59E0B", strokeWidth: 2, fill: "#fff" }} />
                </AreaChart>
              </ResponsiveContainer>
            )}
          </div>

          {/* PAYMENT MODE BREAKDOWN */}
          <div className="bg-white rounded-[12px] shadow-[0_2px_8px_rgba(0,0,0,0.06)] hover:shadow-xl transition-all duration-300 border border-slate-200 p-6 flex flex-col justify-between">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-bold text-slate-800 text-base flex items-center gap-2">
                <PieChartIcon className="w-4 h-4 text-slate-500" /> Payment Modes
              </h3>
              <DateRangeFilter 
                value={widgetFilters.pie} 
                onChange={(val, start, end) => handleWidgetFilterChange('pie', val, start, end)}
                className="w-[120px]"
              />
            </div>
            {widgetLoading.pie ? (
              <div className="flex flex-col items-center justify-center animate-pulse py-4">
                <div className="w-[140px] h-[140px] rounded-full border-[20px] border-slate-200"></div>
                <div className="w-full space-y-3 mt-8">
                  {Array.from({ length: 3 }).map((_, i) => (
                    <div key={i} className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className="w-3 h-3 rounded-full bg-slate-200"></div>
                        <div className="h-3 w-20 bg-slate-200 rounded"></div>
                      </div>
                      <div className="h-3 w-16 bg-slate-200 rounded"></div>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              (() => {
                const pieMetrics = widgetData.pie?.metrics || { cashRevenue: 0, onlineRevenue: 0, financeRevenue: 0 };
                const pieModes = [
                  { name: "Cash Counter", value: pieMetrics.cashRevenue || 0, color: "#76C043" },
                  { name: "Online / UPI", value: pieMetrics.onlineRevenue || 0, color: "#3F63AD" },
                  { name: "Finance", value: pieMetrics.financeRevenue || 0, color: "#F59E0B" },
                ];
                return (
              <>
                <ResponsiveContainer width="100%" height={180}>
                  <PieChart>
                    <Pie data={pieModes} cx="50%" cy="50%" innerRadius={55} outerRadius={80} paddingAngle={2} dataKey="value">
                      {pieModes.map((entry, i) => {
                        const mapMode = entry.name === "Cash Counter" ? "cash" : entry.name === "Online / UPI" ? "online" : "finance";
                        return (
                          <Cell 
                            key={i} 
                            fill={entry.color} 
                            className="cursor-pointer hover:opacity-80 transition-opacity"
                            onClick={() => router.push(`/dashboard/reports?type=${mapMode}&dateFilter=${dateFilter}`)} 
                          />
                        );
                      })}
                    </Pie>
                    <Tooltip formatter={(v: number) => [`₹${indianNumberFormat(v)}`, ""]} />
                  </PieChart>
                </ResponsiveContainer>
                <div className="space-y-3 mt-4">
                  {pieModes.map((item) => {
                    const mapMode = item.name === "Cash Counter" ? "cash" : item.name === "Online / UPI" ? "online" : "finance";
                    return (
                      <div 
                        key={item.name} 
                        className="flex items-center justify-between text-xs cursor-pointer hover:bg-slate-50 p-2 rounded-lg transition-colors"
                        onClick={() => router.push(`/dashboard/reports?type=${mapMode}&dateFilter=${widgetFilters.pie}`)}
                      >
                        <div className="flex items-center gap-2">
                          <div className="w-3 h-3 rounded-full" style={{ backgroundColor: item.color }} />
                          <span className="text-slate-700 font-medium">{item.name}</span>
                        </div>
                        <span className="font-bold text-slate-900">₹{indianNumberFormat(item.value)}</span>
                      </div>
                    );
                  })}
                </div>
              </>
                );
              })()
            )}
          </div>
        </div>

        {/* ─── SHOWROOM OPERATING EXPENSES SECTION (NEW) ──────────────────── */}
        <div className="bg-white rounded-[12px] shadow-[0_2px_8px_rgba(0,0,0,0.06)] hover:shadow-xl transition-all duration-300 border border-slate-200 p-6 mt-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6 pb-4 border-b border-slate-100">
            <div>
              <div className="flex items-center gap-2.5">
                <h3 className="font-extrabold text-slate-900 text-lg tracking-tight flex items-center gap-2">
                  <Receipt className="w-5 h-5 text-rose-600" /> Showroom Operating Expenses
                </h3>
                <span className="px-2.5 py-0.5 rounded-full bg-rose-50 text-rose-700 border border-rose-200 text-xs font-bold font-mono">
                  {formatCurrency(widgetData.expenses?.expenses?.total || widgetData.expenses?.metrics?.totalExpenses || 0)} Total
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-1 flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5 text-slate-400" />
                Store rent, staff payroll, electricity, freight & operational overheads
              </p>
            </div>

            <div className="flex items-center gap-2.5">
              <DateRangeFilter 
                value={widgetFilters.expenses} 
                onChange={(val, start, end) => handleWidgetFilterChange('expenses', val, start, end)}
                className="w-[125px]"
              />
              <Button 
                variant="outline" 
                size="sm" 
                onClick={() => router.push(`/purchase/expenses?dateFilter=${widgetFilters.expenses}`)}
                className="text-xs h-8 font-bold text-rose-600 border-rose-200 hover:bg-rose-50 hover:text-rose-700"
              >
                Detailed Report <ArrowRight className="w-3.5 h-3.5 ml-1" />
              </Button>
              <Button 
                size="sm" 
                onClick={() => router.push("/purchase/expenses")} 
                className="bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs h-8 shadow-sm"
              >
                + Add Expense
              </Button>
            </div>
          </div>

          <div className="grid lg:grid-cols-3 gap-6">
            {/* Category Breakdown */}
            <div className="lg:col-span-1 border-r border-slate-100 pr-0 lg:pr-6 space-y-4">
              <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider">Expense Distribution by Category</h4>
              {widgetLoading.expenses ? (
                <div className="space-y-3 animate-pulse">
                  {Array.from({ length: 4 }).map((_, i) => (
                    <div key={i} className="space-y-1">
                      <div className="h-3 w-24 bg-slate-200 rounded"></div>
                      <div className="h-2 w-full bg-slate-200 rounded"></div>
                    </div>
                  ))}
                </div>
              ) : (
                (() => {
                  const categories = widgetData.expenses?.expenses?.categories || [];
                  if (categories.length === 0) {
                    return <p className="text-xs text-slate-400 py-6">No categorized expenses recorded for this timeframe.</p>;
                  }
                  return (
                    <div className="space-y-3.5">
                      {categories.slice(0, 5).map((cat: any, i: number) => {
                        const colors = ["bg-rose-500", "bg-amber-500", "bg-blue-500", "bg-purple-500", "bg-emerald-500"];
                        const color = colors[i % colors.length];
                        return (
                          <div key={cat.category} className="space-y-1.5">
                            <div className="flex items-center justify-between text-xs font-semibold">
                              <span className="text-slate-700">{cat.category}</span>
                              <span className="font-mono text-slate-900">{formatCurrency(cat.amount)} ({cat.percentage}%)</span>
                            </div>
                            <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                              <div className={`h-full ${color} rounded-full transition-all duration-500`} style={{ width: `${cat.percentage}%` }} />
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  );
                })()
              )}
            </div>

            {/* Recent Expenses List */}
            <div className="lg:col-span-2 space-y-3">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider">Recent Expense Vouchers</h4>
                <span className="text-[11px] text-muted-foreground">Showing latest transactions</span>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-xs text-left">
                  <thead className="bg-slate-50 text-slate-500 font-semibold uppercase border-b border-slate-200">
                    <tr>
                      <th className="px-3 py-2.5">Date</th>
                      <th className="px-3 py-2.5">Voucher #</th>
                      <th className="px-3 py-2.5">Category</th>
                      <th className="px-3 py-2.5">Description</th>
                      <th className="px-3 py-2.5">Payment</th>
                      <th className="px-3 py-2.5 text-right">Amount</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {widgetLoading.expenses ? (
                      Array.from({ length: 4 }).map((_, i) => (
                        <tr key={i} className="animate-pulse">
                          <td className="px-3 py-2.5"><div className="h-3 w-16 bg-slate-200 rounded"></div></td>
                          <td className="px-3 py-2.5"><div className="h-3 w-20 bg-slate-200 rounded"></div></td>
                          <td className="px-3 py-2.5"><div className="h-3 w-24 bg-slate-200 rounded"></div></td>
                          <td className="px-3 py-2.5"><div className="h-3 w-32 bg-slate-200 rounded"></div></td>
                          <td className="px-3 py-2.5"><div className="h-3 w-16 bg-slate-200 rounded"></div></td>
                          <td className="px-3 py-2.5"><div className="h-3 w-16 bg-slate-200 rounded ml-auto"></div></td>
                        </tr>
                      ))
                    ) : (
                      (() => {
                        const recent = widgetData.expenses?.expenses?.recent || [];
                        if (recent.length === 0) {
                          return (
                            <tr>
                              <td colSpan={6} className="px-3 py-8 text-center text-slate-400 font-medium">
                                No expenses logged for this timeframe
                              </td>
                            </tr>
                          );
                        }
                        return recent.slice(0, 5).map((exp: any) => (
                          <tr key={exp._id || exp.expenseNo} className="hover:bg-slate-50/80 transition-colors">
                            <td className="px-3 py-2.5 text-slate-500 whitespace-nowrap">{formatDateShort(exp.date || exp.createdAt)}</td>
                            <td className="px-3 py-2.5 font-bold text-slate-700">{exp.expenseNo}</td>
                            <td className="px-3 py-2.5">
                              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-50 text-rose-700 border border-rose-200 whitespace-nowrap">
                                {exp.category}
                              </span>
                            </td>
                            <td className="px-3 py-2.5 text-slate-600 max-w-[200px] truncate">{exp.description || "-"}</td>
                            <td className="px-3 py-2.5 text-slate-500">{exp.paymentMode || "Cash"}</td>
                            <td className="px-3 py-2.5 text-right font-bold text-rose-600 font-mono">{formatCurrency(exp.amount)}</td>
                          </tr>
                        ));
                      })()
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>

        {/* ─── TOP PRODUCTS & TOP CUSTOMERS ─────────────────────────────── */}
        <div className="grid lg:grid-cols-2 gap-6 mt-6">
          <div className="bg-white rounded-[8px] shadow-[0_1px_2px_rgba(0,0,0,0.05)] hover:shadow-lg hover:-translate-y-1 transition-all duration-300 border border-slate-200 p-5">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-bold text-foreground text-base">Top Selling Products</h3>
              <div className="flex items-center gap-2">
                <DateRangeFilter 
                  value={widgetFilters.products} 
                  onChange={(val, start, end) => handleWidgetFilterChange('products', val, start, end)}
                  className="w-[120px]"
                />
                <Button variant="ghost" size="sm" onClick={() => router.push("/masters/items")} className="text-[#3F63AD] h-8 text-xs px-2 hidden sm:flex">
                  View <ArrowRight className="w-3 h-3 ml-1" />
                </Button>
              </div>
            </div>
            <div className="space-y-3">
              {widgetLoading.products ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <div key={i} className="flex items-center justify-between p-2.5 rounded-xl border border-transparent animate-pulse">
                    <div className="flex items-center gap-3">
                      <div className="w-7 h-7 rounded-lg bg-slate-200"></div>
                      <div className="space-y-1">
                        <div className="h-3 w-24 bg-slate-200 rounded"></div>
                        <div className="h-2 w-16 bg-slate-200 rounded"></div>
                      </div>
                    </div>
                    <div className="text-right space-y-1">
                      <div className="h-3 w-16 bg-slate-200 rounded ml-auto"></div>
                      <div className="h-2 w-12 bg-slate-200 rounded ml-auto"></div>
                    </div>
                  </div>
                ))
              ) : (
                (widgetData.products?.topProducts || TOP_PRODUCTS).map((prod: any, i: number) => (
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
                ))
              )}
            </div>
          </div>

          <div className="bg-white rounded-[8px] shadow-[0_1px_2px_rgba(0,0,0,0.05)] hover:shadow-lg hover:-translate-y-1 transition-all duration-300 border border-slate-200 p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-bold text-foreground text-base">Top Purchasing Customers</h3>
              <div className="flex items-center gap-2">
                <DateRangeFilter 
                  value={widgetFilters.customers} 
                  onChange={(val, start, end) => handleWidgetFilterChange('customers', val, start, end)}
                  className="w-[120px]"
                />
                <Button variant="ghost" size="sm" onClick={() => setOpenCustomerModal(true)} className="text-[#3F63AD] h-8 text-xs px-2 hidden sm:flex">
                  + New <Plus className="w-3 h-3 ml-1" />
                </Button>
              </div>
            </div>
            <div className="space-y-3">
              {widgetLoading.customers ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <div key={i} className="flex items-center justify-between p-2.5 rounded-xl border border-transparent animate-pulse">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-xl bg-slate-200"></div>
                      <div className="space-y-1">
                        <div className="h-3 w-24 bg-slate-200 rounded"></div>
                        <div className="h-2 w-20 bg-slate-200 rounded"></div>
                      </div>
                    </div>
                    <div className="text-right space-y-1">
                      <div className="h-3 w-16 bg-slate-200 rounded ml-auto"></div>
                      <div className="h-3 w-12 bg-slate-200 rounded ml-auto"></div>
                    </div>
                  </div>
                ))
              ) : (
                (widgetData.customers?.topCustomers || TOP_CUSTOMERS).map((cust: any) => (
                  <div key={cust.name} className="flex items-center justify-between p-2.5 rounded-xl hover:bg-slate-50 transition-colors border border-transparent hover:border-slate-200">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-[#3F63AD] to-[#2E4F95] text-white font-bold text-xs flex items-center justify-center uppercase">
                        {cust.name.charAt(0)}
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-foreground">{cust.name}</p>
                        <p className="text-xs text-muted-foreground">{cust.city || "Mumbai"} · {cust.invoices} invoices</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-bold text-foreground">{formatCurrency(cust.amount)}</p>
                      <Badge variant="success" className="text-[10px]">Active Ledger</Badge>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        {/* ─── DETAILED PAYMENT LOG REPORT ─────────────────────────────────────── */}
        <div className="bg-white rounded-[8px] shadow-[0_1px_2px_rgba(0,0,0,0.05)] hover:shadow-lg hover:-translate-y-1 transition-all duration-300 border border-slate-200 mt-6">
          <div className="flex items-center justify-between p-5 border-b border-slate-200">
            <div>
              <h3 className="font-bold text-slate-800 text-base">Detailed Payment Log Report</h3>
              <p className="text-[11px] text-slate-500 mt-0.5">Real-time log of all received payments</p>
            </div>
            <div className="flex items-center gap-2">
              <DateRangeFilter 
                value={widgetFilters.logs} 
                onChange={(val, start, end) => handleWidgetFilterChange('logs', val, start, end)}
                className="w-[120px]"
              />
              <Button size="sm" variant="outline" className="text-xs h-8 hidden sm:flex" onClick={() => router.push(`/dashboard/reports?type=all&dateFilter=${widgetFilters.logs}`)}>
                <Eye className="w-3 h-3 mr-1" /> View Full Report
              </Button>
            </div>
          </div>
          <div className="p-0 overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="bg-slate-50 text-slate-500 font-semibold text-xs uppercase border-b border-slate-200">
                <tr>
                  <th className="px-5 py-3">Time</th>
                  <th className="px-5 py-3">Invoice #</th>
                  <th className="px-5 py-3">Customer</th>
                  <th className="px-5 py-3">Payment Mode</th>
                  <th className="px-5 py-3 text-right">Amount</th>
                  <th className="px-5 py-3 text-center">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {widgetLoading.logs ? (
                  Array.from({ length: 5 }).map((_, i) => (
                    <tr key={i} className="animate-pulse">
                      <td className="px-5 py-4"><div className="h-3 w-20 bg-slate-200 rounded"></div></td>
                      <td className="px-5 py-4"><div className="h-3 w-24 bg-slate-200 rounded"></div></td>
                      <td className="px-5 py-4"><div className="h-3 w-32 bg-slate-200 rounded"></div></td>
                      <td className="px-5 py-4"><div className="h-4 w-16 bg-slate-200 rounded"></div></td>
                      <td className="px-5 py-4"><div className="h-3 w-20 bg-slate-200 rounded ml-auto"></div></td>
                      <td className="px-5 py-4"><div className="h-6 w-16 bg-slate-200 rounded mx-auto"></div></td>
                    </tr>
                  ))
                ) : (
                  (() => {
                    const txns = widgetData.logs?.transactions || { cash: [], online: [], finance: [] };
                    const combined = [...(txns.cash || []), ...(txns.online || []), ...(txns.finance || [])]
                      .sort((a, b) => new Date(b.time).getTime() - new Date(a.time).getTime())
                      .slice(0, 10);
                    return (
                  <>
                    {combined.map((txn: any, i) => (
                      <tr key={i} className="hover:bg-slate-50 transition-colors">
                        <td className="px-5 py-3 text-xs text-slate-500 whitespace-nowrap">{txn.time}</td>
                        <td className="px-5 py-3 font-semibold text-slate-700">{txn.id}</td>
                        <td className="px-5 py-3 font-medium">{txn.customer}</td>
                        <td className="px-5 py-3">
                          <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-slate-100 text-slate-600 whitespace-nowrap">
                            {txn.mode}
                          </span>
                        </td>
                        <td className="px-5 py-3 text-right font-bold text-slate-900">{formatCurrency(txn.amount)}</td>
                        <td className="px-5 py-3">
                          <div className="flex items-center justify-center gap-2">
                            <Button size="icon" variant="ghost" className="h-7 w-7 text-slate-400 hover:text-[#3F63AD] hover:bg-[#3F63AD]/10" onClick={() => window.print()}>
                              <Printer className="w-3.5 h-3.5" />
                            </Button>
                            <Button size="icon" variant="ghost" className="h-7 w-7 text-slate-400 hover:text-emerald-500 hover:bg-emerald-50" onClick={() => window.open(`https://wa.me/?text=${encodeURIComponent(`Dear ${txn.customer}, your payment of ${formatCurrency(txn.amount)} has been received. Invoice: ${txn.id}. Thank you for your business!`)}`, '_blank')}>
                              <MessageCircle className="w-3.5 h-3.5" />
                            </Button>
                          </div>
                        </td>
                      </tr>
                    ))}
                    {(combined.length === 0) && (
                      <tr>
                        <td colSpan={6} className="px-5 py-8 text-center text-slate-400 font-medium">
                          No payments found for this period
                        </td>
                      </tr>
                    )}
                  </>
                    );
                  })()
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* ─── TODAY'S SALES REPORT (RECENT INVOICES) ─────────────────────────────────────── */}
        <div className="bg-white rounded-[8px] shadow-[0_1px_2px_rgba(0,0,0,0.05)] hover:shadow-lg hover:-translate-y-1 transition-all duration-300 border border-slate-200 mt-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between p-5 border-b border-slate-200 gap-4">
            <div>
              <h3 className="font-bold text-slate-800 text-base">{widgetFilters.recent === 'Today' ? "Today's Sales Report" : "Recent Invoices & Transactions"}</h3>
              <p className="text-[11px] text-slate-500 mt-0.5">Click any invoice to preview & print official GST Tax Invoice template</p>
            </div>
            <div className="flex items-center gap-2">
              <DateRangeFilter 
                value={widgetFilters.recent} 
                onChange={(val, start, end) => handleWidgetFilterChange('recent', val, start, end)}
                className="w-[120px]"
              />
              <Button 
                size="sm" 
                variant="outline"
                onClick={() => router.push("/sales/invoices")} 
                className="text-xs h-8 font-bold text-[#3F63AD] border-[#3F63AD]/30 hover:bg-blue-50"
              >
                View All Invoices <ArrowUpRight className="w-3.5 h-3.5 ml-1" />
              </Button>
              <Button size="sm" onClick={handleOpenInvoiceModal} className="bg-[#76C043] hover:bg-[#60a82c] text-white border-none text-xs h-8">
                + New Bill
              </Button>
            </div>
          </div>

          <div className="divide-y divide-border">
            {widgetLoading.recent ? (
              Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="flex items-center justify-between p-4 border-transparent animate-pulse">
                  <div className="flex items-center gap-3.5">
                    <div className="w-10 h-10 rounded-xl bg-slate-200"></div>
                    <div className="space-y-1">
                      <div className="h-3 w-24 bg-slate-200 rounded"></div>
                      <div className="h-2 w-32 bg-slate-200 rounded"></div>
                    </div>
                  </div>
                  <div className="flex items-center gap-6">
                    <div className="text-right space-y-1">
                      <div className="h-3 w-20 bg-slate-200 rounded ml-auto"></div>
                      <div className="h-2 w-12 bg-slate-200 rounded ml-auto"></div>
                    </div>
                    <div className="w-16 h-5 bg-slate-200 rounded-full"></div>
                    <div className="w-24 h-8 bg-slate-200 rounded"></div>
                  </div>
                </div>
              ))
            ) : (
              (widgetData.recent?.recentInvoices || []).map((inv: any) => (
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
                    <div className="flex items-center gap-2">
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
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={(e) => {
                          e.stopPropagation();
                          window.open(`https://wa.me/?text=${encodeURIComponent(`Dear ${inv.customerName}, your invoice ${inv.invoiceNumber} for ${formatCurrency(inv.total)} has been generated. Thank you!`)}`, '_blank');
                        }}
                        className="h-8 w-8 p-0 text-xs font-semibold border-emerald-500 text-emerald-600 hover:bg-emerald-500 hover:text-white"
                      >
                        <MessageCircle className="w-3.5 h-3.5" />
                      </Button>
                    </div>
                  </div>
                </div>
              ))
            )}
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
          refreshAllDashboard();
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
              <Label className="text-xs font-semibold">Customer Name *</Label>
              <Input
                required
                placeholder="e.g. Ramesh Kumar / Apex Enterprises"
                value={customerForm.name}
                onChange={(e) => setCustomerForm({ ...customerForm, name: e.target.value })}
                className="h-9 text-xs mt-1"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs font-semibold">Customer Mobile Number *</Label>
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
              <Label className="text-xs font-semibold">Customer Name *</Label>
              <Input
                required
                placeholder="e.g. Ramesh Kumar / Reliance Retail"
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

    </div>
  );
}

