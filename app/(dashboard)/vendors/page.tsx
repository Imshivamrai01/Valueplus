"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { PageShell } from "@/components/shared/page-shell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { TableShimmer } from "@/components/shared/shimmer-skeleton";
import { Plus, Search, Edit, Trash2, FileText, Receipt, WalletCards, Building2 } from "lucide-react";
import { toast } from "sonner";
import { formatCurrency } from "@/lib/utils";
import { RoleGuard, usePermissions } from "@/components/shared/role-guard";
import { PartyLedgerPanel } from "@/components/PartyLedgerPanel";
import { VendorFormModal } from "@/components/vendor/VendorFormModal";
import { VendorPaymentModal } from "@/components/vendor/VendorPaymentModal";
import { VendorBillModal } from "@/components/vendor/VendorBillModal";

const PER_PAGE = 10;

export default function VendorsPage() {
  return (
    <RoleGuard permission="ledger.vendor.view">
      <VendorsPageInner />
    </RoleGuard>
  );
}

function VendorsPageInner() {
  const queryClient = useQueryClient();
  const router = useRouter();
  const { can } = usePermissions();

  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [formVendor, setFormVendor] = useState<any | null>(null);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [ledgerVendor, setLedgerVendor] = useState<any | null>(null);
  const [paymentVendor, setPaymentVendor] = useState<any | null>(null);
  const [billVendor, setBillVendor] = useState<any | null>(null);
  const [deleteVendor, setDeleteVendor] = useState<any | null>(null);

  const { data: vendors = [], isLoading } = useQuery({
    queryKey: ["vendors"],
    queryFn: async () => {
      const res = await fetch("/api/vendors");
      const json = await res.json();
      if (!json.success) throw new Error(json.error);
      return json.data;
    },
  });

  // Balances come from the ledger endpoint rather than a stored field, so this
  // list can never drift from what the ledger drawer shows.
  const { data: ledgerSummary } = useQuery({
    queryKey: ["vendor-ledger-all"],
    queryFn: async () => {
      const res = await fetch("/api/vendors/ledger?party=vendor");
      const json = await res.json();
      return json.success ? json.data : null;
    },
  });

  const balanceByVendor = useMemo(() => {
    const map = new Map<string, number>();
    for (const p of ledgerSummary?.parties || []) {
      map.set(String(p._id), p.summary?.closingBalance ?? 0);
    }
    return map;
  }, [ledgerSummary]);

  const removeMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/vendors?id=${id}`, { method: "DELETE" });
      const json = await res.json();
      if (!json.success) throw new Error(json.error);
      return json;
    },
    onSuccess: (json: any) => {
      toast.success(json.message || "Vendor deleted");
      queryClient.invalidateQueries({ queryKey: ["vendors"] });
      queryClient.invalidateQueries({ queryKey: ["vendor-ledger-all"] });
      setDeleteVendor(null);
    },
    onError: (e: any) => {
      toast.error(e.message);
      setDeleteVendor(null);
    },
  });

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return vendors;
    return (vendors as any[]).filter(
      (v) =>
        v.name?.toLowerCase().includes(q) ||
        v.code?.toLowerCase().includes(q) ||
        v.phone?.includes(q) ||
        v.gstNumber?.toLowerCase().includes(q)
    );
  }, [vendors, search]);

  const paginated = filtered.slice((page - 1) * PER_PAGE, page * PER_PAGE);
  const totalPages = Math.max(1, Math.ceil(filtered.length / PER_PAGE));

  const totals = ledgerSummary?.totals;

  return (
    <PageShell
      title="Vendors"
      subtitle={`${vendors.length} vendors on account`}
      breadcrumbs={[{ label: "Vendors & Ledger" }, { label: "Vendor Master" }]}
      actions={
        can("vendor.manage") ? (
          <Button
            size="sm"
            onClick={() => {
              setFormVendor(null);
              setIsFormOpen(true);
            }}
          >
            <Plus className="w-4 h-4 mr-1.5" /> Add Vendor
          </Button>
        ) : null
      }
    >
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Metric label="Total Vendors" value={String(vendors.length)} />
        <Metric
          label="Active"
          value={String((vendors as any[]).filter((v) => v.status === "active").length)}
        />
        <Metric
          label="Total Receivable"
          value={formatCurrency(totals?.outstanding || 0)}
          tone="amber"
        />
        <Metric label="Overdue" value={formatCurrency(totals?.overdue || 0)} tone="red" />
      </div>

      <div className="data-table-container">
        <div className="flex items-center gap-3 p-4 border-b">
          <div className="relative flex-1 max-w-sm">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <Input
              placeholder="Search vendors by name, code, phone or GST…"
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
              className="pl-9"
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 border-b">
              <tr>
                {["Code", "Vendor Name", "Contact", "Location", "GSTIN", "Pending", "Status", "Action"].map(
                  (h) => (
                    <th
                      key={h}
                      className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase"
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
                  <td colSpan={8} className="p-0">
                    <TableShimmer rows={6} cols={8} />
                  </td>
                </tr>
              ) : paginated.length === 0 ? (
                <tr>
                  <td colSpan={8} className="text-center p-10 text-muted-foreground">
                    <Building2 className="w-8 h-8 mx-auto mb-2 text-slate-300" />
                    No vendors yet. Add one to start tracking their ledger.
                  </td>
                </tr>
              ) : (
                paginated.map((v: any) => {
                  const pending = balanceByVendor.get(String(v._id)) ?? 0;
                  return (
                    <tr key={v._id} className="hover:bg-slate-50 transition-colors">
                      <td className="px-4 py-3 font-mono font-bold text-[#3F63AD]">{v.code}</td>
                      <td className="px-4 py-3">
                        <button
                          onClick={() => router.push(`/vendors/${v._id}`)}
                          className="font-semibold text-foreground hover:text-[#3F63AD] hover:underline text-left"
                        >
                          {v.name}
                        </button>
                        {v.contactPerson && (
                          <p className="text-xs text-muted-foreground">{v.contactPerson}</p>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <p className="font-medium text-foreground">{v.phone}</p>
                        <p className="text-xs text-muted-foreground">{v.email}</p>
                      </td>
                      <td className="px-4 py-3 text-muted-foreground">
                        {[v.address?.city, v.address?.state].filter(Boolean).join(", ") || "—"}
                      </td>
                      <td className="px-4 py-3 font-mono text-xs text-slate-700">
                        {v.gstNumber || "—"}
                      </td>
                      <td
                        className={`px-4 py-3 font-semibold tabular-nums ${
                          pending > 0 ? "text-amber-600" : "text-emerald-600"
                        }`}
                      >
                        {formatCurrency(pending)}
                      </td>
                      <td className="px-4 py-3">
                        <Badge variant={v.status === "active" ? "success" : "secondary"}>
                          {v.status}
                        </Badge>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center justify-end gap-1.5">
                          <Button
                            variant="outline"
                            size="sm"
                            className="h-8 gap-1.5 text-blue-600 hover:text-blue-700 bg-blue-50/50 border-blue-200"
                            onClick={() => router.push(`/vendors/${v._id}`)}
                          >
                            <FileText className="w-3.5 h-3.5" /> Ledger
                          </Button>
                          {can("vendor.manage") && (
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 text-slate-600 hover:bg-slate-100"
                              title="Raise bill"
                              onClick={() => setBillVendor(v)}
                            >
                              <Receipt className="w-4 h-4" />
                            </Button>
                          )}
                          {can("payment.record") && (
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 text-emerald-600 hover:bg-emerald-50"
                              title="Record payment"
                              onClick={() => setPaymentVendor(v)}
                            >
                              <WalletCards className="w-4 h-4" />
                            </Button>
                          )}
                          {can("vendor.manage") && (
                            <>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8 text-blue-600 hover:bg-blue-50"
                                onClick={() => {
                                  setFormVendor(v);
                                  setIsFormOpen(true);
                                }}
                              >
                                <Edit className="w-4 h-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8 text-red-500 hover:bg-red-50"
                                onClick={() => setDeleteVendor(v)}
                              >
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        <div className="flex items-center justify-between px-4 py-3 border-t text-sm text-muted-foreground">
          <p>
            Showing {filtered.length === 0 ? 0 : (page - 1) * PER_PAGE + 1}–
            {Math.min(page * PER_PAGE, filtered.length)} of {filtered.length}
          </p>
          <div className="flex items-center gap-1">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page === 1}
              className="px-3 py-1.5 rounded-lg border hover:bg-slate-50 disabled:opacity-50"
            >
              Previous
            </button>
            <button
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page >= totalPages}
              className="px-3 py-1.5 rounded-lg border hover:bg-slate-50 disabled:opacity-50"
            >
              Next
            </button>
          </div>
        </div>
      </div>

      <VendorFormModal open={isFormOpen} onOpenChange={setIsFormOpen} vendor={formVendor} />

      <VendorBillModal
        open={Boolean(billVendor)}
        onOpenChange={(o) => !o && setBillVendor(null)}
        vendorId={billVendor?._id}
        vendors={vendors}
      />

      <VendorPaymentModal
        open={Boolean(paymentVendor)}
        onOpenChange={(o) => !o && setPaymentVendor(null)}
        vendorId={paymentVendor?._id}
        vendors={vendors}
      />

      <Dialog open={Boolean(ledgerVendor)} onOpenChange={(o) => !o && setLedgerVendor(null)}>
        <DialogContent className="max-w-5xl p-0 overflow-hidden rounded-2xl border-none shadow-2xl">
          {ledgerVendor && (
            <PartyLedgerPanel
              party="vendor"
              partyId={ledgerVendor._id}
              onRecordPayment={() => {
                setPaymentVendor(ledgerVendor);
                setLedgerVendor(null);
              }}
            />
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={Boolean(deleteVendor)} onOpenChange={(o) => !o && setDeleteVendor(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Delete vendor?</DialogTitle>
            <DialogDescription>
              {deleteVendor?.name} will be removed. A vendor that already has bills or payments
              is marked inactive instead, so its ledger history stays intact.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteVendor(null)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={() => removeMutation.mutate(deleteVendor._id)}
              disabled={removeMutation.isPending}
            >
              {removeMutation.isPending ? "Deleting…" : "Delete"}
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
  tone?: "slate" | "amber" | "red";
}) {
  const toneClass = { slate: "", amber: "text-amber-600", red: "text-red-600" }[tone];
  return (
    <div className="metric-card">
      <p className={`text-2xl font-bold ${toneClass}`}>{value}</p>
      <p className="text-xs text-muted-foreground mt-1">{label}</p>
    </div>
  );
}
