"use client";

import { useState } from "react";
import {
  TrendingUp, TrendingDown, DollarSign, ShoppingCart, Package,
  Users, AlertTriangle, ArrowRight, Eye, MoreHorizontal,
  IndianRupee, Receipt, Wallet, CreditCard, Activity,
  Star, Sparkles,
} from "lucide-react";
import {
  AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
} from "recharts";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { cn, formatCurrency, indianNumberFormat } from "@/lib/utils";

// ─── DUMMY DATA ────────────────────────────────────────────────
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

const MONTHLY_REVENUE = [
  { month: "Apr", revenue: 2850000, expense: 1920000, profit: 930000 },
  { month: "May", revenue: 3120000, expense: 2100000, profit: 1020000 },
  { month: "Jun", revenue: 2980000, expense: 1850000, profit: 1130000 },
  { month: "Jul", revenue: 3450000, expense: 2250000, profit: 1200000 },
  { month: "Aug", revenue: 3780000, expense: 2380000, profit: 1400000 },
  { month: "Sep", revenue: 3600000, expense: 2150000, profit: 1450000 },
  { month: "Oct", revenue: 4120000, expense: 2680000, profit: 1440000 },
  { month: "Nov", revenue: 4560000, expense: 2900000, profit: 1660000 },
  { month: "Dec", revenue: 5200000, expense: 3100000, profit: 2100000 },
  { month: "Jan", revenue: 4850000, expense: 2950000, profit: 1900000 },
  { month: "Feb", revenue: 4300000, expense: 2750000, profit: 1550000 },
  { month: "Mar", revenue: 5680000, expense: 3200000, profit: 2480000 },
];

const INVENTORY_STATUS = [
  { name: "In Stock", value: 68, color: "#10B981" },
  { name: "Low Stock", value: 18, color: "#F59E0B" },
  { name: "Out of Stock", value: 14, color: "#EF4444" },
];

const TOP_PRODUCTS = [
  { name: "iPhone 15 Pro Max", sales: 342, revenue: 1540000, growth: 12.4 },
  { name: "MacBook Air M3", sales: 287, revenue: 1230000, growth: 8.7 },
  { name: "Sony Bravia 65\" 4K", sales: 156, revenue: 980000, growth: 21.3 },
  { name: "Samsung Galaxy S24 Ultra", sales: 198, revenue: 850000, growth: -3.2 },
  { name: "AirPods Pro Gen 2", sales: 321, revenue: 720000, growth: 15.6 },
];

const TOP_CUSTOMERS = [
  { name: "Sharma Enterprises Pvt Ltd", city: "Mumbai", amount: 2840000, invoices: 18, status: "active" },
  { name: "Patel Industries", city: "Ahmedabad", amount: 2120000, invoices: 14, status: "active" },
  { name: "Kapoor Tech Solutions", city: "Bengaluru", amount: 1890000, invoices: 12, status: "active" },
  { name: "Gupta Electronics Ltd", city: "Delhi", amount: 1650000, invoices: 9, status: "active" },
  { name: "Mehta Trading Co.", city: "Pune", amount: 1430000, invoices: 11, status: "active" },
];

const RECENT_INVOICES = [
  { id: "INV-2025-0891", customer: "Sharma Enterprises", amount: 145000, date: "Today, 2:30 PM", status: "paid" },
  { id: "INV-2025-0890", customer: "Patel Industries", amount: 89500, date: "Today, 11:15 AM", status: "pending" },
  { id: "INV-2025-0889", customer: "Kapoor Tech", amount: 234000, date: "Yesterday", status: "overdue" },
  { id: "INV-2025-0888", customer: "Gupta Electronics", amount: 67800, date: "Yesterday", status: "paid" },
  { id: "INV-2025-0887", customer: "Mehta Trading", amount: 312500, date: "01 Aug 2025", status: "partial" },
];

const ACTIVITIES = [
  { action: "Invoice created", detail: "INV-2025-0891 · ₹1,45,000", time: "2 min ago", color: "#3F63AD" },
  { action: "Payment received", detail: "₹89,500 from Patel Industries", time: "18 min ago", color: "#10B981" },
  { action: "Stock adjusted", detail: "Laptop Stand Pro — +50 units", time: "45 min ago", color: "#76C043" },
  { action: "PO approved", detail: "PO-2025-0124 · Rahul Electronics", time: "1 hr ago", color: "#F59E0B" },
  { action: "Customer added", detail: "Verma Exports Pvt Ltd", time: "2 hr ago", color: "#3F63AD" },
  { action: "Credit note issued", detail: "CN-2025-0034 · ₹12,000", time: "3 hr ago", color: "#EF4444" },
];

