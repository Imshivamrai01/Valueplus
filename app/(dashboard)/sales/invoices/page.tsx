"use client";
import { useState, useMemo } from "react";
import { Plus, Search, Download, Eye, Edit, Trash2, MoreHorizontal, Receipt, CheckCircle, Clock, AlertTriangle, XCircle, Printer } from "lucide-react";
import { toast } from "sonner";
import { PageShell } from "@/components/shared/page-shell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { formatCurrency, formatDate, downloadCSV } from "@/lib/utils";

const CUSTOMERS = ["Sharma Enterprises Pvt Ltd", "Patel Industries", "Kapoor Tech Solutions", "Gupta Electronics Ltd", "Mehta Trading Co.", "Verma Exports", "Singh & Sons", "Kumar Distributors", "Agarwal Holdings", "Joshi Retailers"];
const STATUSES = ["paid", "pending", "overdue", "partial", "cancelled", "draft"] as const;

function generateInvoices() {
  const invoices = [];
  let date = new Date("2025-04-01");
  for (let i = 1; i <= 120; i++) {
    const customer = CUSTOMERS[i % CUSTOMERS.length];
    const total = Math.round((5000 + Math.random() * 500000) / 100) * 100;
    const status = STATUSES[Math.floor(Math.random() * STATUSES.length)];
    const paid = status === "paid" ? total : status === "partial" ? Math.round(total * 0.5) : 0;
    date = new Date(date.getTime() + Math.random() * 3 * 86400000);
    invoices.push({
      id: `INV-2025-${String(i).padStart(4, "0")}`,
      customer,
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

  return (
    <PageShell
      title="Invoices"
      subtitle={`${invoices.length} invoices total`}
      breadcrumbs={[{ label: "Sales", href: "/sales/invoices" }, { label: "Invoices" }]}
      actions={
        <>
          <Button variant="outline" size="sm" onClick={() => downloadCSV(invoices.map(i => ({ ...i })), "invoices.csv")}>
            <Download className="w-4 h-4 mr-1.5" /> Export
          </Button>
          <Button size="sm" onClick={() => toast.success("Opening new invoice form...")}>
            <Plus className="w-4 h-4 mr-1.5" /> New Invoice
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
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Collected</p>
          <p className="text-2xl font-bold mt-1.5 text-emerald-600">{formatCurrency(stats.paid)}</p>
          <p className="text-xs text-muted-foreground mt-2">{invoices.filter(i => i.status === "paid").length} paid</p>
        </div>
        <div className="metric-card">
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Receivables</p>
          <p className="text-2xl font-bold mt-1.5 text-amber-600">{formatCurrency(stats.pending)}</p>
          <p className="text-xs text-muted-foreground mt-2">Pending collection</p>
        </div>
        <div className="metric-card">
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Overdue</p>
          <p className="text-2xl font-bold mt-1.5 text-red-600">{stats.overdue}</p>
          <p className="text-xs text-muted-foreground mt-2">Needs attention</p>
        </div>
      </div>

      {/* Table */}
      <div className="data-table-container">
        <div className="flex flex-wrap items-center gap-3 p-4 border-b">
          <div className="relative flex-1 min-w-48">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input placeholder="Search invoice, customer..." value={search} onChange={(e) => { setSearch(e.target.value); setPage(1); }} className="pl-9" />
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
                {["Invoice #", "Customer", "Date", "Due Date", "Amount", "GST", "Total", "Paid", "Balance", "Status", ""].map((h) => (
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
                    <td className="px-4 py-3 font-mono font-semibold text-[#3F63AD]">{inv.id}</td>
                    <td className="px-4 py-3 font-medium text-foreground max-w-[180px] truncate">{inv.customer}</td>
                    <td className="px-4 py-3 text-muted-foreground whitespace-nowrap">{formatDate(inv.date)}</td>
                    <td className="px-4 py-3 text-muted-foreground whitespace-nowrap">{formatDate(inv.dueDate)}</td>
                    <td className="px-4 py-3 text-right">{formatCurrency(inv.subtotal)}</td>
                    <td className="px-4 py-3 text-right text-muted-foreground">{formatCurrency(inv.gst)}</td>
                    <td className="px-4 py-3 text-right font-semibold">{formatCurrency(inv.total)}</td>
                    <td className="px-4 py-3 text-right text-emerald-600">{formatCurrency(inv.paid)}</td>
                    <td className="px-4 py-3 text-right text-amber-600 font-medium">{formatCurrency(inv.balance)}</td>
                    <td className="px-4 py-3"><Badge variant={statusConf.variant}>{statusConf.label}</Badge></td>
                    <td className="px-4 py-3">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <button className="p-1.5 rounded-lg hover:bg-slate-100 transition-colors"><MoreHorizontal className="w-4 h-4 text-muted-foreground" /></button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-40">
                          <DropdownMenuItem onClick={() => toast.info(`Viewing ${inv.id}`)}><Eye className="w-4 h-4 mr-2" /> View</DropdownMenuItem>
                          <DropdownMenuItem onClick={() => toast.info(`Printing ${inv.id}`)}><Printer className="w-4 h-4 mr-2" /> Print</DropdownMenuItem>
                          <DropdownMenuItem onClick={() => toast.info(`Editing ${inv.id}`)}><Edit className="w-4 h-4 mr-2" /> Edit</DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem className="text-red-600 focus:text-red-600 focus:bg-red-50" onClick={() => { setInvoices(prev => prev.filter(i => i.id !== inv.id)); toast.success("Invoice deleted"); }}><Trash2 className="w-4 h-4 mr-2" /> Delete</DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
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
            {Array.from({ length: Math.min(5, totalPages) }, (_, i) => i + 1).map(p => (
              <button key={p} onClick={() => setPage(p)} className={`w-8 h-8 rounded-lg text-xs font-medium ${page === p ? "bg-[#3F63AD] text-white" : "hover:bg-slate-100"}`}>{p}</button>
            ))}
            <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages} className="px-3 py-1.5 rounded-lg border hover:bg-slate-50 disabled:opacity-50">Next</button>
          </div>
        </div>
      </div>
    </PageShell>
  );
}
