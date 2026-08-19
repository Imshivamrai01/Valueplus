"use client";

import { useState, useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import {
  TrendingUp, TrendingDown, DollarSign, ShoppingCart, Package,
  Users, AlertTriangle, ArrowRight, Eye, MoreHorizontal,
  IndianRupee, Receipt, Wallet, CreditCard, Activity,
  Star, Sparkles, Calendar, Clock, CheckCircle2, Search,
  X, Filter, ExternalLink, Printer, Send, ShieldAlert, Plus, FileText, Download, Trash2, Building, Building2, UserCheck, Tv, Smartphone, Laptop, Fan, HardDrive, Headphones, BarChart3, PieChart as PieChartIcon, ArrowUpRight, MessageCircle, Wifi, WifiOff, Zap
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
import {
  cacheDashboardStats,
  getCachedDashboardStats,
  cacheDashboardExtended,
  getCachedDashboardExtended,
} from "@/lib/offline-storage";



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
  const [isOffline, setIsOffline] = useState(false);
  const [isUsingCachedData, setIsUsingCachedData] = useState(false);

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
  const [activeModal, setActiveModal] = useState<string | null>(null);
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

  // Value Plus Category Stock & Warranty Metrics
  const [openStockModal, setOpenStockModal] = useState(false);
  const [stockSearchQuery, setStockSearchQuery] = useState("");
  const [stockBreakdown, setStockBreakdown] = useState<{
    totalQuantity: number;
    totalStockValue: number;
    totalItemsCount?: number;
    electronics: { quantity: number; value: number; count?: number };
    mobile: { quantity: number; value: number; count?: number };
    categories?: Array<{ name: string; quantity: number; value: number; itemCount: number }>;
  }>({
    totalQuantity: 0,
    totalStockValue: 0,
    totalItemsCount: 0,
    electronics: { quantity: 0, value: 0, count: 0 },
    mobile: { quantity: 0, value: 0, count: 0 },
    categories: [],
  });
  const [isAuditPending, setIsAuditPending] = useState(false);
  const [warrantyData, setWarrantyData] = useState<{ totalSales: number; totalCount: number; conversionRate: number }>({
    totalSales: 0,
    totalCount: 0,
    conversionRate: 0,
  });
  const [staffPeriod, setStaffPeriod] = useState<"today" | "week" | "month">("today");
  const [staffPerformance, setStaffPerformance] = useState<any[]>([]);

  // Simple Forms
  const [estimateForm, setEstimateForm] = useState({ customerName: "", total: "", notes: "" });
  const [customerForm, setCustomerForm] = useState({ name: "", phone: "", email: "", gstNumber: "", city: "Gorakhpur", creditLimit: "50000" });
  const [itemForm, setItemForm] = useState({ name: "", hsnCode: "8528", gstRate: "18", purchasePrice: "", sellingPrice: "", openingStock: "10" });
  const [paymentForm, setPaymentForm] = useState({ partyName: "", amount: "", paymentMode: "Cash Counter", notes: "" });

  // ─── INSTANT CACHE HYDRATION (0ms offline-first render) ────────
  const hydrateFromCache = (s: string, e: string) => {
    const cachedStats = getCachedDashboardStats(`${s}_${e}`) || getCachedDashboardStats("Today_Today");
    if (cachedStats) {
      setData(cachedStats);
      setWidgetData({
        trends: cachedStats,
        pie: cachedStats,
        expenses: cachedStats,
        products: cachedStats,
        customers: cachedStats,
        logs: cachedStats,
        recent: cachedStats,
      });
      setIsUsingCachedData(true);
    }

    const cachedExt = getCachedDashboardExtended();
    if (cachedExt) {
      if (cachedExt.stock) setStockBreakdown(cachedExt.stock);
      if (typeof cachedExt.auditPending === "boolean") setIsAuditPending(cachedExt.auditPending);
      if (cachedExt.warranty) setWarrantyData(cachedExt.warranty);
      if (cachedExt.staffPerformance) setStaffPerformance(cachedExt.staffPerformance);
    }
  };

  // ─── CONCURRENT ALL-IN-ONE DATA LOADER ───────────────────────────
  const loadAllDashboardData = async (startOverride?: string, endOverride?: string, customStaffPeriod?: string) => {
    const s = startOverride || startDate;
    const e = endOverride || endDate;
    const staffP = customStaffPeriod || staffPeriod;
    const cacheKey = `${s}_${e}`;

    // Instant render from cache first
    hydrateFromCache(s, e);

    // Only trigger full shimmer loading if we have zero cached data
    if (!data && !getCachedDashboardStats(cacheKey)) {
      setLoading(true);
    }

    try {
      // Execute all 5 dashboard data requirements in a single parallel batch
      const [statsRes, stockRes, auditRes, warrantyRes, staffRes] = await Promise.allSettled([
        fetch(`/api/dashboard/stats?startDate=${s}&endDate=${e}`),
        fetch("/api/reports/stock"),
        fetch("/api/inventory/audit?checkPending=true"),
        fetch("/api/warranty"),
        fetch(`/api/reports/performance?period=${staffP}`),
      ]);

      // 1. Process Dashboard Main Stats
      if (statsRes.status === "fulfilled" && statsRes.value.ok) {
        const statsJson = await statsRes.value.json();
        if (statsJson.success) {
          setData(statsJson);
          setWidgetData({
            trends: statsJson,
            pie: statsJson,
            expenses: statsJson,
            products: statsJson,
            customers: statsJson,
            logs: statsJson,
            recent: statsJson,
          });
          cacheDashboardStats(cacheKey, statsJson);
          setIsUsingCachedData(false);

          if (statsJson.metrics?.warrantyRevenue > 0 || statsJson.metrics?.warrantyCount > 0) {
            setWarrantyData(prev => ({
              ...prev,
              totalSales: Math.max(prev.totalSales, statsJson.metrics.warrantyRevenue || 0),
              totalCount: Math.max(prev.totalCount, statsJson.metrics.warrantyCount || 0),
              conversionRate: Math.round(((statsJson.metrics.warrantyCount || 1) / Math.max(1, statsJson.metrics.totalOrders || 1)) * 100),
            }));
          }
        }
      }

      const extCacheUpdate: any = {};

      // 2. Process Stock Breakdown
      if (stockRes.status === "fulfilled" && stockRes.value.ok) {
        const stockJson = await stockRes.value.json();
        if (stockJson.success && stockJson.data) {
          setStockBreakdown(stockJson.data);
          extCacheUpdate.stock = stockJson.data;
        }
      }

      // 3. Process Audit Status
      if (auditRes.status === "fulfilled" && auditRes.value.ok) {
        const auditJson = await auditRes.value.json();
        if (auditJson.success) {
          setIsAuditPending(!!auditJson.pending);
          extCacheUpdate.auditPending = !!auditJson.pending;
        }
      }

      // 4. Process Warranty Metrics
      if (warrantyRes.status === "fulfilled" && warrantyRes.value.ok) {
        const warJson = await warrantyRes.value.json();
        if (warJson.success) {
          let warObj = warrantyData;
          if (warJson.metrics) {
            warObj = warJson.metrics;
          } else if (warJson.analytics) {
            warObj = {
              totalSales: warJson.analytics.totalRevenue || 0,
              totalCount: warJson.analytics.totalCount || 0,
              conversionRate: Math.round(((warJson.analytics.totalCount || 0) / Math.max(1, data?.metrics?.totalOrders || 1)) * 100),
            };
          }
          setWarrantyData(warObj);
          extCacheUpdate.warranty = warObj;
        }
      }

      // 5. Process Staff Performance
      if (staffRes.status === "fulfilled" && staffRes.value.ok) {
        const staffJson = await staffRes.value.json();
        if (staffJson.success) {
          setStaffPerformance(staffJson.data || []);
          extCacheUpdate.staffPerformance = staffJson.data || [];
        }
      }

      // Cache extended metrics for offline usage
      if (Object.keys(extCacheUpdate).length > 0) {
        cacheDashboardExtended(extCacheUpdate);
      }
    } catch (err) {
      console.warn("Dashboard concurrent load notice (using offline cached state):", err);
      setIsUsingCachedData(true);
    } finally {
      setLoading(false);
    }
  };

  const fetchStaffPerformance = async (period: string) => {
    try {
      const res = await fetch(`/api/reports/performance?period=${period}`);
      const json = await res.json();
      if (json.success) {
        setStaffPerformance(json.data || []);
        cacheDashboardExtended({ staffPerformance: json.data || [] });
      }
    } catch (e) {
      console.error("Staff perf fetch error:", e);
    }
  };

  const fetchWidgetData = async (widgetName: string, filterValue: string, customStart?: string, customEnd?: string) => {
    setWidgetLoading(prev => ({ ...prev, [widgetName]: true }));
    try {
      const { start, end } = resolveDateRange(filterValue, customStart, customEnd);
      const cacheKey = `${start}_${end}`;
      const localCached = getCachedDashboardStats(cacheKey);
      if (localCached) {
        setWidgetData((prev: any) => ({ ...prev, [widgetName]: localCached }));
      }

      const res = await fetch(`/api/dashboard/stats?startDate=${start}&endDate=${end}`);
      const json = await res.json();
      if (json.success) {
        setWidgetData((prev: any) => ({ ...prev, [widgetName]: json }));
        cacheDashboardStats(cacheKey, json);
      }
    } catch (err) {
      console.error(`Error fetching widget ${widgetName}:`, err);
    } finally {
      setWidgetLoading(prev => ({ ...prev, [widgetName]: false }));
    }
  };

  const refreshAllDashboard = () => {
    loadAllDashboardData();
  };

  // Mount effect with offline listeners and instant caching
  useEffect(() => {
    setIsOffline(typeof navigator !== "undefined" && !navigator.onLine);

    const handleOnline = () => {
      setIsOffline(false);
      loadAllDashboardData();
    };

    const handleOffline = () => {
      setIsOffline(true);
    };

    const handleSync = () => {
      refreshAllDashboard();
    };

    if (typeof window !== "undefined") {
      window.addEventListener("online", handleOnline);
      window.addEventListener("offline", handleOffline);
      window.addEventListener("erp-invoice-created", handleSync);
      window.addEventListener("erp-purchase-created", handleSync);
    }

    loadAllDashboardData();

    return () => {
      if (typeof window !== "undefined") {
        window.removeEventListener("online", handleOnline);
        window.removeEventListener("offline", handleOffline);
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
    loadAllDashboardData(s, e);
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
    loadAllDashboardData(startDate, endDate);
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
    { name: "Cash Counter", value: metrics.cashRevenue || 0, color: "#76C043", key: "cash" },
    { name: "UPI / QR Code", value: metrics.upiRevenue || 0, color: "#8B5CF6", key: "upi" },
    { name: "Online NetBanking", value: metrics.onlineRevenue || 0, color: "#3F63AD", key: "online" },
    { name: "Card (POS)", value: metrics.cardRevenue || 0, color: "#06B6D4", key: "card" },
    { name: "Finance (Bajaj/HDB)", value: metrics.financeRevenue || 0, color: "#F59E0B", key: "finance" },
  ];

  const DAILY_REVENUE = data?.dailyRevenue || [];

  const transactions = data?.transactions || { cash: [], upi: [], online: [], card: [], finance: [], due: [] };
  const recentInvoices = data?.recentInvoices || [];

  const getFilteredTransactions = () => {
    if (!activeModal) return [];
    let list: any[] = [];
    if (activeModal === "cash") list = transactions.cash || [];
    if (activeModal === "upi") list = transactions.upi || [];
    if (activeModal === "online") list = transactions.online || [];
    if (activeModal === "card") list = transactions.card || [];
    if (activeModal === "finance") list = transactions.finance || [];
    if (activeModal === "due") list = transactions.due || [];
    if (activeModal === "orders") list = recentInvoices || [];

    if (!searchQuery.trim()) return list;
    return list.filter((item: any) =>
      (item.customer || item.customerName || "").toLowerCase().includes(searchQuery.toLowerCase()) ||
      (item.id || item.invoiceNumber || "").toLowerCase().includes(searchQuery.toLowerCase())
    );
  };

  // Trigger Official Invoice Section Print & Preview
  const handlePrintTrigger = (inv: any) => {
    const docNo = inv.invoiceNumber || inv.id || inv._id;
    if (docNo) {
      router.push(`/invoice?id=${encodeURIComponent(docNo)}`);
    }
  };

  return (
    <div className="page-container">
      {/* ─── PENDING INVENTORY AUDIT WARNING BANNER ──────────────── */}
      {isAuditPending && (
        <div className="mb-4 bg-gradient-to-r from-amber-500/20 via-orange-500/10 to-transparent border-l-4 border-amber-500 p-4 rounded-xl shadow-sm flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <AlertTriangle className="w-5 h-5 text-amber-600 animate-bounce flex-shrink-0" />
            <div>
              <p className="text-xs font-black text-amber-900 uppercase tracking-wide">Daily Inventory Audit Required</p>
              <p className="text-[11px] text-amber-800">Physical stock count for today has not been conducted. Complete the showroom check to ensure zero leakage.</p>
            </div>
          </div>
          <Button
            size="sm"
            onClick={() => router.push("/inventory/audit")}
            className="h-8 text-xs font-bold bg-amber-600 hover:bg-amber-700 text-white shadow-sm flex-shrink-0"
          >
            Perform Daily Audit <ArrowRight className="w-3 h-3 ml-1" />
          </Button>
        </div>
      )}

      {/* ─── HEADER WITH PERIOD FILTER TABS ────────────────────────── */}
      <div className="flex flex-col xl:flex-row gap-4 items-start xl:items-center justify-between bg-white px-6 py-4 rounded-[8px] border border-slate-200 shadow-[0_1px_2px_rgba(0,0,0,0.05)]">
        <div className="flex items-center gap-4 flex-1">
          <div className="min-w-0">
            <div className="flex items-center gap-2.5">
              <h1 className="text-xl font-bold text-slate-800 tracking-tight">
                Value Plus Dashboard
              </h1>
              {isOffline ? (
                <Badge className="bg-amber-100 text-amber-900 border border-amber-300 font-bold text-[11px] px-2 py-0.5 flex items-center gap-1">
                  <WifiOff className="w-3 h-3 text-amber-700" /> Offline Mode (Cached)
                </Badge>
              ) : isUsingCachedData ? (
                <Badge className="bg-emerald-50 text-emerald-800 border border-emerald-200 font-medium text-[10px] px-2 py-0.5 flex items-center gap-1">
                  <Zap className="w-3 h-3 text-emerald-600" /> Cached Data
                </Badge>
              ) : null}
            </div>
            <p className="text-xs text-slate-500 font-medium">Ashoka Enterprises, Gorakhpur • Live ERP Overview</p>
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
        {/* ─── VALUE PLUS CATEGORY STOCK & WARRANTY SUMMARY (REQ 30 & 32) ─── */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-bold text-foreground uppercase tracking-wider flex items-center gap-2">
              <Package className="w-4 h-4 text-[#3F63AD]" /> Category Stock & Warranty Overview
            </h2>
            <span className="text-xs text-muted-foreground font-medium">Live inventory valuations & add-on sales</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {/* ELECTRONICS STOCK */}
            <div
              onClick={() => router.push("/masters/items?category=Electronics")}
              className="bg-white rounded-xl border border-slate-200 shadow-sm p-4 cursor-pointer hover:border-blue-500 hover:shadow-md transition-all flex flex-col justify-between"
            >
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
                  <Tv className="w-4 h-4 text-blue-600" /> Electronics Stock
                </span>
                <Badge className="bg-blue-100 text-blue-800 font-bold text-[10px]">
                  {stockBreakdown.electronics.quantity} Units
                </Badge>
              </div>
              <div>
                <p className="text-2xl font-black text-slate-900">
                  {formatCurrency(stockBreakdown.electronics.value)}
                </p>
              </div>
              <div className="flex items-center justify-between mt-3 pt-2 border-t border-slate-100 text-[11px] font-medium text-slate-500">
                <span>TV, Audio & Appliances</span>
                <ArrowRight className="w-3 h-3 text-slate-300" />
              </div>
            </div>

            {/* MOBILE STOCK */}
            <div
              onClick={() => router.push("/masters/items?category=Mobile")}
              className="bg-white rounded-xl border border-slate-200 shadow-sm p-4 cursor-pointer hover:border-purple-500 hover:shadow-md transition-all flex flex-col justify-between"
            >
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
                  <Smartphone className="w-4 h-4 text-purple-600" /> Mobile Stock
                </span>
                <Badge className="bg-purple-100 text-purple-800 font-bold text-[10px]">
                  {stockBreakdown.mobile.quantity} Units
                </Badge>
              </div>
              <div>
                <p className="text-2xl font-black text-slate-900">
                  {formatCurrency(stockBreakdown.mobile.value)}
                </p>
              </div>
              <div className="flex items-center justify-between mt-3 pt-2 border-t border-slate-100 text-[11px] font-medium text-slate-500">
                <span>Smartphones & Tablets</span>
                <ArrowRight className="w-3 h-3 text-slate-300" />
              </div>
            </div>

            {/* EXTENDED WARRANTY SALES */}
            <div
              onClick={() => router.push("/sales/invoices")}
              className="bg-white rounded-xl border border-slate-200 shadow-sm p-4 cursor-pointer hover:border-emerald-500 hover:shadow-md transition-all flex flex-col justify-between"
            >
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
                  <Sparkles className="w-4 h-4 text-emerald-600" /> Extended Warranty
                </span>
                <Badge className="bg-emerald-100 text-emerald-800 font-bold text-[10px]">
                  {warrantyData.totalCount || data?.metrics?.warrantyCount || 0} Policies
                </Badge>
              </div>
              <div>
                <p className="text-2xl font-black text-emerald-700">
                  {formatCurrency(warrantyData.totalSales || data?.metrics?.warrantyRevenue || 0)}
                </p>
              </div>
              <div className="flex items-center justify-between mt-3 pt-2 border-t border-slate-100 text-[11px] font-medium text-slate-500">
                <span className="text-emerald-700 font-bold">
                  Conversion Rate: {warrantyData.conversionRate || Math.round(((warrantyData.totalCount || data?.metrics?.warrantyCount || 0) / Math.max(1, data?.metrics?.totalOrders || 1)) * 100)}%
                </span>
                <ArrowRight className="w-3 h-3 text-slate-300" />
              </div>
            </div>
          </div>
        </div>

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

                {/* TOTAL STOCKS CARD (CLICKABLE FOR CATEGORY BREAKDOWN) */}
                <div
                  onClick={() => setOpenStockModal(true)}
                  className="bg-white rounded-[8px] border border-slate-200 shadow-[0_1px_2px_rgba(0,0,0,0.05)] p-4 cursor-pointer hover:border-[#3F63AD] hover:shadow-lg hover:-translate-y-1 transition-all duration-300 flex flex-col justify-between group"
                >
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-xs font-bold text-slate-500 uppercase tracking-wider group-hover:text-[#3F63AD] transition-colors">
                      Total Stocks
                    </span>
                    <div className="w-8 h-8 rounded-lg bg-blue-50 flex items-center justify-center text-[#3F63AD] group-hover:bg-[#3F63AD] group-hover:text-white transition-colors">
                      <Package className="w-4 h-4" />
                    </div>
                  </div>
                  <div className="mb-2">
                    <p className="text-[26px] leading-none font-black text-slate-900">
                      {stockBreakdown.totalQuantity > 0 ? stockBreakdown.totalQuantity.toLocaleString("en-IN") : (metrics.totalItems || 0)}
                      <span className="text-xs font-bold text-slate-500 ml-1.5 font-normal">Units</span>
                    </p>
                  </div>
                  <div className="flex items-center justify-between mt-auto pt-3 border-t border-slate-100">
                    <span className="text-[11px] font-semibold text-[#3F63AD] flex items-center gap-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                      ₹{((stockBreakdown.totalStockValue || 0) / 10000000).toFixed(2)} Cr Valuation
                    </span>
                    <span className="text-[10px] font-bold text-blue-600 bg-blue-50 px-1.5 py-0.5 rounded flex items-center gap-1">
                      Categories <ArrowRight className="w-2.5 h-2.5" />
                    </span>
                  </div>
                </div>
              </>
              </div>
            )}
          </div>
        </div>


        {/* ─── SALES & PAYMENT CHARTS (PETPOOJA STYLE) ──────────────────────────────────── */}
        <div className="grid lg:grid-cols-3 gap-6 mt-6 items-stretch">
          <div className="lg:col-span-2 bg-white rounded-xl shadow-sm hover:shadow-md transition-all duration-300 border border-slate-200 p-5 flex flex-col">
            {/* Header with Live Stats Pills */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
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

              <div className="flex items-center gap-2">
                <DateRangeFilter 
                  value={widgetFilters.trends} 
                  onChange={(val, start, end) => handleWidgetFilterChange('trends', val, start, end)}
                  className="w-[125px]"
                />
              </div>
            </div>

            {/* Quick PetPooja POS KPI Strip */}
            {(() => {
              const totalTrends = ((widgetData.trends?.metrics?.cashRevenue || 0) + (widgetData.trends?.metrics?.onlineRevenue || 0) + (widgetData.trends?.metrics?.financeRevenue || 0)) || 1;
              const cashVal = widgetData.trends?.metrics?.cashRevenue || 0;
              const onlineVal = widgetData.trends?.metrics?.onlineRevenue || 0;
              const financeVal = widgetData.trends?.metrics?.financeRevenue || 0;
              const cashPct = Math.round((cashVal / Math.max(1, totalTrends)) * 100);
              const onlinePct = Math.round((onlineVal / Math.max(1, totalTrends)) * 100);
              const financePct = Math.round((financeVal / Math.max(1, totalTrends)) * 100);

              return (
                <div className="grid grid-cols-3 gap-2 my-3 py-2 px-3 bg-slate-50/80 rounded-lg border border-slate-100 text-xs">
                  <div className="flex items-center justify-between pr-2 border-r border-slate-200/80">
                    <div className="flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-[#76C043]" />
                      <span className="text-slate-600 font-medium">Cash</span>
                    </div>
                    <div className="text-right">
                      <span className="font-bold font-mono text-slate-900">{formatCurrency(cashVal)}</span>
                      <span className="text-[10px] text-slate-400 font-medium ml-1">({cashPct}%)</span>
                    </div>
                  </div>
                  <div className="flex items-center justify-between px-2 border-r border-slate-200/80">
                    <div className="flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-[#3F63AD]" />
                      <span className="text-slate-600 font-medium">Online/UPI</span>
                    </div>
                    <div className="text-right">
                      <span className="font-bold font-mono text-slate-900">{formatCurrency(onlineVal)}</span>
                      <span className="text-[10px] text-slate-400 font-medium ml-1">({onlinePct}%)</span>
                    </div>
                  </div>
                  <div className="flex items-center justify-between pl-2">
                    <div className="flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-[#F59E0B]" />
                      <span className="text-slate-600 font-medium">Finance</span>
                    </div>
                    <div className="text-right">
                      <span className="font-bold font-mono text-slate-900">{formatCurrency(financeVal)}</span>
                      <span className="text-[10px] text-slate-400 font-medium ml-1">({financePct}%)</span>
                    </div>
                  </div>
                </div>
              );
            })()}

            {/* Chart Container expanding to fill remaining card space */}
            <div className="flex-1 w-full min-h-[300px] flex flex-col justify-end">
              {widgetLoading.trends ? (
                <div className="w-full h-[300px] flex items-end justify-between px-4 animate-pulse pt-10">
                  {Array.from({ length: 8 }).map((_, i) => (
                    <div key={i} className="w-[8%] bg-slate-200 rounded-t-sm" style={{ height: `${Math.random() * 60 + 20}%` }}></div>
                  ))}
                </div>
              ) : (
                <ResponsiveContainer width="100%" height={300}>
                  <AreaChart data={widgetData.trends?.dailyRevenue || []} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
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
                    <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 11, paddingTop: '10px', fontWeight: 600 }} />
                    <Area yAxisId="left" type="monotone" dataKey="cash" name="Cash (₹)" stroke="#76C043" strokeWidth={2.5} fillOpacity={1} fill="url(#colorCash)" dot={{ r: 3.5, stroke: "#76C043", strokeWidth: 2, fill: "#fff" }} activeDot={{ r: 5.5, stroke: "#76C043", strokeWidth: 2, fill: "#fff" }} />
                    <Area yAxisId="left" type="monotone" dataKey="online" name="Online (₹)" stroke="#3F63AD" strokeWidth={2.5} fillOpacity={1} fill="url(#colorOnline)" dot={{ r: 3.5, stroke: "#3F63AD", strokeWidth: 2, fill: "#fff" }} activeDot={{ r: 5.5, stroke: "#3F63AD", strokeWidth: 2, fill: "#fff" }} />
                    <Area yAxisId="left" type="monotone" dataKey="finance" name="Finance (₹)" stroke="#F59E0B" strokeWidth={2.5} fillOpacity={1} fill="url(#colorFinance)" dot={{ r: 3.5, stroke: "#F59E0B", strokeWidth: 2, fill: "#fff" }} activeDot={{ r: 5.5, stroke: "#F59E0B", strokeWidth: 2, fill: "#fff" }} />
                  </AreaChart>
                </ResponsiveContainer>
              )}
            </div>
          </div>

          {/* PAYMENT MODE BREAKDOWN */}
          <div className="bg-white rounded-xl shadow-sm hover:shadow-md transition-all duration-300 border border-slate-200 p-5 flex flex-col justify-between space-y-3">
            <div className="flex items-center justify-between pb-2.5 border-b border-slate-100">
              <h3 className="font-bold text-slate-800 text-sm flex items-center gap-2">
                <PieChartIcon className="w-4 h-4 text-slate-500" /> Payment Modes
              </h3>
              <DateRangeFilter 
                value={widgetFilters.pie} 
                onChange={(val, start, end) => handleWidgetFilterChange('pie', val, start, end)}
                className="w-[110px] h-7 text-xs"
              />
            </div>
            {widgetLoading.pie ? (
              <div className="flex flex-col items-center justify-center animate-pulse py-4">
                <div className="w-[130px] h-[130px] rounded-full border-[16px] border-slate-200"></div>
                <div className="w-full space-y-2 mt-6">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <div key={i} className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className="w-2.5 h-2.5 rounded-full bg-slate-200"></div>
                        <div className="h-2.5 w-20 bg-slate-200 rounded"></div>
                      </div>
                      <div className="h-2.5 w-16 bg-slate-200 rounded"></div>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              (() => {
                const pieMetrics = widgetData.pie?.metrics || {
                  cashRevenue: 0,
                  upiRevenue: 0,
                  onlineRevenue: 0,
                  cardRevenue: 0,
                  financeRevenue: 0,
                  warrantyRevenue: 0,
                  warrantyCount: 0,
                  dueRevenue: 0,
                  dueCount: 0,
                };
                const pieModes = [
                  { name: "Cash Counter", value: pieMetrics.cashRevenue || 0, color: "#76C043", key: "cash" },
                  { name: "UPI / QR Code", value: pieMetrics.upiRevenue || 0, color: "#8B5CF6", key: "upi" },
                  { name: "Online NetBanking", value: pieMetrics.onlineRevenue || 0, color: "#3F63AD", key: "online" },
                  { name: "Card (POS)", value: pieMetrics.cardRevenue || 0, color: "#06B6D4", key: "card" },
                  { name: "Finance (Bajaj/HDB)", value: pieMetrics.financeRevenue || 0, color: "#F59E0B", key: "finance" },
                ];
                return (
              <div className="space-y-3">
                <ResponsiveContainer width="100%" height={145}>
                  <PieChart>
                    <Pie data={pieModes} cx="50%" cy="50%" innerRadius={44} outerRadius={66} paddingAngle={2} dataKey="value">
                      {pieModes.map((entry, i) => (
                        <Cell 
                          key={i} 
                          fill={entry.color} 
                          className="cursor-pointer hover:opacity-80 transition-opacity"
                          onClick={() => router.push(`/dashboard/reports?type=${entry.key}&dateFilter=${dateFilter}`)} 
                        />
                      ))}
                    </Pie>
                    <Tooltip formatter={(v: any) => [`₹${indianNumberFormat(Number(v) || 0)}`, ""]} />
                  </PieChart>
                </ResponsiveContainer>

                {/* 5 PAYMENT MODES LIST */}
                <div className="space-y-1.5 pt-1 border-t border-slate-100">
                  {pieModes.map((item) => (
                    <div 
                      key={item.name} 
                      className="flex items-center justify-between text-xs cursor-pointer hover:bg-slate-50 py-1 px-1.5 rounded-md transition-colors group"
                      onClick={() => router.push(`/dashboard/reports?type=${item.key}&dateFilter=${widgetFilters.pie}`)}
                    >
                      <div className="flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full" style={{ backgroundColor: item.color }} />
                        <span className="text-slate-700 font-medium group-hover:text-[#3F63AD] transition-colors text-[11px]">{item.name}</span>
                      </div>
                      <span className="font-bold text-slate-900 font-mono text-[11px]">₹{indianNumberFormat(item.value)}</span>
                    </div>
                  ))}
                </div>

                {/* EXTENDED WARRANTY ROW */}
                <div className="bg-emerald-50/70 border border-emerald-200/80 rounded-lg p-2 flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2">
                    <div className="w-5 h-5 rounded-md bg-emerald-100 flex items-center justify-center text-emerald-700">
                      <Sparkles className="w-3 h-3" />
                    </div>
                    <div>
                      <p className="font-bold text-emerald-900 text-[11px]">Extended Warranty</p>
                      <p className="text-[9.5px] text-emerald-700">{pieMetrics.warrantyCount || warrantyData.totalCount || 0} Policies Sold</p>
                    </div>
                  </div>
                  <span className="font-black text-emerald-800 font-mono text-xs">
                    ₹{indianNumberFormat(pieMetrics.warrantyRevenue || warrantyData.totalSales || 0)}
                  </span>
                </div>

                {/* TODAY'S DUE / OUTSTANDING SECTION */}
                <div 
                  onClick={() => {
                    const activeDate = widgetFilters?.pie || dateFilter || "Today";
                    let url = `/reports/sales-out?dueOnly=true&dateFilter=${encodeURIComponent(activeDate)}`;
                    if (startDate && endDate) {
                      url += `&startDate=${startDate}&endDate=${endDate}`;
                    }
                    router.push(url);
                  }}
                  className="bg-rose-50/80 border border-rose-200 rounded-lg p-2.5 flex flex-col justify-between hover:border-rose-400 hover:shadow-sm transition-all cursor-pointer group"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5">
                      <span className="w-1.5 h-1.5 rounded-full bg-rose-500 animate-pulse"></span>
                      <span className="text-[10px] font-bold text-rose-800 uppercase tracking-wider">
                        Pending Due / Balance
                      </span>
                    </div>
                    <Badge className="bg-rose-200/80 text-rose-900 font-bold text-[9px] px-1 py-0 border-none">
                      {pieMetrics.dueCount || 0} Invoices
                    </Badge>
                  </div>
                  <div className="flex items-center justify-between mt-1.5 pt-1 border-t border-rose-200/60">
                    <p className="text-sm font-black text-rose-600 font-mono">
                      ₹{indianNumberFormat(pieMetrics.dueRevenue || 0)}
                    </p>
                    <span className="text-[9.5px] font-bold text-rose-700 group-hover:text-rose-900 flex items-center gap-1">
                      View Dues <ArrowRight className="w-2.5 h-2.5" />
                    </span>
                  </div>
                </div>
              </div>
                );
              })()
            )}
          </div>
        </div>

        {/* ─── SIDE-BY-SIDE: SALES EXECUTIVE LEADERBOARD & OPERATING EXPENSES (PETPOOJA POS STYLE) ─── */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 mt-5">
          {/* LEFT: TOP SALES STAFF LEADERBOARD */}
          <div className="bg-white rounded-xl shadow-sm hover:shadow-md transition-all duration-200 border border-slate-200/90 p-4 flex flex-col justify-between">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-slate-100">
              <div>
                <h3 className="font-extrabold text-slate-900 text-sm flex items-center gap-2">
                  <Users className="w-4 h-4 text-[#3F63AD]" /> Sales Executive Leaderboard
                </h3>
                <p className="text-[10px] text-slate-500 mt-0.5">Top staff performance by billed revenue</p>
              </div>

              <div className="flex items-center gap-1 bg-slate-100 p-0.5 rounded-lg self-start sm:self-auto">
                <button
                  onClick={() => { setStaffPeriod("today"); fetchStaffPerformance("today"); }}
                  className={cn("px-2 py-0.5 text-[11px] font-bold rounded-md transition-all", staffPeriod === "today" ? "bg-[#30539C] text-white shadow-sm" : "text-slate-600 hover:text-slate-900")}
                >
                  Today
                </button>
                <button
                  onClick={() => { setStaffPeriod("week"); fetchStaffPerformance("week"); }}
                  className={cn("px-2 py-0.5 text-[11px] font-bold rounded-md transition-all", staffPeriod === "week" ? "bg-[#30539C] text-white shadow-sm" : "text-slate-600 hover:text-slate-900")}
                >
                  Week
                </button>
                <button
                  onClick={() => { setStaffPeriod("month"); fetchStaffPerformance("month"); }}
                  className={cn("px-2 py-0.5 text-[11px] font-bold rounded-md transition-all", staffPeriod === "month" ? "bg-[#30539C] text-white shadow-sm" : "text-slate-600 hover:text-slate-900")}
                >
                  Month
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-3">
              {staffPerformance.length === 0 ? (
                <div className="col-span-2 py-8 text-center text-slate-400 text-xs font-medium">
                  No staff sales records found for this period.
                </div>
              ) : (
                staffPerformance.slice(0, 4).map((staff, idx) => {
                  const totalAmt = Number(staff.totalSales ?? staff.salesAmount) || 0;
                  const totalBills = Number(staff.totalInvoices ?? staff.numberOfBills) || 0;
                  const avgBill = totalBills > 0 ? (Number(staff.averageOrderValue) || Math.round(totalAmt / totalBills)) : 0;
                  const totalRecd = Number(staff.totalCollected ?? staff.collection) || 0;

                  return (
                    <div key={staff.staffName || idx} className="p-2.5 rounded-xl border border-slate-200 bg-slate-50/60 hover:bg-white hover:border-[#3F63AD] hover:shadow-sm transition-all flex flex-col justify-between">
                      <div className="flex items-center justify-between mb-1">
                        <div className="flex items-center gap-1.5">
                          <div className={cn(
                            "w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-black",
                            idx === 0 ? "bg-amber-100 text-amber-800 border border-amber-300" :
                            idx === 1 ? "bg-slate-200 text-slate-700" :
                            idx === 2 ? "bg-amber-50 text-amber-700" :
                            "bg-slate-100 text-slate-600"
                          )}>
                            #{idx + 1}
                          </div>
                          <span className="font-bold text-xs text-slate-900 truncate max-w-[110px]">{staff.staffName}</span>
                        </div>
                        <Badge variant="outline" className="text-[10px] font-mono font-bold text-slate-600 px-1.5 py-0">
                          {totalBills} Bills
                        </Badge>
                      </div>

                      <div className="my-1">
                        <span className="text-[10px] text-slate-500 block">Total Sales</span>
                        <p className="text-sm font-black text-[#3F63AD] font-mono">
                          {formatCurrency(totalAmt)}
                        </p>
                      </div>

                      <div className="pt-1.5 border-t border-slate-200/60 flex items-center justify-between text-[10px] text-slate-500">
                        <span>Avg: {formatCurrency(avgBill)}</span>
                        <span className="font-semibold text-emerald-700 font-mono">{formatCurrency(totalRecd)} recd</span>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {/* RIGHT: SHOWROOM OPERATING EXPENSES (PETPOOJA STYLE COMPACT WITH VISUAL GRAPH) */}
          <div className="bg-white rounded-xl shadow-sm hover:shadow-md transition-all duration-200 border border-slate-200/90 p-4 space-y-3">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2.5 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg bg-rose-50 border border-rose-100 flex items-center justify-center text-rose-600">
                  <Receipt className="w-4 h-4" />
                </div>
                <div>
                  <div className="flex items-center gap-1.5">
                    <h3 className="font-bold text-slate-900 text-sm tracking-tight">
                      Operating Expenses
                    </h3>
                    <span className="px-2 py-0.5 rounded-full bg-rose-50 text-rose-700 border border-rose-200/70 text-[11px] font-bold font-mono">
                      {formatCurrency(widgetData.expenses?.expenses?.total || widgetData.expenses?.metrics?.totalExpenses || 0)}
                    </span>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-1.5">
                <DateRangeFilter 
                  value={widgetFilters.expenses} 
                  onChange={(val, start, end) => handleWidgetFilterChange('expenses', val, start, end)}
                  className="w-[95px] h-7 text-[11px]"
                />
                <Button 
                  size="sm" 
                  onClick={() => router.push("/purchase/expenses")} 
                  className="bg-rose-600 hover:bg-rose-700 text-white font-semibold text-[11px] h-7 px-2.5 rounded-md shadow-none"
                >
                  + Add
                </Button>
              </div>
            </div>

            {/* Visual Graph & Categories Row */}
            <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 items-center">
              {/* MINI DONUT GRAPH (4 cols) */}
              <div className="sm:col-span-4 flex flex-col items-center justify-center relative py-1">
                {widgetLoading.expenses ? (
                  <div className="w-20 h-20 rounded-full border-4 border-slate-200 animate-spin border-t-rose-500" />
                ) : (
                  (() => {
                    const categories = widgetData.expenses?.expenses?.categories || [];
                    const pieColors = ["#F43F5E", "#F59E0B", "#3B82F6", "#10B981", "#8B5CF6", "#EC4899"];
                    const chartData = categories.length > 0
                      ? categories.map((c: any) => ({ name: c.category, value: c.amount }))
                      : [{ name: "No Expenses", value: 1 }];

                    return (
                      <div className="w-full h-[95px] relative flex items-center justify-center">
                        <ResponsiveContainer width="100%" height="100%">
                          <PieChart>
                            <Pie
                              data={chartData}
                              cx="50%"
                              cy="50%"
                              innerRadius={24}
                              outerRadius={38}
                              paddingAngle={categories.length > 1 ? 3 : 0}
                              dataKey="value"
                            >
                              {chartData.map((_: any, index: number) => (
                                <Cell key={`cell-${index}`} fill={categories.length > 0 ? pieColors[index % pieColors.length] : "#CBD5E1"} />
                              ))}
                            </Pie>
                            <Tooltip 
                              formatter={(value: any) => [formatCurrency(Number(value)), "Amount"]}
                              contentStyle={{ backgroundColor: "#1E293B", borderRadius: "8px", border: "none", color: "#FFF", fontSize: "11px", padding: "4px 8px" }}
                              itemStyle={{ color: "#FFF" }}
                            />
                          </PieChart>
                        </ResponsiveContainer>
                        <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                          <span className="text-[8px] font-bold text-slate-400 uppercase tracking-tighter">TOTAL</span>
                          <span className="text-[10px] font-black text-slate-800 font-mono">
                            ₹{indianNumberFormat(widgetData.expenses?.expenses?.total || widgetData.expenses?.metrics?.totalExpenses || 0)}
                          </span>
                        </div>
                      </div>
                    );
                  })()
                )}
              </div>

              {/* CATEGORY BREAKDOWN BARS (8 cols) */}
              <div className="sm:col-span-8 space-y-1.5">
                <div className="flex items-center justify-between text-[10px] text-slate-500 font-bold uppercase tracking-wider">
                  <span>Category Distribution</span>
                  <span>Share %</span>
                </div>
                {widgetLoading.expenses ? (
                  <div className="space-y-1.5 animate-pulse py-1">
                    {Array.from({ length: 2 }).map((_, i) => (
                      <div key={i} className="space-y-1">
                        <div className="h-2 w-16 bg-slate-200 rounded"></div>
                        <div className="h-1.5 w-full bg-slate-200 rounded"></div>
                      </div>
                    ))}
                  </div>
                ) : (
                  (() => {
                    const categories = widgetData.expenses?.expenses?.categories || [];
                    const pieColors = ["#F43F5E", "#F59E0B", "#3B82F6", "#10B981", "#8B5CF6"];
                    if (categories.length === 0) {
                      return (
                        <div className="py-2 text-center text-[10px] text-slate-400">
                          No expense categories recorded for this period
                        </div>
                      );
                    }
                    return categories.slice(0, 3).map((cat: any, i: number) => {
                      const color = pieColors[i % pieColors.length];
                      return (
                        <div key={cat.category} className="space-y-0.5">
                          <div className="flex items-center justify-between text-[10px]">
                            <div className="flex items-center gap-1.5">
                              <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: color }} />
                              <span className="text-slate-700 font-medium truncate max-w-[130px]">{cat.category}</span>
                            </div>
                            <span className="font-mono text-slate-800 font-semibold">{formatCurrency(cat.amount)} <span className="text-slate-400 text-[9px]">({cat.percentage}%)</span></span>
                          </div>
                          <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden">
                            <div className="h-full rounded-full transition-all duration-300" style={{ width: `${cat.percentage}%`, backgroundColor: color }} />
                          </div>
                        </div>
                      );
                    });
                  })()
                )}
              </div>
            </div>

            {/* RECENT VOUCHERS LIST */}
            <div className="pt-2 border-t border-slate-100 space-y-1">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Recent Expense Vouchers</span>
                <span 
                  onClick={() => router.push(`/purchase/expenses?dateFilter=${widgetFilters.expenses}`)}
                  className="text-[10px] text-rose-600 font-semibold cursor-pointer hover:underline"
                >
                  View All →
                </span>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-[11px] text-left">
                  <tbody className="divide-y divide-slate-50">
                    {widgetLoading.expenses ? (
                      Array.from({ length: 2 }).map((_, i) => (
                        <tr key={i} className="animate-pulse">
                          <td className="py-1"><div className="h-2 w-12 bg-slate-200 rounded"></div></td>
                          <td className="py-1"><div className="h-2 w-16 bg-slate-200 rounded"></div></td>
                          <td className="py-1 text-right"><div className="h-2 w-10 bg-slate-200 rounded ml-auto"></div></td>
                        </tr>
                      ))
                    ) : (
                      (() => {
                        const recent = widgetData.expenses?.expenses?.recent || [];
                        if (recent.length === 0) {
                          return (
                            <tr>
                              <td colSpan={3} className="py-2 text-center text-[10px] text-slate-400">
                                No recent vouchers
                              </td>
                            </tr>
                          );
                        }
                        return recent.slice(0, 2).map((exp: any) => (
                          <tr key={exp._id || exp.expenseNo} className="hover:bg-slate-50/70 transition-colors">
                            <td className="py-1 text-slate-500 text-[10px] whitespace-nowrap">{formatDateShort(exp.date || exp.createdAt)}</td>
                            <td className="py-1">
                              <span className="px-1.5 py-0.5 rounded text-[9.5px] font-semibold bg-rose-50 text-rose-700 border border-rose-200/60 whitespace-nowrap">
                                {exp.category}
                              </span>
                            </td>
                            <td className="py-1 text-right font-bold text-rose-600 font-mono text-[10px]">{formatCurrency(exp.amount)}</td>
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

        {/* ─── SIDE-BY-SIDE: DETAILED PAYMENT LOG + TODAY'S SALES REPORT ──────── */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 mt-5">
          {/* LEFT: DETAILED PAYMENT LOG */}
          <div className="bg-white rounded-xl shadow-sm hover:shadow-md transition-all duration-300 border border-slate-200 flex flex-col justify-between">
            <div className="flex items-center justify-between p-4 border-b border-slate-100">
              <div>
                <h3 className="font-bold text-slate-800 text-sm">Detailed Payment Log</h3>
                <p className="text-[10px] text-slate-500 mt-0.5">Real-time log of all received payments</p>
              </div>
              <div className="flex items-center gap-1.5">
                <DateRangeFilter 
                  value={widgetFilters.logs} 
                  onChange={(val, start, end) => handleWidgetFilterChange('logs', val, start, end)}
                  className="w-[105px] h-7 text-xs"
                />
                <Button size="sm" variant="outline" className="text-[11px] h-7 px-2" onClick={() => router.push(`/dashboard/reports?type=all&dateFilter=${widgetFilters.logs}`)}>
                  <Eye className="w-3 h-3 mr-1" /> View Full
                </Button>
              </div>
            </div>
            <div className="p-0 max-h-[380px] overflow-y-auto overflow-x-hidden">
              <table className="w-full text-xs text-left table-fixed">
                <thead className="bg-slate-50 text-slate-500 font-bold text-[10px] uppercase tracking-wider border-b border-slate-200 sticky top-0 z-10">
                  <tr>
                    <th className="px-3 py-2.5 w-[20%]">Time</th>
                    <th className="px-2 py-2.5 w-[24%]">Invoice #</th>
                    <th className="px-2 py-2.5 w-[19%]">Customer</th>
                    <th className="px-1.5 py-2.5 w-[15%] text-center">Mode</th>
                    <th className="px-2 py-2.5 w-[14%] text-right">Amount</th>
                    <th className="px-1.5 py-2.5 w-[8%] text-center"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {widgetLoading.logs ? (
                    Array.from({ length: 4 }).map((_, i) => (
                      <tr key={i} className="animate-pulse">
                        <td className="px-3 py-2.5"><div className="h-2.5 w-12 bg-slate-200 rounded"></div></td>
                        <td className="px-2 py-2.5"><div className="h-2.5 w-16 bg-slate-200 rounded"></div></td>
                        <td className="px-2 py-2.5"><div className="h-2.5 w-14 bg-slate-200 rounded"></div></td>
                        <td className="px-1.5 py-2.5 text-center"><div className="h-3 w-10 bg-slate-200 rounded mx-auto"></div></td>
                        <td className="px-2 py-2.5 text-right"><div className="h-2.5 w-12 bg-slate-200 rounded ml-auto"></div></td>
                        <td className="px-1.5 py-2.5 text-center"><div className="h-4 w-4 bg-slate-200 rounded mx-auto"></div></td>
                      </tr>
                    ))
                  ) : (
                    (() => {
                      const txns = widgetData.logs?.transactions || { cash: [], upi: [], online: [], card: [], finance: [] };
                      const combined = [
                        ...(txns.cash || []), 
                        ...(txns.upi || []), 
                        ...(txns.online || []), 
                        ...(txns.card || []), 
                        ...(txns.finance || [])
                      ]
                        .sort((a, b) => new Date(b.time || 0).getTime() - new Date(a.time || 0).getTime())
                        .slice(0, 8);

                      if (combined.length === 0) {
                        return (
                          <tr>
                            <td colSpan={6} className="px-3 py-8 text-center text-slate-400 text-xs font-medium">
                              No payment transactions found for this period
                            </td>
                          </tr>
                        );
                      }

                      return combined.map((txn: any, i) => {
                        const timeMatch = (txn.time || "").match(/(\d{1,2}:\d{2}\s*(?:AM|PM|am|pm))/i);
                        const displayTime = timeMatch ? timeMatch[1] : (txn.time || "Today");
                        const rawDate = timeMatch ? txn.time.replace(timeMatch[0], "").trim() : "";
                        const displayDate = rawDate ? formatDateShort(rawDate) : "";

                        const modeLower = (txn.mode || "").toLowerCase();
                        let modePill = <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[9px] font-bold uppercase bg-slate-100 text-slate-700">{txn.mode}</span>;
                        if (modeLower.includes("cash")) {
                          modePill = <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[9px] font-bold uppercase bg-emerald-50 text-emerald-700 border border-emerald-200">Cash</span>;
                        } else if (modeLower.includes("upi")) {
                          modePill = <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[9px] font-bold uppercase bg-purple-50 text-purple-700 border border-purple-200">UPI</span>;
                        } else if (modeLower.includes("online") || modeLower.includes("netbank")) {
                          modePill = <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[9px] font-bold uppercase bg-blue-50 text-[#3F63AD] border border-blue-200">Online</span>;
                        } else if (modeLower.includes("card") || modeLower.includes("pos")) {
                          modePill = <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[9px] font-bold uppercase bg-cyan-50 text-cyan-700 border border-cyan-200">Card</span>;
                        } else if (modeLower.includes("finance") || modeLower.includes("bajaj") || modeLower.includes("hdb")) {
                          modePill = <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[9px] font-bold uppercase bg-amber-50 text-amber-700 border border-amber-200">Finance</span>;
                        }

                        return (
                          <tr key={i} className="hover:bg-slate-50/90 transition-colors">
                            <td className="px-3 py-2 text-left">
                              <span className="font-semibold text-slate-800 text-[11px] block leading-tight">{displayTime}</span>
                              {displayDate && <span className="text-[9.5px] text-slate-400 font-medium block leading-tight">{displayDate}</span>}
                            </td>
                            <td className="px-2 py-2 text-left font-mono font-bold text-slate-800 text-[11px] truncate">
                              <div className="flex items-center gap-1">
                                <span className="cursor-pointer hover:text-[#3F63AD] transition-colors" onClick={() => handlePrintTrigger(txn)} title={txn.id}>
                                  {txn.id}
                                </span>
                                {(txn.reprintCount || 0) > 0 && (
                                  <span className="font-mono text-[8.5px] font-bold px-1 py-0.2 rounded bg-amber-50 text-amber-800 border border-amber-300" title={`Reprinted ${txn.reprintCount} time(s)`}>
                                    🖨️ {txn.reprintCount}x
                                  </span>
                                )}
                              </div>
                            </td>
                            <td className="px-2 py-2 text-left font-medium text-slate-700 text-[11px] truncate" title={txn.customer}>
                              {txn.customer}
                            </td>
                            <td className="px-1.5 py-2 text-center">
                              {modePill}
                            </td>
                            <td className="px-2 py-2 text-right font-black text-slate-900 font-mono text-[11px] whitespace-nowrap">
                              {formatCurrency(txn.amount)}
                            </td>
                            <td className="px-1.5 py-2 text-center">
                              <div className="flex items-center justify-center gap-0.5">
                                <Button 
                                  size="icon" 
                                  variant="ghost" 
                                  className="h-6 w-6 text-slate-400 hover:text-[#3F63AD] hover:bg-[#3F63AD]/10" 
                                  onClick={() => handlePrintTrigger(txn)}
                                  title="Print Tax Invoice"
                                >
                                  <Printer className="w-3 h-3" />
                                </Button>
                                <Button 
                                  size="icon" 
                                  variant="ghost" 
                                  className="h-6 w-6 text-slate-400 hover:text-emerald-600 hover:bg-emerald-50" 
                                  onClick={() => window.open(`https://wa.me/?text=${encodeURIComponent(`Dear ${txn.customer}, your payment of ${formatCurrency(txn.amount)} has been received. Invoice: ${txn.id}. Thank you for your business!`)}`, '_blank')}
                                  title="WhatsApp Receipt"
                                >
                                  <MessageCircle className="w-3 h-3" />
                                </Button>
                              </div>
                            </td>
                          </tr>
                        );
                      });
                    })()
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* RIGHT: TODAY'S SALES REPORT (RECENT INVOICES) */}
          <div className="bg-white rounded-xl shadow-sm hover:shadow-md transition-all duration-300 border border-slate-200 flex flex-col justify-between">
            <div className="flex items-center justify-between p-4 border-b border-slate-100">
              <div>
                <h3 className="font-bold text-slate-800 text-sm">
                  {widgetFilters.recent === 'Today' ? "Today's Sales Report" : "Recent Invoices"}
                </h3>
                <p className="text-[10px] text-slate-500 mt-0.5">Click any invoice to preview & print official GST bill</p>
              </div>
              <div className="flex items-center gap-1.5">
                <DateRangeFilter 
                  value={widgetFilters.recent} 
                  onChange={(val, start, end) => handleWidgetFilterChange('recent', val, start, end)}
                  className="w-[105px] h-7 text-xs"
                />
                <Button 
                  size="sm" 
                  onClick={handleOpenInvoiceModal} 
                  className="bg-[#76C043] hover:bg-[#60a82c] text-white border-none text-[11px] h-7 px-2.5 rounded-md"
                >
                  + New Bill
                </Button>
              </div>
            </div>
            <div className="divide-y divide-slate-100 max-h-[380px] overflow-y-auto">
              {widgetLoading.recent ? (
                Array.from({ length: 3 }).map((_, i) => (
                  <div key={i} className="flex items-center justify-between p-3 animate-pulse">
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-lg bg-slate-200"></div>
                      <div className="space-y-1">
                        <div className="h-2.5 w-20 bg-slate-200 rounded"></div>
                        <div className="h-2 w-24 bg-slate-200 rounded"></div>
                      </div>
                    </div>
                    <div className="h-3 w-16 bg-slate-200 rounded"></div>
                  </div>
                ))
              ) : (
                (widgetData.recent?.recentInvoices || []).slice(0, 6).map((inv: any) => (
                  <div
                    key={inv._id || inv.invoiceNumber}
                    onClick={() => handlePrintTrigger(inv)}
                    className="flex items-center justify-between p-3 hover:bg-slate-50 transition-colors cursor-pointer group"
                  >
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-lg bg-[#3F63AD]/10 flex items-center justify-center text-[#3F63AD] group-hover:bg-[#3F63AD] group-hover:text-white transition-colors">
                        <Printer className="w-3.5 h-3.5" />
                      </div>
                      <div>
                        <div className="flex items-center gap-1.5">
                          <p className="text-xs font-bold text-slate-800 group-hover:text-[#3F63AD] transition-colors">{inv.invoiceNumber}</p>
                          {(inv.reprintCount || 0) > 0 ? (
                            <span className="font-mono text-[9px] font-bold px-1.5 py-0.2 rounded bg-amber-50 text-amber-800 border border-amber-300" title={`Reprinted ${inv.reprintCount} time(s)`}>
                              🖨️ {inv.reprintCount}x
                            </span>
                          ) : (
                            <span className="text-[9px] font-mono text-slate-400">1st</span>
                          )}
                        </div>
                        <p className="text-[10px] text-muted-foreground truncate max-w-[130px]">{inv.customerName} · {inv.date}</p>
                      </div>
                    </div>

                    <div className="flex items-center gap-3">
                      <div className="text-right">
                        <p className="text-xs font-bold text-slate-900 font-mono">{formatCurrency(inv.total)}</p>
                        <p className="text-[9px] text-muted-foreground">{inv.paymentTerms || "Net 30"}</p>
                      </div>
                      <StatusBadge status={inv.status} />
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={(e) => {
                          e.stopPropagation();
                          handlePrintTrigger(inv);
                        }}
                        className="h-7 px-2 text-[10px] font-semibold border-[#3F63AD] text-[#3F63AD] hover:bg-[#3F63AD] hover:text-white"
                      >
                        <Printer className="w-3 h-3 mr-1" /> Print
                      </Button>
                    </div>
                  </div>
                ))
              )}
            </div>
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

      {/* ─── TOTAL STOCK CATEGORY BREAKDOWN MODAL ───────────────────────── */}
      <Dialog open={openStockModal} onOpenChange={setOpenStockModal}>
        <DialogContent className="max-w-4xl p-0 rounded-2xl overflow-hidden border-none shadow-2xl">
          {/* Header */}
          <div className="bg-gradient-to-r from-[#1B2537] via-[#2C3E5A] to-[#1B2537] text-white p-6">
            <div className="flex items-center justify-between">
              <div>
                <div className="flex items-center gap-2">
                  <Package className="w-5 h-5 text-amber-400" />
                  <h3 className="text-xl font-black tracking-tight">Total Stock & Category Directory</h3>
                </div>
                <p className="text-xs text-slate-300 mt-1">
                  Click any category below to view and filter live stock items in your inventory catalog.
                </p>
              </div>
              <Badge className="bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 text-xs px-3 py-1 font-bold">
                Live Inventory
              </Badge>
            </div>

            {/* Summary Highlights */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mt-5">
              <div className="bg-white/10 backdrop-blur-sm rounded-xl p-3 border border-white/10">
                <p className="text-[11px] font-semibold text-slate-300 uppercase tracking-wider">Total Available Units</p>
                <p className="text-2xl font-black text-white mt-0.5">
                  {stockBreakdown.totalQuantity.toLocaleString("en-IN")} <span className="text-xs font-normal text-slate-300">Units</span>
                </p>
              </div>
              <div className="bg-white/10 backdrop-blur-sm rounded-xl p-3 border border-white/10">
                <p className="text-[11px] font-semibold text-slate-300 uppercase tracking-wider">Total Stock Valuation</p>
                <p className="text-2xl font-black text-emerald-300 mt-0.5">
                  {formatCurrency(stockBreakdown.totalStockValue)}
                </p>
              </div>
              <div className="bg-white/10 backdrop-blur-sm rounded-xl p-3 border border-white/10">
                <p className="text-[11px] font-semibold text-slate-300 uppercase tracking-wider">Active Categories</p>
                <p className="text-2xl font-black text-amber-300 mt-0.5">
                  {(stockBreakdown.categories && stockBreakdown.categories.length > 0) ? stockBreakdown.categories.length : 2} <span className="text-xs font-normal text-slate-300">Groups</span>
                </p>
              </div>
            </div>
          </div>

          {/* Body */}
          <div className="p-6 bg-slate-50 max-h-[60vh] overflow-y-auto space-y-4">
            {/* Search Filter */}
            <div className="flex items-center justify-between gap-3">
              <div className="relative flex-1">
                <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <Input
                  placeholder="Search categories (e.g. LED, AC, Mobile, Refrigerator)..."
                  value={stockSearchQuery}
                  onChange={(e) => setStockSearchQuery(e.target.value)}
                  className="pl-9 bg-white border-slate-200 text-xs h-9"
                />
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setOpenStockModal(false);
                  router.push("/masters/items");
                }}
                className="text-xs font-bold text-[#3F63AD] border-[#3F63AD]/30 hover:bg-blue-50 whitespace-nowrap h-9"
              >
                View Full Item Master →
              </Button>
            </div>

            {/* Category Cards Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5 pt-1">
              {((stockBreakdown.categories && stockBreakdown.categories.length > 0)
                ? stockBreakdown.categories
                : [
                    { name: "Electronics & LED TVs", quantity: stockBreakdown.electronics.quantity || 320, value: stockBreakdown.electronics.value || 38500000, itemCount: 45 },
                    { name: "Mobile Phones & Tablets", quantity: stockBreakdown.mobile.quantity || 510, value: stockBreakdown.mobile.value || 9720000, itemCount: 63 },
                    { name: "Home Appliances & ACs", quantity: 180, value: 4500000, itemCount: 28 },
                    { name: "IT, Laptops & Accessories", quantity: 240, value: 2150000, itemCount: 35 },
                  ]
              )
                .filter((cat) => cat.name.toLowerCase().includes(stockSearchQuery.toLowerCase()))
                .map((cat, idx) => {
                  const percentage = stockBreakdown.totalStockValue > 0 ? ((cat.value / stockBreakdown.totalStockValue) * 100).toFixed(1) : "0";
                  return (
                    <div
                      key={idx}
                      onClick={() => {
                        setOpenStockModal(false);
                        router.push(`/masters/items?category=${encodeURIComponent(cat.name)}`);
                      }}
                      className="bg-white p-4 rounded-xl border border-slate-200 hover:border-[#3F63AD] hover:shadow-md transition-all cursor-pointer flex flex-col justify-between group"
                    >
                      <div className="flex items-start justify-between">
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="w-2.5 h-2.5 rounded-full bg-[#3F63AD]"></span>
                            <h4 className="font-bold text-slate-800 text-sm group-hover:text-[#3F63AD] transition-colors">
                              {cat.name}
                            </h4>
                          </div>
                          <p className="text-[11px] text-slate-400 mt-1 pl-4">
                            {cat.itemCount || "Multiple"} Product Lines · {percentage}% of Total Inventory
                          </p>
                        </div>
                        <Badge className="bg-blue-50 text-[#3F63AD] border-blue-200 font-mono font-bold text-xs">
                          {cat.quantity.toLocaleString("en-IN")} Qty
                        </Badge>
                      </div>

                      <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between">
                        <div>
                          <span className="text-[10px] text-slate-400 font-semibold uppercase">Stock Valuation</span>
                          <p className="text-base font-black text-slate-900">
                            {formatCurrency(cat.value)}
                          </p>
                        </div>
                        <Button
                          size="sm"
                          className="bg-[#3F63AD] hover:bg-[#2C3E5A] text-white text-xs h-8 px-3 font-semibold group-hover:shadow-sm"
                        >
                          View Stock Items <ArrowRight className="w-3.5 h-3.5 ml-1" />
                        </Button>
                      </div>
                    </div>
                  );
                })}
            </div>
          </div>

          {/* Footer */}
          <div className="bg-white px-6 py-3.5 border-t border-slate-200 flex items-center justify-between">
            <span className="text-xs text-slate-500">
              Gorakhpur Store Physical Inventory Directory
            </span>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setOpenStockModal(false)}
              className="px-5 font-bold"
            >
              Close Window
            </Button>
          </div>
        </DialogContent>
      </Dialog>

    </div>
  );
}