const AI_INSIGHTS = [
  { icon: "📈", title: "Revenue trend positive", desc: "Revenue is up 18.4% compared to last month. Consider stocking high-demand SKUs." },
  { icon: "⚠️", title: "42 items low on stock", desc: "USB-C Hub and Laptop Stand Pro need restocking within 7 days based on sales velocity." },
  { icon: "💰", title: "Outstanding ₹8.4L receivables", desc: "3 invoices overdue by 30+ days. Recommend sending payment reminders today." },
  { icon: "🧾", title: "GSTR-1 due in 3 days", desc: "₹12.6L GST liability pending for July. File before 11th August to avoid penalties." },
];

// ─── METRIC CARD ───────────────────────────────────────────────
interface MetricCardProps {
  title: string;
  value: string;
  change: number;
  icon: React.ElementType;
  color: string;
  bg: string;
  subtitle?: string;
}

function MetricCard({ title, value, change, icon: Icon, color, bg, subtitle }: MetricCardProps) {
  const isPositive = change >= 0;
  return (
    <div className="metric-card group">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">{title}</p>
          <p className="text-2xl font-bold text-foreground mt-1.5">{value}</p>
          {subtitle && <p className="text-xs text-muted-foreground mt-0.5">{subtitle}</p>}
        </div>
        <div className={cn("w-11 h-11 rounded-2xl flex items-center justify-center", bg)}>
          <Icon className={cn("w-5 h-5", color)} />
        </div>
      </div>
      <div className="mt-4 flex items-center gap-1.5">
        <div className={cn("flex items-center gap-0.5 text-xs font-semibold px-2 py-0.5 rounded-full",
          isPositive ? "bg-emerald-50 text-emerald-600" : "bg-red-50 text-red-600"
        )}>
          {isPositive ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
          {Math.abs(change)}%
        </div>
        <span className="text-xs text-muted-foreground">vs last month</span>
      </div>
    </div>
  );
}

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
    pending: { variant: "warning", label: "Pending" },
    overdue: { variant: "destructive", label: "Overdue" },
    partial: { variant: "info", label: "Partial" },
    active: { variant: "success", label: "Active" },
  };
  const config = map[status] ?? { variant: "secondary", label: status };
  return <Badge variant={config.variant}>{config.label}</Badge>;
}

