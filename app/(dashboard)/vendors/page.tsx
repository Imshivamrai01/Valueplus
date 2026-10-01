"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { PageShell } from "@/components/shared/page-shell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { TableShimmer } from "@/components/shared/shimmer-skeleton";
import { Plus, Search, Edit, Trash2, FileText, Receipt, WalletCards, Building2 } from "lucide-react";
import { toast } from "sonner";
import { formatCurrency, cn } from "@/lib/utils";
import { RoleGuard, usePermissions, AccessDenied } from "@/components/shared/role-guard";
import { PartyLedgerPanel, LedgerParty } from "@/components/PartyLedgerPanel";
import { VendorFormModal } from "@/components/vendor/VendorFormModal";
import { VendorPaymentModal } from "@/components/vendor/VendorPaymentModal";
import { VendorBillModal } from "@/components/vendor/VendorBillModal";
import { PaymentModal } from "@/components/PaymentModal";
import { ExportMenu } from "@/components/shared/ExportMenu";

const PER_PAGE = 10;

const EMPTY_SUPPLIER_FORM = {
  code: "",
  name: "",
  email: "",
  phone: "",
  addressLine1: "",
  city: "",
  state: "",
  pincode: "",
  gst: "",
};

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

  const [party, setParty] = useState<LedgerParty>("vendor");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [formVendor, setFormVendor] = useState<any | null>(null);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [ledgerVendor, setLedgerVendor] = useState<any | null>(null);
  const [paymentVendor, setPaymentVendor] = useState<any | null>(null);
  const [billVendor, setBillVendor] = useState<any | null>(null);
  const [deleteVendor, setDeleteVendor] = useState<any | null>(null);

  const [ledgerSupplier, setLedgerSupplier] = useState<any | null>(null);
  const [paymentSupplierId, setPaymentSupplierId] = useState<string | null>(null);
  const [supplierForm, setSupplierForm] = useState(EMPTY_SUPPLIER_FORM);
  const [editingSupplier, setEditingSupplier] = useState<any | null>(null);
  const [isSupplierFormOpen, setIsSupplierFormOpen] = useState(false);
  const [deleteSupplier, setDeleteSupplier] = useState<any | null>(null);

  const canSeeSuppliers = can("ledger.supplier.view");
  const isPayable = party === "supplier";

  const { data: vendors = [], isLoading: vendorsLoading } = useQuery({
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
  const { data: vendorLedgerSummary } = useQuery({
    queryKey: ["vendor-ledger-all"],
    queryFn: async () => {
      const res = await fetch("/api/vendors/ledger?party=vendor");
      const json = await res.json();
      return json.success ? json.data : null;
    },
  });

  const { data: suppliers = [], isLoading: suppliersLoading } = useQuery({
    queryKey: ["suppliers"],
    queryFn: async () => {
      const res = await fetch("/api/suppliers");
      const json = await res.json();
      if (!json.success) throw new Error(json.error);
      return json.data;
    },
    enabled: party === "supplier",
  });

  const { data: supplierLedgerSummary } = useQuery({
    queryKey: ["supplier-ledger-all"],
    queryFn: async () => {
      const res = await fetch("/api/vendors/ledger?party=supplier");
      const json = await res.json();
      return json.success ? json.data : null;
    },
    enabled: party === "supplier",
  });

  const balanceByVendor = useMemo(() => {
    const map = new Map<string, number>();
    for (const p of vendorLedgerSummary?.parties || []) {
      map.set(String(p._id), p.summary?.closingBalance ?? 0);
    }
    return map;
  }, [vendorLedgerSummary]);

  const balanceBySupplier = useMemo(() => {
    const map = new Map<string, { pending: number; overdue: number }>();
    for (const p of supplierLedgerSummary?.parties || []) {
      map.set(String(p._id), {
        pending: p.summary?.closingBalance ?? 0,
        overdue: p.summary?.overdueAmount ?? 0,
      });
    }
    return map;
  }, [supplierLedgerSummary]);

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

  const removeSupplierMutation = useMutation({
    mutationFn: async (code: string) => {
      const res = await fetch(`/api/suppliers?code=${code}`, { method: "DELETE" });
      const json = await res.json();
      if (!json.success) throw new Error(json.error);
      return json;
    },
    onSuccess: () => {
      toast.success("Supplier deleted");
      queryClient.invalidateQueries({ queryKey: ["suppliers"] });
      queryClient.invalidateQueries({ queryKey: ["supplier-ledger-all"] });
      setDeleteSupplier(null);
    },
    onError: (e: any) => {
      toast.error(e.message);
      setDeleteSupplier(null);
    },
  });

  const saveSupplierMutation = useMutation({
    mutationFn: async (payload: any) => {
      const method = editingSupplier ? "PUT" : "POST";
      const res = await fetch("/api/suppliers", {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const json = await res.json();
      if (!json.success) throw new Error(json.error || "Failed to save supplier");
      return json.data;
    },
    onSuccess: () => {
      toast.success(editingSupplier ? "Supplier updated" : "Supplier added");
      setIsSupplierFormOpen(false);
      queryClient.invalidateQueries({ queryKey: ["suppliers"] });
    },
    onError: (e: any) => toast.error(e.message),
  });

  const filtered = useMemo(() => {
    const list = party === "vendor" ? vendors : suppliers;
    const q = search.trim().toLowerCase();
    if (!q) return list;
    return (list as any[]).filter(
      (v) =>
        v.name?.toLowerCase().includes(q) ||
        v.code?.toLowerCase().includes(q) ||
        v.phone?.includes(q) ||
        v.gstNumber?.toLowerCase().includes(q)
    );
  }, [party, vendors, suppliers, search]);

  const paginated = filtered.slice((page - 1) * PER_PAGE, page * PER_PAGE);
  const totalPages = Math.max(1, Math.ceil(filtered.length / PER_PAGE));

  const totals = party === "vendor" ? vendorLedgerSummary?.totals : supplierLedgerSummary?.totals;
  const activeList = party === "vendor" ? vendors : suppliers;
  const isLoading = party === "vendor" ? vendorsLoading : suppliersLoading;

  const openSupplierEdit = (s: any) => {
    setEditingSupplier(s);
    setSupplierForm({
      code: s.code,
      name: s.name,
      email: s.email || "",
      phone: s.phone || "",
      addressLine1: s.address?.line1 || "",
      city: s.address?.city || "",
      state: s.address?.state || "",
      pincode: s.address?.pincode || "",
      gst: s.gstNumber || "",
    });
    setIsSupplierFormOpen(true);
  };

  const handleSaveSupplier = () => {
    if (!supplierForm.name.trim()) {
      toast.error("Please fill Supplier Name");
      return;
    }
    if (!supplierForm.phone || supplierForm.phone.replace(/\D/g, "").length !== 10) {
      toast.error("Please enter a valid 10-digit mobile number");
      return;
    }
    saveSupplierMutation.mutate({
      code: supplierForm.code,
      name: supplierForm.name.trim(),
      email: supplierForm.email,
      phone: supplierForm.phone,
      gstNumber: supplierForm.gst,
      address: {
        line1: supplierForm.addressLine1,
        city: supplierForm.city,
        state: supplierForm.state,
        pincode: supplierForm.pincode,
        country: "India",
      },
    });
  };

  return (
    <PageShell
      title={isPayable ? "Suppliers" : "Vendors"}
      subtitle={
        isPayable
          ? `${suppliers.length} suppliers we buy from`
          : `${vendors.length} vendors on account`
      }
      breadcrumbs={[{ label: "Vendors & Ledger" }, { label: isPayable ? "Suppliers" : "Vendor Master" }]}
      actions={
        <div className="flex items-center gap-2">
          <ExportMenu
            title={isPayable ? "Suppliers" : "Vendors"}
            subtitle={`${filtered.length} ${party}s`}
            data={(filtered as any[]).map((v) => ({
              Code: v.code,
              Name: v.name,
              Phone: v.phone || "",
              Email: v.email || "",
              City: v.address?.city || "",
              State: v.address?.state || "",
              GSTIN: v.gstNumber || "",
              Pending: isPayable ? balanceBySupplier.get(String(v._id))?.pending ?? 0 : balanceByVendor.get(String(v._id)) ?? 0,
              Status: v.status,
            }))}
            filename={party}
          />
          {!isPayable && can("vendor.manage") && (
            <Button
              size="sm"
              onClick={() => {
                setFormVendor(null);
                setIsFormOpen(true);
              }}
            >
              <Plus className="w-4 h-4 mr-1.5" /> Add Vendor
            </Button>
          )}
          {isPayable && can("vendor.manage") && (
            <Button
              size="sm"
              onClick={() => {
                setEditingSupplier(null);
                setSupplierForm(EMPTY_SUPPLIER_FORM);
                setIsSupplierFormOpen(true);
              }}
            >
              <Plus className="w-4 h-4 mr-1.5" /> Add Supplier
            </Button>
          )}
        </div>
      }
    >
      <Tabs
        value={party}
        onValueChange={(v) => {
          setParty(v as LedgerParty);
          setSearch("");
          setPage(1);
        }}
      >
        <TabsList>
          <TabsTrigger value="vendor">Vendors (Receivable)</TabsTrigger>
          <TabsTrigger value="supplier" disabled={!canSeeSuppliers}>
            Suppliers (Payable)
          </TabsTrigger>
        </TabsList>
      </Tabs>

      {isPayable && !canSeeSuppliers ? (
        <AccessDenied permission="ledger.supplier.view" />
      ) : (
        <>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <Metric label={isPayable ? "Total Suppliers" : "Total Vendors"} value={String(activeList.length)} />
            <Metric
              label="Active"
              value={String((activeList as any[]).filter((v) => v.status === "active").length)}
            />
            <Metric
              label={isPayable ? "We Still Owe" : "Total Receivable"}
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
                  placeholder={`Search ${party}s by name, code, phone or GST…`}
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
                    {[isPayable ? "Supplier Name" : "Vendor Name", "Code", "Contact", "Location", "GSTIN", "Pending", "Status", "Action"].map(
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
                        {isPayable ? "No suppliers yet." : "No vendors yet. Add one to start tracking their ledger."}
                      </td>
                    </tr>
                  ) : (
                    paginated.map((v: any) => {
                      const pending = isPayable
                        ? balanceBySupplier.get(String(v._id))?.pending ?? 0
                        : balanceByVendor.get(String(v._id)) ?? 0;
                      const overdue = isPayable ? balanceBySupplier.get(String(v._id))?.overdue ?? 0 : 0;
                      return (
                        <tr key={v._id} className="hover:bg-slate-50 transition-colors">
                          <td className="px-4 py-3">
                            <button
                              onClick={() =>
                                isPayable ? setLedgerSupplier(v) : router.push(`/vendors/${v._id}`)
                              }
                              className="font-semibold text-foreground hover:text-[#3F63AD] hover:underline text-left"
                            >
                              {v.name}
                            </button>
                            {v.contactPerson && (
                              <p className="text-xs text-muted-foreground">{v.contactPerson}</p>
                            )}
                          </td>
                          <td className="px-4 py-3 font-mono font-bold text-[#3F63AD]">{v.code}</td>
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
                            className={cn(
                              "px-4 py-3 font-semibold tabular-nums",
                              pending > 0 ? "text-amber-600" : "text-emerald-600"
                            )}
                          >
                            {formatCurrency(pending)}
                            {overdue > 0 && (
                              <p className="text-[10px] font-medium text-red-400">
                                overdue {formatCurrency(overdue)}
                              </p>
                            )}
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
                                onClick={() =>
                                  isPayable ? setLedgerSupplier(v) : router.push(`/vendors/${v._id}`)
                                }
                              >
                                <FileText className="w-3.5 h-3.5" /> Ledger
                              </Button>
                              {!isPayable && can("vendor.manage") && (
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
                                  onClick={() =>
                                    isPayable ? setPaymentSupplierId(v._id) : setPaymentVendor(v)
                                  }
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
                                    onClick={() =>
                                      isPayable
                                        ? openSupplierEdit(v)
                                        : (() => {
                                            setFormVendor(v);
                                            setIsFormOpen(true);
                                          })()
                                    }
                                  >
                                    <Edit className="w-4 h-4" />
                                  </Button>
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-8 w-8 text-red-500 hover:bg-red-50"
                                    onClick={() =>
                                      isPayable ? setDeleteSupplier(v) : setDeleteVendor(v)
                                    }
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
        </>
      )}

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

      <PaymentModal
        isOpen={Boolean(paymentSupplierId)}
        onClose={() => setPaymentSupplierId(null)}
        onSuccess={() => queryClient.invalidateQueries({ queryKey: ["supplier-ledger-all"] })}
        defaultPartyType="Supplier"
        initialPartyId={paymentSupplierId || undefined}
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

      <Dialog open={Boolean(ledgerSupplier)} onOpenChange={(o) => !o && setLedgerSupplier(null)}>
        <DialogContent className="max-w-5xl p-0 overflow-hidden rounded-2xl border-none shadow-2xl">
          {ledgerSupplier && (
            <PartyLedgerPanel
              party="supplier"
              partyId={ledgerSupplier._id}
              onRecordPayment={() => {
                setPaymentSupplierId(ledgerSupplier._id);
                setLedgerSupplier(null);
              }}
            />
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={isSupplierFormOpen} onOpenChange={setIsSupplierFormOpen}>
        <DialogContent className="max-w-xl">
          <DialogHeader>
            <DialogTitle>{editingSupplier ? "Edit Supplier" : "Add Supplier"}</DialogTitle>
            <DialogDescription>
              {editingSupplier ? "Update this supplier's details." : "Register a new supplier."} Full
              address and credit-term controls are in Masters → Suppliers.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5 col-span-2">
                <Label className="text-xs font-semibold">Supplier Name *</Label>
                <Input
                  value={supplierForm.name}
                  onChange={(e) => setSupplierForm({ ...supplierForm, name: e.target.value })}
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Mobile Number *</Label>
                <Input
                  value={supplierForm.phone}
                  onChange={(e) => setSupplierForm({ ...supplierForm, phone: e.target.value })}
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">GSTIN</Label>
                <Input
                  value={supplierForm.gst}
                  onChange={(e) => setSupplierForm({ ...supplierForm, gst: e.target.value })}
                />
              </div>
              <div className="space-y-1.5 col-span-2">
                <Label className="text-xs font-semibold">Email</Label>
                <Input
                  value={supplierForm.email}
                  onChange={(e) => setSupplierForm({ ...supplierForm, email: e.target.value })}
                />
              </div>
              <div className="space-y-1.5 col-span-2">
                <Label className="text-xs font-semibold">Address</Label>
                <Input
                  value={supplierForm.addressLine1}
                  onChange={(e) => setSupplierForm({ ...supplierForm, addressLine1: e.target.value })}
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">City</Label>
                <Input
                  value={supplierForm.city}
                  onChange={(e) => setSupplierForm({ ...supplierForm, city: e.target.value })}
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">State</Label>
                <Input
                  value={supplierForm.state}
                  onChange={(e) => setSupplierForm({ ...supplierForm, state: e.target.value })}
                />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsSupplierFormOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSaveSupplier} disabled={saveSupplierMutation.isPending}>
              {saveSupplierMutation.isPending ? "Saving…" : editingSupplier ? "Update Supplier" : "Save Supplier"}
            </Button>
          </DialogFooter>
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

      <Dialog open={Boolean(deleteSupplier)} onOpenChange={(o) => !o && setDeleteSupplier(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Delete supplier?</DialogTitle>
            <DialogDescription>
              {deleteSupplier?.name} will be removed. This does not affect purchase entries already
              recorded against them, but may break the automatic ledger match going forward.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteSupplier(null)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={() => removeSupplierMutation.mutate(deleteSupplier.code)}
              disabled={removeSupplierMutation.isPending}
            >
              {removeSupplierMutation.isPending ? "Deleting…" : "Delete"}
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
