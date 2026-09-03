"use client";

import { useMemo, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { PageShell } from "@/components/shared/page-shell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { TableShimmer } from "@/components/shared/shimmer-skeleton";
import { DateRangeFilter, resolveDateRange } from "@/components/shared/date-range-filter";
import { Plus, Search, Trash2, Download, WalletCards, ArrowDownLeft, ArrowUpRight } from "lucide-react";
import { toast } from "sonner";
import { formatCurrency, formatDate, cn, downloadCSV } from "@/lib/utils";
import { RoleGuard, usePermissions } from "@/components/shared/role-guard";
import { VendorPaymentModal } from "@/components/vendor/VendorPaymentModal";

export default function VendorPaymentsPage() {
  return (
    <RoleGuard permission="ledger.vendor.view">
      <VendorPaymentsInner />
    </RoleGuard>
  );
}

function VendorPaymentsInner() {
  const queryClient = useQueryClient();
  const { can } = usePermissions();
  const [search, setSearch] = useState("");
  const [dateFilter, setDateFilter] = useState("All Time");
  const [range, setRange] = useState<{ start?: string; end?: string }>({});
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<any | null>(null);

  const { data: payments = [], isLoading } = useQuery({
    queryKey: ["vendor-payments", range.start, range.end],
    queryFn: async () => {
      const qs = new URLSearchParams();
      if (range.start) qs.set("from", range.start);
      if (range.end) qs.set("to", range.end);
      const res = await fetch(`/api/vendors/payments?${qs.toString()}`);
      const json = await res.json();
      if (!json.success) throw new Error(json.error);
      return json.data;
    },
  });

  const { data: vendors = [] } = useQuery({
    queryKey: ["vendors"],
    queryFn: async () => {
      const res = await fetch("/api/vendors");
      const json = await res.json();
      return json.success ? json.data : [];
    },
  });

  const removeMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/vendors/payments?id=${id}`, { method: "DELETE" });
      const json = await res.json();
      if (!json.success) throw new Error(json.error);
      return json;
    },
    onSuccess: () => {
      toast.success("Payment removed");
      queryClient.invalidateQueries({ queryKey: ["vendor-payments"] });
      queryClient.invalidateQueries({ queryKey: ["all-ledgers"] });
      queryClient.invalidateQueries({ queryKey: ["vendor-ledger-all"] });
      setDeleteTarget(null);
    },
    onError: (e: any) => {
      toast.error(e.message);
      setDeleteTarget(null);
    },
  });

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return payments;
    return (payments as any[]).filter(
      (p) =>
        p.vendorName?.toLowerCase().includes(q) ||
        p.paymentId?.toLowerCase().includes(q) ||
        p.refNo?.toLowerCase().includes(q) ||
        p.againstBillNo?.toLowerCase().includes(q)
    );
  }, [payments, search]);

  const stats = useMemo(() => {
    let received = 0;
    let refunded = 0;
    for (const p of filtered as any[]) {
      if (p.type === "paid") refunded += Number(p.amount) || 0;
      else received += Number(p.amount) || 0;
    }
    return { received, refunded, net: received - refunded, count: filtered.length };
  }, [filtered]);

  const handleDateChange = (value: string, start?: string, end?: string) => {
    setDateFilter(value);
    if (value === "All Time") {
      setRange({});
      return;
    }
    const resolved = start && end ? { start, end } : resolveDateRange(value);
    setRange({ start: resolved.start, end: resolved.end });
  };

  return (
    <PageShell
      title="Vendor Payments"
      subtitle={`${stats.count} payment entries`}
      breadcrumbs={[{ label: "Vendors & Ledger" }, { label: "Payments" }]}
      actions={
        <div className="flex items-center gap-2">
          <DateRangeFilter value={dateFilter} onChange={handleDateChange} className="w-[150px]" />
          <Button
            variant="outline"
            size="sm"
            onClick={() => handleDateChange("All Time")}
            className={cn("h-9 text-xs", dateFilter === "All Time" && "border-[#3F63AD] text-[#3F63AD]")}
          >
            All Time
          </Button>
          {can("ledger.export") && (
            <Button
              variant="outline"
              size="sm"
              className="h-9"
              onClick={() =>
                downloadCSV(
                  (filtered as any[]).map((p) => ({
                    Date: p.date,
                    Vendor: p.vendorName,
                    Amount: p.amount,
                    Mode: p.mode,
                    Direction: p.type,
                    Ref: p.refNo || "",
                    "Against Bill": p.againstBillNo || "",
                    "Recorded By": p.createdBy || "",
                  })),
                  "vendor-payments.csv"
                )
              }
            >
              <Download className="w-3.5 h-3.5 mr-1.5" /> Export
            </Button>
          )}
          {can("payment.record") && (
            <Button size="sm" onClick={() => setIsFormOpen(true)}>
              <Plus className="w-4 h-4 mr-1.5" /> Record Payment
            </Button>
          )}
        </div>
      }
    >
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Metric label="Received In" value={formatCurrency(stats.received)} tone="emerald" />
        <Metric label="Refunded Out" value={formatCurrency(stats.refunded)} tone="red" />
        <Metric label="Net Collected" value={formatCurrency(stats.net)} />
        <Metric label="Entries" value={String(stats.count)} />
      </div>

      <div className="data-table-container">
        <div className="flex items-center gap-3 p-4 border-b">
          <div className="relative flex-1 max-w-sm">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <Input
              placeholder="Search by vendor, reference or bill…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9"
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 border-b">
              <tr>
                {["Date", "Vendor", "Mode / Ref", "Against Bill", "Recorded By", "Amount", ""].map(
                  (h, i) => (
                    <th
                      key={i}
                      className={cn(
                        "px-4 py-3 text-xs font-semibold text-muted-foreground uppercase",
                        h === "Amount" ? "text-right" : "text-left"
                      )}
                    >
                      {h}
                    </th>
                  )
                )}
              </tr>
            </thead>
            <tbody className="divide-y">
              {isLoading ? (
                <tr>
                  <td colSpan={7} className="p-0">
                    <TableShimmer rows={6} cols={7} />
                  </td>
                </tr>
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={7} className="text-center p-10 text-muted-foreground">
                    <WalletCards className="w-8 h-8 mx-auto mb-2 text-slate-300" />
                    No vendor payments recorded yet.
                  </td>
                </tr>
              ) : (
                (filtered as any[]).map((p) => (
                  <tr key={p._id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-4 py-3 text-muted-foreground whitespace-nowrap">
                      {formatDate(p.date)}
                    </td>
                    <td className="px-4 py-3">
                      <p className="font-semibold text-foreground">{p.vendorName}</p>
                      <p className="text-[10px] font-mono text-slate-400">{p.paymentId}</p>
                    </td>
                    <td className="px-4 py-3">
                      <Badge variant="secondary" className="text-[10px] font-semibold">
                        {p.mode}
                      </Badge>
                      {p.refNo && <p className="text-[10px] text-slate-400 mt-0.5">{p.refNo}</p>}
                    </td>
                    <td className="px-4 py-3 font-mono text-xs text-slate-600">
                      {p.againstBillNo || "On account"}
                    </td>
                    <td className="px-4 py-3 text-xs text-muted-foreground">
                      {p.createdBy || "—"}
                      {p.createdByRole && (
                        <p className="text-[10px] text-slate-400 capitalize">{p.createdByRole}</p>
                      )}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <span
                        className={cn(
                          "inline-flex items-center gap-1 font-bold tabular-nums",
                          p.type === "paid" ? "text-red-600" : "text-emerald-600"
                        )}
                      >
                        {p.type === "paid" ? (
                          <ArrowUpRight className="w-3.5 h-3.5" />
                        ) : (
                          <ArrowDownLeft className="w-3.5 h-3.5" />
                        )}
                        {formatCurrency(p.amount)}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      {can("payment.record") && (
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-red-500 hover:bg-red-50"
                          onClick={() => setDeleteTarget(p)}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      <VendorPaymentModal open={isFormOpen} onOpenChange={setIsFormOpen} vendors={vendors} />

      <Dialog open={Boolean(deleteTarget)} onOpenChange={(o) => !o && setDeleteTarget(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Remove this payment?</DialogTitle>
            <DialogDescription>
              {deleteTarget && (
                <>
                  {formatCurrency(deleteTarget.amount)} from {deleteTarget.vendorName} on{" "}
                  {formatDate(deleteTarget.date)} will be removed, and their pending balance will go
                  back up by that amount.
                </>
              )}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteTarget(null)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={() => removeMutation.mutate(deleteTarget._id)}
              disabled={removeMutation.isPending}
            >
              {removeMutation.isPending ? "Removing…" : "Remove"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </PageShell>
  );
}

function Metric({
  label,
  value,
  tone = "slate",
}: {
  label: string;
  value: string;
  tone?: "slate" | "emerald" | "red";
}) {
  const toneClass = { slate: "", emerald: "text-emerald-600", red: "text-red-600" }[tone];
  return (
    <div className="metric-card">
      <p className={`text-2xl font-bold ${toneClass}`}>{value}</p>
      <p className="text-xs text-muted-foreground mt-1">{label}</p>
    </div>
  );
}