// ─── HEALTH SCORE ──────────────────────────────────────────────
function HealthScore() {
  const score = 78;
  return (
    <div className="metric-card">
      <div className="flex items-center justify-between mb-4">
        <div>
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Business Health</p>
          <p className="text-2xl font-bold mt-1">{score}<span className="text-base font-medium text-muted-foreground">/100</span></p>
        </div>
        <div className="w-14 h-14 relative">
          <svg viewBox="0 0 56 56" className="w-full h-full -rotate-90">
            <circle cx="28" cy="28" r="22" fill="none" stroke="#E5E7EB" strokeWidth="6" />
            <circle
              cx="28" cy="28" r="22"
              fill="none"
              stroke={score >= 80 ? "#10B981" : score >= 60 ? "#F59E0B" : "#EF4444"}
              strokeWidth="6"
              strokeDasharray={`${(score / 100) * 138.2} 138.2`}
              strokeLinecap="round"
            />
          </svg>
          <Activity className="absolute inset-0 m-auto w-5 h-5 text-[#3F63AD]" />
        </div>
      </div>
      <div className="space-y-2.5">
        {[
          { label: "Cash Flow", value: 85, color: "#10B981" },
          { label: "Receivables", value: 62, color: "#F59E0B" },
          { label: "Inventory", value: 78, color: "#3F63AD" },
          { label: "Profitability", value: 88, color: "#76C043" },
        ].map((item) => (
          <div key={item.label}>
            <div className="flex justify-between text-xs mb-1">
              <span className="text-muted-foreground">{item.label}</span>
              <span className="font-medium">{item.value}%</span>
            </div>
            <div className="h-1.5 rounded-full bg-slate-100 overflow-hidden">
              <div
                className="h-full rounded-full transition-all duration-700"
                style={{ width: `${item.value}%`, backgroundColor: item.color }}
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── MAIN DASHBOARD ────────────────────────────────────────────
export default function DashboardPage() {
  const [viewMode, setViewMode] = useState<"daily" | "monthly">("monthly");

  const chartData = viewMode === "daily" ? DAILY_REVENUE : MONTHLY_REVENUE;
  const xAxisKey = viewMode === "daily" ? "date" : "month";
  
  // Example dynamic totals
  const totalRev = viewMode === "daily" ? "₹2.34L" : "₹56.8L";
  const netProfit = viewMode === "daily" ? "₹1.36L" : "₹24.8L";

  return (
    <div className="page-container">
      {/* Header */}
      <div className="page-header">
        <div>
          <h1 className="text-xl font-bold text-foreground">Dashboard</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Friday, 01 August 2026 · FY 2026–27 · Q2
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm">
            <Eye className="w-4 h-4 mr-2" /> Reports
          </Button>
          <Button size="sm">
            <Receipt className="w-4 h-4 mr-2" /> New Invoice
          </Button>
        </div>
      </div>

      <div className="page-content">
        {/* Toggle & KPI Cards */}
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold">Business Overview</h2>
          <div className="flex items-center bg-slate-100 p-1 rounded-xl">
            <button 
              onClick={() => setViewMode("daily")} 
              className={cn("px-4 py-1.5 rounded-lg text-sm font-medium transition-colors", viewMode === "daily" ? "bg-white shadow-sm text-foreground" : "text-muted-foreground hover:text-foreground")}
            >
              Daily
            </button>
            <button 
              onClick={() => setViewMode("monthly")} 
              className={cn("px-4 py-1.5 rounded-lg text-sm font-medium transition-colors", viewMode === "monthly" ? "bg-white shadow-sm text-foreground" : "text-muted-foreground hover:text-foreground")}
            >
              Monthly
            </button>
          </div>
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <MetricCard
            title="Total Revenue"
            value={totalRev}
            change={18.4}
            icon={IndianRupee}
            color="text-[#3F63AD]"
            bg="bg-[#3F63AD]/10"
            subtitle={viewMode === "daily" ? "Today's collection" : "This financial year"}
          />
          <MetricCard
            title="Net Profit"
            value={netProfit}
            change={22.1}
            icon={TrendingUp}
            color="text-emerald-600"
            bg="bg-emerald-50"
            subtitle={viewMode === "daily" ? "58% daily margin" : "43.7% profit margin"}
          />
          <MetricCard
            title="Receivables"
            value="₹8.4L"
            change={-5.2}
            icon={Wallet}
            color="text-amber-600"
            bg="bg-amber-50"
            subtitle="12 invoices pending"
          />
          <MetricCard
            title="Cash Balance"
            value="₹18.2L"
            change={9.8}
            icon={CreditCard}
            color="text-[#76C043]"
            bg="bg-[#76C043]/10"
            subtitle="Across all accounts"
          />
        </div>

        {/* Second row KPIs */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <MetricCard title="Today's Sales" value="₹2,34,500" change={12.3} icon={Receipt} color="text-blue-600" bg="bg-blue-50" />
          <MetricCard title="Today's Purchase" value="₹98,200" change={-4.1} icon={ShoppingCart} color="text-purple-600" bg="bg-purple-50" />
          <MetricCard title="Pending Orders" value="28" change={8.0} icon={Package} color="text-orange-600" bg="bg-orange-50" />
          <MetricCard title="Low Stock Items" value="42" change={-14.2} icon={AlertTriangle} color="text-red-600" bg="bg-red-50" />
        </div>

        {/* Charts Row */}
        <div className="grid lg:grid-cols-3 gap-6">
          {/* Revenue Chart */}
          <div className="lg:col-span-2 data-table-container p-6">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h3 className="font-semibold text-foreground">Revenue & Profit Trend</h3>
                <p className="text-xs text-muted-foreground mt-0.5">Performance tracking</p>
              </div>
            </div>
            <ResponsiveContainer width="100%" height={260}>
              <AreaChart data={chartData} margin={{ top: 0, right: 0, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="revGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#3F63AD" stopOpacity={0.15} />
                    <stop offset="95%" stopColor="#3F63AD" stopOpacity={0.02} />
                  </linearGradient>
                  <linearGradient id="expGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#EF4444" stopOpacity={0.12} />
                    <stop offset="95%" stopColor="#EF4444" stopOpacity={0.02} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" />
                <XAxis dataKey={xAxisKey} tick={{ fontSize: 11, fill: "#94A3B8" }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 11, fill: "#94A3B8" }} axisLine={false} tickLine={false} tickFormatter={(v) => viewMode === 'daily' ? `₹${(v / 1000).toFixed(0)}k` : `₹${(v / 100000).toFixed(0)}L`} />
                <Tooltip content={<CustomTooltip />} />
                <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 12 }} />
                <Area type="monotone" dataKey="revenue" name="Revenue" stroke="#3F63AD" strokeWidth={2} fill="url(#revGradient)" dot={false} />
                <Area type="monotone" dataKey="expense" name="Expense" stroke="#EF4444" strokeWidth={2} fill="url(#expGradient)" dot={false} />
                <Area type="monotone" dataKey="profit" name="Profit" stroke="#76C043" strokeWidth={2} fill="none" dot={false} strokeDasharray="5 3" />
              </AreaChart>
            </ResponsiveContainer>
          </div>

          {/* Inventory Status */}
          <div className="data-table-container p-6">
            <div className="flex items-center justify-between mb-6">
              <h3 className="font-semibold text-foreground">Inventory Status</h3>
              <MoreHorizontal className="w-4 h-4 text-muted-foreground cursor-pointer hover:text-foreground transition-colors" />
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
            <div className="space-y-3 mt-2">
              {INVENTORY_STATUS.map((item) => (
                <div key={item.name} className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full" style={{ backgroundColor: item.color }} />
                    <span className="text-sm text-muted-foreground">{item.name}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Progress value={item.value} className="w-16 h-1.5" />
                    <span className="text-sm font-semibold w-8 text-right">{item.value}%</span>
                  </div>
                </div>
              ))}
            </div>
            <div className="mt-4 pt-4 border-t">
              <div className="grid grid-cols-3 gap-2 text-center">
                <div>
                  <p className="text-lg font-bold text-foreground">485</p>
                  <p className="text-[10px] text-muted-foreground">Total SKUs</p>
                </div>
                <div>
                  <p className="text-lg font-bold text-amber-600">42</p>
                  <p className="text-[10px] text-muted-foreground">Low Stock</p>
                </div>
                <div>
                  <p className="text-lg font-bold text-red-600">14</p>
                  <p className="text-[10px] text-muted-foreground">Out of Stock</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Middle Row */}
        <div className="grid lg:grid-cols-3 gap-6">
          {/* Top Products */}
          <div className="data-table-container p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-foreground">Top Products</h3>
              <Button variant="ghost" size="sm" className="text-[#3F63AD] h-7 px-2 text-xs">
                View All <ArrowRight className="w-3 h-3 ml-1" />
              </Button>
            </div>
            <div className="space-y-3">
              {TOP_PRODUCTS.map((product, i) => (
                <div key={product.name} className="flex items-center gap-3 p-2 rounded-xl hover:bg-slate-50 transition-colors">
                  <div className="w-7 h-7 rounded-xl bg-[#3F63AD]/10 flex items-center justify-center text-xs font-bold text-[#3F63AD] flex-shrink-0">
                    {i + 1}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-foreground truncate">{product.name}</p>
                    <p className="text-xs text-muted-foreground">{product.sales} units · {indianNumberFormat(product.revenue)}</p>
                  </div>
                  <div className={cn("flex items-center gap-0.5 text-xs font-semibold",
                    product.growth >= 0 ? "text-emerald-600" : "text-red-500"
                  )}>
                    {product.growth >= 0 ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
                    {Math.abs(product.growth)}%
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Top Customers */}
          <div className="data-table-container p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-foreground">Top Customers</h3>
              <Button variant="ghost" size="sm" className="text-[#3F63AD] h-7 px-2 text-xs">
                View All <ArrowRight className="w-3 h-3 ml-1" />
              </Button>
            </div>
            <div className="space-y-3">
              {TOP_CUSTOMERS.map((customer) => (
                <div key={customer.name} className="flex items-center gap-3 p-2 rounded-xl hover:bg-slate-50 transition-colors">
                  <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-[#3F63AD] to-[#2E4F95] flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
                    {customer.name.charAt(0)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-foreground truncate">{customer.name}</p>
                    <p className="text-xs text-muted-foreground">{customer.city} · {customer.invoices} invoices</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-semibold text-foreground">{indianNumberFormat(customer.amount)}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Health Score */}
          <HealthScore />
        </div>

        {/* Bottom Row */}
        <div className="grid lg:grid-cols-3 gap-6">
          {/* Recent Invoices */}
          <div className="lg:col-span-2 data-table-container">
            <div className="flex items-center justify-between p-5 border-b">
              <h3 className="font-semibold text-foreground">Recent Invoices</h3>
              <Button variant="ghost" size="sm" className="text-[#3F63AD] h-7 px-2 text-xs">
                View All <ArrowRight className="w-3 h-3 ml-1" />
              </Button>
            </div>
            <div className="divide-y divide-border">
              {RECENT_INVOICES.map((inv) => (
                <div
                  key={inv.id}
                  className="flex items-center gap-4 px-5 py-3.5 hover:bg-slate-50/70 transition-colors cursor-pointer group"
                >
                  <div className="w-9 h-9 rounded-xl bg-[#3F63AD]/10 flex items-center justify-center flex-shrink-0">
                    <Receipt className="w-4 h-4 text-[#3F63AD]" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-foreground group-hover:text-[#3F63AD] transition-colors">{inv.id}</p>
                    <p className="text-xs text-muted-foreground">{inv.customer} · {inv.date}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-semibold text-foreground">{formatCurrency(inv.amount)}</p>
                    <div className="mt-0.5 flex justify-end">
                      <StatusBadge status={inv.status} />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Today's Activities + AI Insights */}
          <div className="space-y-4">
            {/* AI Insights */}
            <div className="data-table-container p-5">
              <div className="flex items-center gap-2 mb-4">
                <Sparkles className="w-4 h-4 text-[#3F63AD]" />
                <h3 className="font-semibold text-foreground text-sm">AI Insights</h3>
              </div>
              <div className="space-y-3">
                {AI_INSIGHTS.slice(0, 3).map((insight) => (
                  <div key={insight.title} className="p-3 rounded-xl bg-slate-50 border border-border hover:border-[#3F63AD]/30 transition-colors cursor-pointer">
                    <div className="flex items-start gap-2.5">
                      <span className="text-base">{insight.icon}</span>
                      <div>
                        <p className="text-xs font-semibold text-foreground">{insight.title}</p>
                        <p className="text-[11px] text-muted-foreground mt-0.5 leading-relaxed">{insight.desc}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Activities */}
            <div className="data-table-container p-5">
              <h3 className="font-semibold text-foreground text-sm mb-4">Today's Activity</h3>
              <div className="space-y-3">
                {ACTIVITIES.map((activity, i) => (
                  <div key={i} className="flex items-start gap-3">
                    <div
                      className="w-2 h-2 rounded-full mt-1.5 flex-shrink-0"
                      style={{ backgroundColor: activity.color }}
                    />
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-medium text-foreground">{activity.action}</p>
                      <p className="text-[11px] text-muted-foreground truncate">{activity.detail}</p>
                    </div>
                    <p className="text-[10px] text-muted-foreground whitespace-nowrap">{activity.time}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Monthly Bar Chart */}
        <div className="data-table-container p-6">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h3 className="font-semibold text-foreground">Monthly Sales Performance</h3>
              <p className="text-xs text-muted-foreground mt-0.5">Revenue breakdown across FY 2025–26</p>
            </div>
            <Badge variant="info">FY 2025–26</Badge>
          </div>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={MONTHLY_REVENUE} margin={{ top: 0, right: 0, left: 0, bottom: 0 }} barGap={4}>
              <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" vertical={false} />
              <XAxis dataKey="month" tick={{ fontSize: 11, fill: "#94A3B8" }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 11, fill: "#94A3B8" }} axisLine={false} tickLine={false} tickFormatter={(v) => `₹${(v / 100000).toFixed(0)}L`} />
              <Tooltip content={<CustomTooltip />} />
              <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 12 }} />
              <Bar dataKey="revenue" name="Revenue" fill="#3F63AD" radius={[6, 6, 0, 0]} />
              <Bar dataKey="expense" name="Expense" fill="#FCA5A5" radius={[6, 6, 0, 0]} />
              <Bar dataKey="profit" name="Profit" fill="#76C043" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}
