"use client";

import { useState, useMemo, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  Plus, Search, Eye, Edit, Trash2, MoreHorizontal, Receipt, CheckCircle,
  Clock, AlertTriangle, XCircle, Printer, ShoppingCart, User, Building, CreditCard,
  Sparkles, CheckCircle2, FileText, Calendar, MapPin, Calculator, ShieldCheck, Ban, MessageCircle
} from "lucide-react";
import { InvoiceCreationModal } from "@/components/InvoiceCreationModal";
import { toast } from "sonner";
import { AuthorizePinDialog, PinAuthResult } from "@/components/AuthorizePinDialog";
import { PageShell } from "@/components/shared/page-shell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { AutocompleteSearch } from "@/components/shared/autocomplete-search";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { formatCurrency, formatDate, cn } from "@/lib/utils";
import { ExportMenu } from "@/components/shared/ExportMenu";
import { DateRangeFilter, resolveDateRange, isDateInRange } from "@/components/shared/date-range-filter";
import ValueplusInvoice from "@/app/invoice/page";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { getOfflineInvoices, OfflineInvoice } from "@/lib/offline-storage";
import { useOfflineSync } from "@/components/shared/offline-sync-provider";
import { TableShimmer } from "@/components/shared/shimmer-skeleton";
import { WifiOff, RefreshCw, CloudUpload } from "lucide-react";
import { useSession } from "next-auth/react";
import Link from "next/link";

const STATUSES = ["paid", "pending", "overdue", "partial", "cancelled", "draft", "offline"] as const;

const STATUS_CONFIG: Record<string, any> = {
  paid: { variant: "success" as const, icon: CheckCircle2, label: "Paid" },
  pending: { variant: "warning" as const, icon: Clock, label: "Pending" },
  overdue: { variant: "destructive" as const, icon: AlertTriangle, label: "Overdue" },
  partial: { variant: "info" as const, icon: Clock, label: "Partial" },
  cancelled: { variant: "secondary" as const, icon: Ban, label: "Cancelled" },
  draft: { variant: "secondary" as const, icon: Receipt, label: "Draft" },
  offline: { variant: "warning" as const, icon: AlertTriangle, label: "Offline (Queued)" },
};

export default function SalesInvoicesPage() {
  return (
    <Suspense fallback={<div className="p-12 text-center text-muted-foreground">Loading Tax Invoices...</div>}>
      <SalesInvoicesContent />
    </Suspense>
  );
}

function SalesInvoicesContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const queryClient = useQueryClient();
  const { isOnline, pendingCount, isSyncing, syncNow } = useOfflineSync();
  const [offlineInvoices, setOfflineInvoices] = useState<OfflineInvoice[]>([]);

  useEffect(() => {
    setOfflineInvoices(getOfflineInvoices());
    const handleQueueChange = () => setOfflineInvoices(getOfflineInvoices());
    window.addEventListener("valueplus-offline-queue-changed", handleQueueChange);
    return () => window.removeEventListener("valueplus-offline-queue-changed", handleQueueChange);
  }, []);
  const [activeTab, setActiveTab] = useState("customers");
  
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [dateFilter, setDateFilter] = useState("This Month");
  const [dateRange, setDateRange] = useState(() => resolveDateRange("This Month"));
  const [page, setPage] = useState(1);
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const [activePrintInvoice, setActivePrintInvoice] = useState<any | null>(null);
  const [isBillingFormOpen, setIsBillingFormOpen] = useState(false);
  const [activeSuggestRow, setActiveSuggestRow] = useState<number | null>(null);
  const [invoiceToDelete, setInvoiceToDelete] = useState<string | null>(null);
  const [invoiceToCancel, setInvoiceToCancel] = useState<string | null>(null);
  // The PIN and reason now live inside AuthorizePinDialog; this only holds the
  // server's verdict (wrong PIN, locked out, role not allowed) so it can be shown.
  const [authError, setAuthError] = useState<string | null>(null);

  const { data: session } = useSession();
  const userRole = ((session?.user as any)?.role || "admin").toLowerCase();
  const currentUserName = session?.user?.name || "Staff Member";
  const isSuperAdminOrAdmin = userRole === "admin" || userRole === "superadmin" || userRole === "manager" || userRole === "cashier" || userRole === "accountant";
  const isSalesperson = !isSuperAdminOrAdmin;

  useEffect(() => {
    if (searchParams.get("new") === "true") {
      if (isSalesperson) {
        toast.info("Sales staff can generate Commercial Estimates & Quotations. Redirecting to Estimates...");
        router.push("/sales/estimates?new=true");
      } else {
        setIsBillingFormOpen(true);
      }
    }
  }, [searchParams, isSalesperson, router]);

  // CRM Ledger States
  const [isCustomerLedgerOpen, setIsCustomerLedgerOpen] = useState(false);
  const [selectedCustomerForLedger, setSelectedCustomerForLedger] = useState<any | null>(null);
  
  const [isSupplierLedgerOpen, setIsSupplierLedgerOpen] = useState(false);
  const [selectedSupplierForLedger, setSelectedSupplierForLedger] = useState<any | null>(null);

  const { data: invoices = [], isLoading: loadingInvoices } = useQuery({
    queryKey: ["invoices"],
    queryFn: async () => {
      const res = await fetch("/api/invoices");
      const json = await res.json();
      return json.success ? json.data : [];
    }
  });

  const allInvoices = useMemo(() => {
    const serverNos = new Set(invoices.map((i: any) => i.invoiceNumber));
    const pending = offlineInvoices.filter((i: any) => !serverNos.has(i.invoiceNumber)).map(i => ({ 
      ...i, 
      status: "offline",
      paidAmount: i.paidAmount || i.total,
      balanceAmount: i.balanceAmount || 0,
    }));
    return [...pending, ...invoices];
  }, [invoices, offlineInvoices]);

  // Single source of truth for the visible rows. The table body and the pagination
  // footer used to filter separately — the footer left out the date range, so it
  // reported "60 entries" while the body rendered none for a range with no invoices.
  const filteredInvoices = useMemo(() => {
    const q = search.toLowerCase();
    return allInvoices.filter((inv: any) => {
      const matchesSearch =
        !q ||
        inv.invoiceNumber?.toLowerCase().includes(q) ||
        inv.customerName?.toLowerCase().includes(q);
      const matchesStatus = statusFilter === "all" || inv.status === statusFilter;
      const matchesDate = isDateInRange(inv.date || inv.createdAt, dateRange.start, dateRange.end);
      return matchesSearch && matchesStatus && matchesDate;
    });
  }, [allInvoices, search, statusFilter, dateRange.start, dateRange.end]);

  // A filter change can leave `page` past the end of the new result set, which renders
  // an empty table with no way back except paging backwards.
  useEffect(() => {
    setPage(1);
  }, [search, statusFilter, dateRange.start, dateRange.end]);

  const { data: customers = [] } = useQuery({
    queryKey: ["customers"],
    queryFn: async () => {
      const res = await fetch("/api/customers");
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

  const { data: purchaseEntries = [], isLoading: loadingEntries } = useQuery({
    queryKey: ["purchaseEntries"],
    queryFn: async () => {
      const res = await fetch("/api/purchase-entries");
      const json = await res.json();
      return json.success ? json.data : [];
    }
  });

  const { data: suppliers = [] } = useQuery({
    queryKey: ["suppliers"],
    queryFn: async () => {
      const res = await fetch("/api/suppliers");
      const json = await res.json();
      return json.success ? json.data : [];
    }
  });

  const { data: payments = [] } = useQuery({
    queryKey: ["payments"],
    queryFn: async () => {
      const res = await fetch("/api/payments");
      const json = await res.json();
      return json.success ? json.data : [];
    }
  });

  const loading = loadingInvoices;

  const deleteInvoiceMutation = useMutation({
    mutationFn: async ({ invoiceNumber, pin, reason }: { invoiceNumber: string; pin: string; reason: string }) => {
      const res = await fetch(`/api/invoices?invoiceNumber=${encodeURIComponent(invoiceNumber)}`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pin, reason }),
      });
      const json = await res.json();
      if (!json.success) throw new Error(json.error || "Failed to delete invoice");
      return json;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["invoices"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard-stats"] });
      toast.success("Invoice deleted and archived to the audit trail");
      setInvoiceToDelete(null);
      setAuthError(null);
    },
    onError: (error: any) => {
      setAuthError(error.message || "An error occurred while deleting");
    }
  });

  const cancelInvoiceMutation = useMutation({
    mutationFn: async ({ invoiceNumber, reason, pin }: { invoiceNumber: string; reason: string; pin: string }) => {
      const res = await fetch("/api/invoices", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ invoiceNumber, action: "cancel", reason, pin }),
      });
      const json = await res.json();
      if (!json.success) throw new Error(json.error || "Failed to cancel invoice");
      return json;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["invoices"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard-stats"] });
      toast.success("Invoice cancelled successfully");
      setInvoiceToCancel(null);
      setAuthError(null);
    },
    onError: (error: any) => {
      setAuthError(error.message || "An error occurred while cancelling");
    }
  });

  // The PIN is no longer compared in the browser — it goes to the API, which
  // checks it against the user's own hashed PIN and refuses without it.
  const handleConfirmCancel = ({ pin, reason }: PinAuthResult) => {
    if (!invoiceToCancel) return;
    setAuthError(null);
    cancelInvoiceMutation.mutate({ invoiceNumber: invoiceToCancel, reason, pin });
  };

  const handleConfirmDelete = ({ pin, reason }: PinAuthResult) => {
    if (!invoiceToDelete) return;
    setAuthError(null);
    deleteInvoiceMutation.mutate({ invoiceNumber: invoiceToDelete, pin, reason });
  };

  return (
    <PageShell
      title="Invoices & GST Billing"
      subtitle={
        filteredInvoices.length === allInvoices.length
          ? `${allInvoices.length} GST Tax Invoices (${offlineInvoices.length} queued offline)`
          : `${filteredInvoices.length} of ${allInvoices.length} GST Tax Invoices shown • ${dateFilter} (${offlineInvoices.length} queued offline)`
      }
      breadcrumbs={[{ label: "Sales", href: "/sales/invoices" }, { label: "Invoices" }]}
      actions={
        <>
          {pendingCount > 0 && (
            <Button 
              variant="outline" 
              size="sm" 
              onClick={syncNow} 
              disabled={!isOnline || isSyncing}
              className="bg-amber-50 border-amber-300 text-amber-900 font-bold hover:bg-amber-100 h-9"
            >
              <RefreshCw className={`w-3.5 h-3.5 mr-1.5 ${isSyncing ? "animate-spin" : ""}`} />
              {isSyncing ? "Syncing..." : `Sync Offline (${pendingCount})`}
            </Button>
          )}
          <ExportMenu
            className="h-9"
            title="Invoices & GST Billing"
            subtitle={`${allInvoices.length} GST Tax Invoices`}
            data={allInvoices.map(i => ({ ...i }))}
            filename="invoices"
          />
          {!isSalesperson ? (
            <Button size="sm" onClick={() => setIsBillingFormOpen(true)} className="bg-[#3F63AD] hover:bg-[#2E4F95] text-white font-bold shadow-md h-9">
              <Plus className="w-4 h-4 mr-1.5" /> New Invoice Billing
            </Button>
          ) : (
            <Button 
              size="sm" 
              onClick={() => router.push("/sales/estimates?new=true")} 
              className="bg-[#76C043] hover:bg-[#60a82c] text-slate-950 font-black shadow-md h-9"
            >
              <Plus className="w-4 h-4 mr-1.5" /> + Create Estimate
            </Button>
          )}
        </>
      }
    >
      {isSalesperson && (
        <div className="bg-amber-50/90 border border-amber-200 text-amber-900 px-4 py-3 rounded-xl mb-4 text-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-xs">
          <div className="flex items-start sm:items-center gap-2.5">
            <span className="text-lg">ℹ️</span>
            <div>
              <p className="font-bold text-amber-950">Sales Staff View: Tax Invoice Billing is managed by Store Cashier / Admin Desk.</p>
              <p className="text-amber-800 text-[11px] mt-0.5">
                As a Salesperson, you can prepare customer quotations at <Link href="/sales/estimates" className="underline font-bold text-amber-950 hover:text-blue-700">Sales &gt; Estimates</Link>. When the Cashier bills the customer, it will automatically count toward your sales & incentives.
              </p>
            </div>
          </div>
          <Button 
            size="sm" 
            onClick={() => router.push("/sales/estimates?new=true")} 
            className="bg-[#76C043] hover:bg-[#60a82c] text-slate-950 font-bold text-xs h-7.5 px-3 self-start sm:self-auto shrink-0"
          >
            Create Estimate
          </Button>
        </div>
      )}
      <Tabs defaultValue="customers" className="w-full">
        <TabsList className="mb-6 grid w-full max-w-md grid-cols-2">
          <TabsTrigger value="customers">Customers Ledger & Billing</TabsTrigger>
          <TabsTrigger value="suppliers">Suppliers Ledger & Bills</TabsTrigger>
        </TabsList>

        <TabsContent value="customers" className="space-y-6">
      {/* Table */}
      <div className="data-table-container">
        <div className="flex flex-wrap items-center gap-3 p-4 border-b">
          <AutocompleteSearch
            data={allInvoices}
            searchKeys={["invoiceNumber", "customerName", "phone"]}
            displayKey="invoiceNumber"
            subDisplayKey="customerName"
            placeholder="Search invoice #, customer..."
            value={search}
            onSearchChange={(val) => { setSearch(val); setPage(1); }}
            className="flex-1 min-w-48"
          />
          <Select value={statusFilter} onValueChange={(v) => { setStatusFilter(v); setPage(1); }}>
            <SelectTrigger className="w-40"><SelectValue placeholder="Status" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              {Object.entries(STATUS_CONFIG).map(([k, v]) => <SelectItem key={k} value={k}>{v.label}</SelectItem>)}
            </SelectContent>
          </Select>
          <DateRangeFilter 
            value={dateFilter} 
            onChange={(val, s, e) => { 
              setDateFilter(val); 
              if (s && e) setDateRange({ start: s, end: e }); 
              setPage(1); 
            }} 
            className="w-40" 
            showIcon={true} 
          />
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 border-b">
              <tr>
                {["Invoice #", "Customer Name", "Invoice Date", "Due Date", "Taxable", "GST", "Total Amount", "Paid", "Balance", "Status", "Action"].map((h) => (
                  <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wide whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y">
              {loading ? (
                <tr><td colSpan={11} className="p-0"><TableShimmer rows={7} cols={11} /></td></tr>
              ) : allInvoices.length === 0 ? (
                <tr><td colSpan={11} className="py-16 text-center text-muted-foreground">No invoices found</td></tr>
              ) : filteredInvoices.length === 0 ? (
                <tr>
                  <td colSpan={11} className="py-16 text-center">
                    <p className="text-sm font-semibold text-foreground">
                      No invoices match the current filters
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">
                      {allInvoices.length} invoice{allInvoices.length === 1 ? "" : "s"} exist, but none fall in
                      {" "}<span className="font-semibold">{dateFilter}</span>
                      {statusFilter !== "all" && <> with status <span className="font-semibold">{statusFilter}</span></>}
                      {search && <> matching “{search}”</>}.
                    </p>
                    <div className="flex items-center justify-center gap-2 mt-3">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setDateFilter("Last Year");
                          setDateRange(resolveDateRange("Last Year"));
                        }}
                      >
                        Widen to Last Year
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          setSearch("");
                          setStatusFilter("all");
                          setDateFilter("Last Year");
                          setDateRange(resolveDateRange("Last Year"));
                        }}
                      >
                        Clear all filters
                      </Button>
                    </div>
                  </td>
                </tr>
              ) : (
                filteredInvoices
                  .slice((page - 1) * 10, page * 10)
                  .map((inv: any) => {
                    const isDraft = inv.status === "draft";
                    const StatusIcon = STATUS_CONFIG[inv.status as keyof typeof STATUS_CONFIG]?.icon || Receipt;
                    return (
                      <tr key={inv._id || inv.invoiceNumber} className="hover:bg-slate-50/70 transition-colors">
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <button 
                              className="font-semibold text-foreground hover:text-[#3F63AD] hover:underline flex items-center gap-1"
                              onClick={() => {
                                setActivePrintInvoice(inv);
                                setIsPreviewOpen(true);
                              }}
                            >
                              {inv.invoiceNumber}
                              <FileText className="w-3 h-3 text-muted-foreground" />
                            </button>
                            {(inv.reprintCount || 0) > 0 ? (
                              <span 
                                className="font-mono text-[9px] font-bold px-1.5 py-0.2 rounded bg-amber-50 text-amber-800 border border-amber-300"
                                title={`Reprinted ${inv.reprintCount} times`}
                              >
                                🖨️ {inv.reprintCount}x
                              </span>
                            ) : (
                              <span className="text-[9px] font-mono text-slate-400">1st</span>
                            )}
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex flex-col">
                            <span className="font-semibold text-foreground">{inv.customerName}</span>
                          </div>
                        </td>
                        <td className="px-4 py-3 text-muted-foreground">{formatDate(inv.date || inv.createdAt)}</td>
                        <td className="px-4 py-3 text-muted-foreground">{formatDate(inv.dueDate || inv.createdAt)}</td>
                        <td className="px-4 py-3 font-mono">{formatCurrency(inv.subtotal || 0)}</td>
                        <td className="px-4 py-3 font-mono">{formatCurrency(inv.totalGST || 0)}</td>
                        <td className="px-4 py-3 font-bold font-mono text-[#3F63AD]">{formatCurrency(inv.total || 0)}</td>
                        <td className="px-4 py-3 font-mono text-emerald-600">{formatCurrency(inv.paidAmount || (inv.status === "paid" ? inv.total : 0) || 0)}</td>
                        <td className="px-4 py-3 font-mono text-red-600">{formatCurrency((inv.total || 0) - (inv.paidAmount || (inv.status === "paid" ? inv.total : 0) || 0))}</td>
                        <td className="px-4 py-3">
                          <Badge variant={STATUS_CONFIG[inv.status as keyof typeof STATUS_CONFIG]?.variant || "secondary"} className="gap-1.5 whitespace-nowrap">
                            <StatusIcon className="w-3 h-3" />
                            {STATUS_CONFIG[inv.status as keyof typeof STATUS_CONFIG]?.label || "Draft"}
                          </Badge>
                        </td>
                        <td className="px-4 py-3 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            <Button 
                              variant="outline" 
                              size="sm" 
                              className="h-7 px-2 text-[11px] font-semibold border-[#3F63AD]/40 text-[#3F63AD] hover:bg-[#3F63AD] hover:text-white"
                              onClick={() => {
                                setActivePrintInvoice(inv);
                                setIsPreviewOpen(true);
                              }}
                              title="Print Official Invoice"
                            >
                              <Printer className="w-3 h-3 mr-1" /> Print
                            </Button>
                            <Button 
                              variant="outline" 
                              size="sm" 
                              className="h-7 w-7 p-0 border-emerald-500 text-emerald-600 hover:bg-emerald-500 hover:text-white"
                              onClick={() => {
                                const cleanPhone = (inv.customerPhone || "").replace(/\D/g, "");
                                const ph = cleanPhone.length === 10 ? `91${cleanPhone}` : cleanPhone;
                                const msg = encodeURIComponent(
                                  `*VALUE PLUS / ASHOKA ENTERPRISES*\nTax Invoice #${inv.invoiceNumber}\nDate: ${inv.date || "Today"}\nCustomer: ${inv.customerName}\nTotal Amount: ₹${Number(inv.total || 0).toLocaleString("en-IN")}\nStatus: ${inv.status}\n\nThank you for choosing Value Plus! For support call 9140860604.`
                                );
                                window.open(ph ? `https://wa.me/${ph}?text=${msg}` : `https://wa.me/?text=${msg}`, '_blank');
                              }}
                              title="Share on WhatsApp"
                            >
                              <MessageCircle className="w-3.5 h-3.5" />
                            </Button>
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-foreground">
                                  <MoreHorizontal className="h-4 w-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end" className="w-48">
                                <DropdownMenuItem 
                                  className="gap-2 cursor-pointer text-[#3F63AD]"
                                  onClick={() => {
                                    setActivePrintInvoice(inv);
                                    setIsPreviewOpen(true);
                                  }}
                                >
                                  <Eye className="h-4 w-4" /> Full Invoice Preview
                                </DropdownMenuItem>
                                <DropdownMenuSeparator />
                                {inv.status !== "cancelled" && (
                                  <DropdownMenuItem
                                    className="gap-2 cursor-pointer text-amber-700 focus:text-amber-700"
                                    onClick={() => setInvoiceToCancel(inv.invoiceNumber)}
                                  >
                                    <Ban className="h-4 w-4" /> Cancel Invoice
                                  </DropdownMenuItem>
                                )}
                                <DropdownMenuItem
                                  className="gap-2 cursor-pointer text-red-600 focus:text-red-600"
                                  onClick={() => setInvoiceToDelete(inv.invoiceNumber)}
                                >
                                  <Trash2 className="h-4 w-4" /> Delete Invoice
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </div>
                        </td>
                      </tr>
                    );
                })
              )}
            </tbody>
          </table>
        </div>
        {(() => {
          const filtered = filteredInvoices;
          if (filtered.length > 10) {
            return (
              <div className="p-4 border-t flex items-center justify-between bg-slate-50 rounded-b-xl mt-auto">
                <span className="text-xs text-muted-foreground">Showing {(page - 1) * 10 + 1} to {Math.min(page * 10, filtered.length)} of {filtered.length} entries</span>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" disabled={page === 1} onClick={() => setPage(p => p - 1)}>Prev</Button>
                  <Button variant="outline" size="sm" disabled={page * 10 >= filtered.length} onClick={() => setPage(p => p + 1)}>Next</Button>
                </div>
              </div>
            );
          }
          return null;
        })()}
      </div>
      </TabsContent>

      <TabsContent value="suppliers" className="space-y-6">
        <div className="data-table-container">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 border-b">
                <tr>
                  {["Supplier", "Outstanding Funds", "Last Payment", "Payment History"].map((h) => (
                    <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wide whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y">
                {suppliers.length === 0 ? (
                  <tr><td colSpan={4} className="py-16 text-center text-muted-foreground">No suppliers found</td></tr>
                ) : suppliers.map((sup: any) => {
                  return (
                    <tr key={sup._id} className="hover:bg-slate-50/70 transition-colors">
                      <td className="px-4 py-3">
                        <button 
                          className="font-semibold text-foreground hover:text-[#3F63AD] hover:underline flex items-center gap-1.5"
                          onClick={() => {
                            setSelectedSupplierForLedger(sup);
                            setIsSupplierLedgerOpen(true);
                          }}
                        >
                          {sup.name}
                          <FileText className="w-3 h-3 text-muted-foreground" />
                        </button>
                      </td>
                      <td className="px-4 py-3 text-amber-600 font-bold">0</td>
                      <td className="px-4 py-3">
                        <span className="text-muted-foreground text-xs">No payments</span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex flex-col gap-1 max-w-[300px]">
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </TabsContent>
      </Tabs>


      <InvoiceCreationModal 
        isOpen={isBillingFormOpen} 
        onClose={() => setIsBillingFormOpen(false)} 
        onSuccess={() => setIsBillingFormOpen(false)}
      />

      {/* FULL INVOICE PREVIEW MODAL */}
      <Dialog open={isPreviewOpen} onOpenChange={setIsPreviewOpen}>
        <DialogContent className="max-w-5xl max-h-[92vh] overflow-y-auto p-2">
          {activePrintInvoice && (() => {
            const customer = customers.find((c: any) => c._id === activePrintInvoice.customerId);
            const enrichedData = { ...activePrintInvoice };
            if (customer) {
              if (!enrichedData.customerAddress) enrichedData.customerAddress = customer.billingAddress?.line1 || customer.address || "";
              if (!enrichedData.customerCity) enrichedData.customerCity = customer.billingAddress?.city || customer.city || "";
              if (!enrichedData.customerState) enrichedData.customerState = customer.billingAddress?.state || customer.state || "";
              if (!enrichedData.customerPin) enrichedData.customerPin = customer.billingAddress?.pincode || customer.pincode || customer.pin || "";
              if (!enrichedData.customerPhone) enrichedData.customerPhone = customer.phone || "";
              if (!enrichedData.customerEmail) enrichedData.customerEmail = customer.email || "";
              if (!enrichedData.placeOfSupply) enrichedData.placeOfSupply = customer.billingAddress?.state || customer.state || "Uttar Pradesh (09)";
            }
            return (
              <ValueplusInvoice 
                invoiceData={enrichedData} 
                onBack={() => {
                  setIsPreviewOpen(false);
                  queryClient.invalidateQueries({ queryKey: ["invoices"] });
                }} 
              />
            );
          })()}
        </DialogContent>
      </Dialog>

      {/* Delete and Cancel both go through the one authorisation dialog: a PIN the
          server verifies, and a reason the audit trail keeps. */}
      <AuthorizePinDialog
        open={!!invoiceToDelete}
        onOpenChange={(open) => {
          if (!open) {
            setInvoiceToDelete(null);
            setAuthError(null);
          }
        }}
        onConfirm={handleConfirmDelete}
        title={`Delete Invoice ${invoiceToDelete || ""}`}
        description="The bill is removed from the live list, but a full copy is archived so the admin can still see what was deleted, by whom and why."
        confirmLabel="Delete Invoice"
        isPending={deleteInvoiceMutation.isPending}
        errorMessage={authError}
      />

      <AuthorizePinDialog
        open={!!invoiceToCancel}
        onOpenChange={(open) => {
          if (!open) {
            setInvoiceToCancel(null);
            setAuthError(null);
          }
        }}
        onConfirm={handleConfirmCancel}
        title={`Cancel Invoice ${invoiceToCancel || ""}`}
        description="Voids the bill and reverses stock and the customer balance. The invoice stays on record and appears in the Payment Leakage audit."
        confirmLabel="Confirm Cancellation"
        destructive={false}
        isPending={cancelInvoiceMutation.isPending}
        errorMessage={authError}
      />

      {/* CUSTOMER LEDGER MODAL */}
      <Dialog open={isCustomerLedgerOpen} onOpenChange={setIsCustomerLedgerOpen}>
        <DialogContent className="max-w-4xl p-0 overflow-hidden rounded-2xl border-none shadow-2xl">
          {selectedCustomerForLedger && (() => {
            const c = selectedCustomerForLedger;
            const custInvoices = invoices.filter((inv: any) => inv.customerName === c.name || inv.customerId === c._id);
            const custPayments = payments.filter((p: any) => p.partyId === c._id || p.partyId === c.code);
            
            const totalBilled = custInvoices.reduce((a: number, inv: any) => a + (inv.type === "credit-note" ? -(inv.total || 0) : (inv.total || 0)), 0);
            const invoicePaidAmounts = custInvoices.reduce((a: number, inv: any) => a + (inv.paidAmount || (inv.status === 'paid' ? inv.total : 0) || 0), 0);
            const txPaidAmounts = custPayments.reduce((a: number, p: any) => a + (p.type === "paid" ? -p.amount : p.amount), 0);
            const totalPaid = invoicePaidAmounts + txPaidAmounts;
            const balance = totalBilled - totalPaid;

            const transactions = [
              ...custInvoices.map((inv: any) => ({ ...inv, txType: "invoice", txDate: new Date(inv.date || inv.createdAt) })),
              ...custPayments.map((p: any) => ({ ...p, txType: "payment", txDate: new Date(p.date) }))
            ].sort((a: any, b: any) => b.txDate.getTime() - a.txDate.getTime());

            return (
              <>
                <div className="bg-slate-900 text-white p-6">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-xl bg-white/10 flex items-center justify-center">
                      <FileText className="w-6 h-6 text-[#3F63AD]" />
                    </div>
                    <div>
                      <h3 className="text-xl font-bold tracking-tight">{c.name} - CRM Ledger</h3>
                      <p className="text-xs text-slate-300 mt-0.5">{c.phone} | {c.email || 'No email'}</p>
                    </div>
                  </div>
                </div>
                <div className="p-6 bg-slate-50">
                  <div className="grid grid-cols-3 gap-4 mb-6">
                    <div className="bg-white p-4 rounded-xl border shadow-sm">
                      <p className="text-xs font-semibold text-muted-foreground uppercase">Total Invoiced</p>
                      <p className="text-xl font-bold mt-1 text-slate-800">{formatCurrency(totalBilled)}</p>
                    </div>
                    <div className="bg-white p-4 rounded-xl border shadow-sm">
                      <p className="text-xs font-semibold text-muted-foreground uppercase">Total Received</p>
                      <p className="text-xl font-bold mt-1 text-emerald-600">{formatCurrency(totalPaid)}</p>
                    </div>
                    <div className="bg-white p-4 rounded-xl border shadow-sm">
                      <p className="text-xs font-semibold text-muted-foreground uppercase">Pending Balance</p>
                      <p className="text-xl font-bold mt-1 text-red-600">{formatCurrency(balance)}</p>
                    </div>
                  </div>
                  <div className="bg-white rounded-xl border shadow-sm overflow-hidden h-[300px] overflow-y-auto">
                    <table className="w-full text-sm">
                      <thead className="bg-slate-50 border-b sticky top-0">
                        <tr>
                          <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase">Date</th>
                          <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase">Transaction</th>
                          <th className="px-4 py-3 text-right text-xs font-semibold text-muted-foreground uppercase">Debit (Billed)</th>
                          <th className="px-4 py-3 text-right text-xs font-semibold text-muted-foreground uppercase">Credit (Paid)</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y">
                        {transactions.map((tx, idx) => (
                          <tr key={idx} className="hover:bg-slate-50">
                            <td className="px-4 py-3 text-muted-foreground">{new Date(tx.txDate).toLocaleDateString()}</td>
                            <td className="px-4 py-3">
                              {tx.txType === "invoice" ? (
                                <div><p className="font-semibold">Invoice #{tx.invoiceNumber || tx.id}</p></div>
                              ) : (
                                <div><p className="font-semibold text-emerald-700">Payment Received via {tx.paymentMode}</p></div>
                              )}
                            </td>
                            <td className="px-4 py-3 text-right font-medium">
                              {tx.txType === "invoice" ? (tx.type === "credit-note" ? <span className="text-red-600">-{formatCurrency(tx.total)}</span> : formatCurrency(tx.total)) : "-"}
                            </td>
                            <td className="px-4 py-3 text-right font-medium">
                              {tx.txType === "payment" ? (
                                <span className={tx.type === "paid" ? "text-red-600" : "text-emerald-600"}>
                                  {tx.type === "paid" ? `-${formatCurrency(tx.amount)}` : formatCurrency(tx.amount)}
                                </span>
                              ) : "-"}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </>
            );
          })()}
        </DialogContent>
      </Dialog>

      {/* SUPPLIER LEDGER MODAL */}
      <Dialog open={isSupplierLedgerOpen} onOpenChange={setIsSupplierLedgerOpen}>
        <DialogContent className="max-w-4xl p-0 overflow-hidden rounded-2xl border-none shadow-2xl">
          {selectedSupplierForLedger && (() => {
            const sup = selectedSupplierForLedger;
            const supBills = purchaseEntries.filter((b: any) => b.supplier === sup.name || b.supplierId === sup._id);
            const supPayments = payments.filter((p: any) => p.partyId === sup._id || p.partyId === sup.code);
            
            const totalBilled = supBills.reduce((a: any, b: any) => a + (b.totalAmount || b.total || 0), 0);
            const totalPaid = supPayments.reduce((a: any, p: any) => a + p.amount, 0);
            const balance = totalBilled - totalPaid;

            const transactions = [
              ...supBills.map((b: any) => ({ ...b, txType: "bill", txDate: new Date(b.date) })),
              ...supPayments.map((p: any) => ({ ...p, txType: "payment", txDate: new Date(p.date) }))
            ].sort((a, b) => b.txDate.getTime() - a.txDate.getTime());

            return (
              <>
                <div className="bg-slate-900 text-white p-6">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-xl bg-white/10 flex items-center justify-center">
                      <FileText className="w-6 h-6 text-[#76C043]" />
                    </div>
                    <div>
                      <h3 className="text-xl font-bold tracking-tight">{sup.name} - Supplier Ledger</h3>
                      <p className="text-xs text-slate-300 mt-0.5">{sup.code} | {sup.phone}</p>
                    </div>
                  </div>
                </div>
                <div className="p-6 bg-slate-50">
                  <div className="grid grid-cols-3 gap-4 mb-6">
                    <div className="bg-white p-4 rounded-xl border shadow-sm">
                      <p className="text-xs font-semibold text-muted-foreground uppercase">Total Payables</p>
                      <p className="text-xl font-bold mt-1 text-slate-800">{formatCurrency(totalBilled)}</p>
                    </div>
                    <div className="bg-white p-4 rounded-xl border shadow-sm">
                      <p className="text-xs font-semibold text-muted-foreground uppercase">Total Paid</p>
                      <p className="text-xl font-bold mt-1 text-emerald-600">{formatCurrency(totalPaid)}</p>
                    </div>
                    <div className="bg-white p-4 rounded-xl border shadow-sm">
                      <p className="text-xs font-semibold text-muted-foreground uppercase">Current Pending</p>
                      <p className="text-xl font-bold mt-1 text-red-600">{formatCurrency(balance)}</p>
                    </div>
                  </div>
                  <div className="bg-white rounded-xl border shadow-sm overflow-hidden h-[300px] overflow-y-auto">
                    <table className="w-full text-sm">
                      <thead className="bg-slate-50 border-b sticky top-0">
                        <tr>
                          <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase">Date</th>
                          <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase">Transaction</th>
                          <th className="px-4 py-3 text-right text-xs font-semibold text-muted-foreground uppercase">Credit (Billed)</th>
                          <th className="px-4 py-3 text-right text-xs font-semibold text-muted-foreground uppercase">Debit (Paid)</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y">
                        {transactions.map((tx, idx) => (
                          <tr key={idx} className="hover:bg-slate-50">
                            <td className="px-4 py-3 text-muted-foreground">{new Date(tx.txDate).toLocaleDateString()}</td>
                            <td className="px-4 py-3">
                              {tx.txType === "bill" ? (
                                <div><p className="font-semibold">Purchase Bill #{tx.billNo || tx.id}</p></div>
                              ) : (
                                <div><p className="font-semibold text-emerald-700">Payment Issued via {tx.paymentMode}</p></div>
                              )}
                            </td>
                            <td className="px-4 py-3 text-right font-medium">
                              {tx.txType === "bill" ? formatCurrency(tx.total || tx.totalAmount || 0) : "-"}
                            </td>
                            <td className="px-4 py-3 text-right font-medium">
                              {tx.txType === "payment" ? <span className="text-emerald-600">{formatCurrency(tx.amount)}</span> : "-"}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </>
            );
          })()}
        </DialogContent>
      </Dialog>
    </PageShell>
  );
}
