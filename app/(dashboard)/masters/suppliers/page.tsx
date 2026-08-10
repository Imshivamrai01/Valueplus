"use client";
import { useState, useEffect, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { PageShell } from "@/components/shared/page-shell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Plus, Search, Building, Edit, Trash2, FileText } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { formatCurrency } from "@/lib/utils";

export default function SuppliersPage() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [isLedgerOpen, setIsLedgerOpen] = useState(false);
  const [editingSupplier, setEditingSupplier] = useState<any | null>(null);
  const [deletingCode, setDeletingCode] = useState<string | null>(null);
  const [selectedSupplierForLedger, setSelectedSupplierForLedger] = useState<any | null>(null);
  const [formData, setFormData] = useState({
    code: "",
    name: "",
    email: "",
    phone: "",
    city: "Mumbai",
    state: "Maharashtra",
    gst: "",
  });
  const PER_PAGE = 10;

  const { data: suppliers = [], isLoading: loading } = useQuery({
    queryKey: ["suppliers"],
    queryFn: async () => {
      const res = await fetch("/api/suppliers");
      const json = await res.json();
      if (!json.success) throw new Error(json.error);
      return json.data;
    }
  });

  const { data: purchaseEntries = [] } = useQuery({
    queryKey: ["purchase-entries"],
    queryFn: async () => {
      const res = await fetch("/api/purchase-entries");
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

  const filtered = useMemo(() => suppliers.filter((s: any) => !search || s.name.toLowerCase().includes(search.toLowerCase()) || s.code.toLowerCase().includes(search.toLowerCase())), [suppliers, search]);
  const paginated = filtered.slice((page-1)*PER_PAGE, page*PER_PAGE);
  const totalPages = Math.ceil(filtered.length / PER_PAGE);

  const saveMutation = useMutation({
    mutationFn: async (payload: any) => {
      const method = editingSupplier ? "PUT" : "POST";
      const res = await fetch("/api/suppliers", {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });
      const json = await res.json();
      if (!json.success) throw new Error(json.error || "Failed to save supplier");
      return json.data;
    },
    onSuccess: () => {
      toast.success(editingSupplier ? "Supplier updated successfully" : "Supplier added successfully");
      setIsFormOpen(false);
      queryClient.invalidateQueries({ queryKey: ["suppliers"] });
    },
    onError: (error: any) => {
      toast.error(error.message || "An error occurred");
    }
  });

  const deleteMutation = useMutation({
    mutationFn: async (code: string) => {
      const res = await fetch(`/api/suppliers?code=${code}`, { method: "DELETE" });
      const json = await res.json();
      if (!json.success) throw new Error(json.error || "Failed to delete supplier");
      return json;
    },
    onSuccess: () => {
      toast.success("Supplier deleted");
      queryClient.invalidateQueries({ queryKey: ["suppliers"] });
      setIsDeleteOpen(false);
      setDeletingCode(null);
    },
    onError: (error: any) => {
      toast.error(error.message || "An error occurred");
      setIsDeleteOpen(false);
      setDeletingCode(null);
    }
  });

  const handleSave = () => {
    if (!formData.name || !formData.phone) {
      toast.error("Please fill Supplier Name and Phone");
      return;
    }

    const newSupp = {
      code: formData.code || `SUPP-${String(suppliers.length + 1).padStart(4, "0")}`,
      name: formData.name,
      email: formData.email || `orders@${formData.name.split(" ")[0].toLowerCase()}.com`,
      phone: formData.phone,
      address: {
        line1: "Supplier Address",
        city: formData.city,
        state: formData.state,
        pincode: "000000",
        country: "India"
      },
      gstNumber: formData.gst || "27AAACV9999A1Z2",
      outstandingBalance: 0,
      creditLimit: 1000000,
      creditDays: 45,
      status: "active",
    };

    saveMutation.mutate(newSupp);
  };

  const handleEdit = (s: any) => {
    setEditingSupplier(s);
    setFormData({
      code: s.code,
      name: s.name,
      email: s.email || "",
      phone: s.phone || "",
      city: s.address?.city || "Mumbai",
      state: s.address?.state || "Maharashtra",
      gst: s.gstNumber || "",
    });
    setIsFormOpen(true);
  };

  const confirmDelete = (code: string) => {
    setDeletingCode(code);
    setIsDeleteOpen(true);
  };

  const handleViewLedger = (s: any) => {
    setSelectedSupplierForLedger(s);
    setIsLedgerOpen(true);
  };

  const handleDelete = () => {
    if (deletingCode) {
      deleteMutation.mutate(deletingCode);
    }
  };

  const handleAddNew = () => {
    setEditingSupplier(null);
    setFormData({
      code: "",
      name: "",
      email: "",
      phone: "",
      city: "Mumbai",
      state: "Maharashtra",
      gst: "",
    });
    setIsFormOpen(true);
  };

  return (
    <PageShell title="Suppliers" subtitle={`${suppliers.length} suppliers in network`} breadcrumbs={[{ label: "Masters" }, { label: "Suppliers" }]}
      actions={<Button size="sm" onClick={handleAddNew}><Plus className="w-4 h-4 mr-1.5" /> Add Supplier</Button>}>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[{label:"Total Suppliers",value:suppliers.length},{label:"Active",value:suppliers.filter(s=>s.status==="active").length},{label:"Total Payables",value:formatCurrency(suppliers.reduce((a,s)=>a+(s.outstandingBalance || 0),0))},{label:"Overdue Bills",value:4}].map(s=>(
          <div key={s.label} className="metric-card"><p className="text-2xl font-bold">{s.value}</p><p className="text-xs text-muted-foreground mt-1">{s.label}</p></div>
        ))}
      </div>
      <div className="data-table-container">
        <div className="flex items-center gap-3 p-4 border-b">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input placeholder="Search suppliers..." value={search} onChange={e=>{setSearch(e.target.value);setPage(1);}} className="pl-9" />
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 border-b">
              <tr>{["Code", "Supplier Name","Phone & Email","Location","GSTIN","Payable Outstanding","Status",""].map(h=><th key={h} className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase">{h}</th>)}</tr>
            </thead>
            <tbody className="divide-y">
              {loading ? <tr><td colSpan={8} className="text-center p-4">Loading...</td></tr> : paginated.map(s=>(
                <tr key={s._id || s.id} className="hover:bg-slate-50 transition-colors">
                  <td className="px-4 py-3 font-mono font-bold text-[#3F63AD]">{s.code}</td>
                  <td className="px-4 py-3 font-semibold text-foreground">{s.name}</td>
                  <td className="px-4 py-3"><p className="font-medium text-foreground">{s.phone}</p><p className="text-xs text-muted-foreground">{s.email}</p></td>
                  <td className="px-4 py-3 text-muted-foreground">{s.address?.city}, {s.address?.state}</td>
                  <td className="px-4 py-3 font-mono text-xs text-slate-700">{s.gstNumber}</td>
                  <td className="px-4 py-3 font-semibold text-red-600">{formatCurrency(s.outstandingBalance || 0)}</td>
                  <td className="px-4 py-3"><Badge variant={s.status==="active"?"success":"secondary"}>{s.status}</Badge></td>
                  <td className="px-4 py-3 text-center">
                    <div className="flex items-center justify-end gap-2">
                      {(s.outstandingBalance > 0) && (
                        <Button variant="outline" size="sm" className="h-8 gap-1.5 text-blue-600 hover:text-blue-700 bg-blue-50/50 border-blue-200" onClick={() => handleViewLedger(s)}>
                          <FileText className="w-3.5 h-3.5" /> Ledger
                        </Button>
                      )}
                      <Button variant="ghost" size="icon" className="h-8 w-8 text-blue-600 hover:text-blue-700 hover:bg-blue-50" onClick={() => handleEdit(s)}>
                        <Edit className="w-4 h-4" />
                      </Button>
                      <Button variant="ghost" size="icon" className="h-8 w-8 text-red-500 hover:text-red-600 hover:bg-red-50" onClick={() => confirmDelete(s.code)}>
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="flex items-center justify-between px-4 py-3 border-t text-sm text-muted-foreground">
          <p>Showing {(page-1)*PER_PAGE+1}–{Math.min(page*PER_PAGE, filtered.length)} of {filtered.length}</p>
          <div className="flex items-center gap-1">
            <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1} className="px-3 py-1.5 rounded-lg border hover:bg-slate-50 disabled:opacity-50">Previous</button>
            <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages} className="px-3 py-1.5 rounded-lg border hover:bg-slate-50 disabled:opacity-50">Next</button>
          </div>
        </div>
      </div>

      <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
        <DialogContent className="max-w-3xl p-0 rounded-2xl border-none shadow-2xl overflow-hidden">
          {/* Header */}
          <div className="bg-gradient-to-r from-[#1B2537] via-[#2C3E5A] to-[#1B2537] text-white p-6 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl bg-white/10 flex items-center justify-center backdrop-blur-md border border-white/20">
                <Building className="w-6 h-6 text-[#76C043]" />
              </div>
              <div>
                <h3 className="text-xl font-bold tracking-tight">{editingSupplier ? "Edit Supplier & Distributor" : "Add Supplier & Distributor"}</h3>
                <p className="text-xs text-slate-300 mt-0.5">
                  {editingSupplier ? "Update existing supplier details" : "Register electronic brand manufacturers, vendors and authorized distributors"}
                </p>
              </div>
            </div>
          </div>

          <div className="p-6 space-y-4 bg-slate-50/50">
            <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-1.5 md:col-span-2">
                  <Label className="text-xs font-semibold text-slate-700">Supplier Company Name *</Label>
                  <Input
                    placeholder="e.g. Apple India Pvt Ltd"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="bg-slate-50 border-slate-300"
                  />
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold text-slate-700">Phone Contact Number *</Label>
                  <Input
                    placeholder="9876543210"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    className="bg-slate-50 border-slate-300 font-mono"
                  />
                </div>

                <div className="space-y-1.5 md:col-span-2">
                  <Label className="text-xs font-semibold text-slate-700">Orders Email Address</Label>
                  <Input
                    placeholder="orders@supplier.com"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    className="bg-slate-50 border-slate-300"
                  />
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold text-slate-700">GSTIN Identification No.</Label>
                  <Input
                    placeholder="27AAACV1234A1Z5"
                    value={formData.gst}
                    onChange={(e) => setFormData({ ...formData, gst: e.target.value })}
                    className="bg-slate-50 border-slate-300 font-mono"
                  />
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold text-slate-700">City</Label>
                  <Input
                    value={formData.city}
                    onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                    className="bg-slate-50 border-slate-300"
                  />
                </div>

                <div className="space-y-1.5 md:col-span-2">
                  <Label className="text-xs font-semibold text-slate-700">State / Region</Label>
                  <Input
                    value={formData.state}
                    onChange={(e) => setFormData({ ...formData, state: e.target.value })}
                    className="bg-slate-50 border-slate-300"
                  />
                </div>
              </div>
            </div>
          </div>

          <div className="bg-slate-100 px-6 py-4 rounded-b-2xl border-t border-slate-200 flex items-center justify-end gap-3">
            <Button variant="outline" onClick={() => setIsFormOpen(false)} className="px-5">
              Cancel
            </Button>
            <Button onClick={handleSave} disabled={saveMutation.isPending} className="bg-[#3F63AD] hover:bg-[#2E4F95] text-white px-6 font-bold shadow-lg shadow-[#3F63AD]/20">
              {saveMutation.isPending ? "Saving..." : (editingSupplier ? "Update Supplier" : "Save & Register Supplier")}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={isDeleteOpen} onOpenChange={setIsDeleteOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Confirm Deletion</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete this supplier? This action cannot be undone and may break related purchases.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDeleteOpen(false)} disabled={deleteMutation.isPending}>Cancel</Button>
            <Button variant="destructive" onClick={handleDelete} disabled={deleteMutation.isPending}>
              {deleteMutation.isPending ? "Deleting..." : "Delete"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={isLedgerOpen} onOpenChange={setIsLedgerOpen}>
        <DialogContent className="max-w-4xl p-0 overflow-hidden rounded-2xl border-none shadow-2xl">
          {selectedSupplierForLedger && (() => {
            const supp = selectedSupplierForLedger;
            const suppBills = purchaseEntries.filter((b: any) => b.supplier === supp.name || b.supplierId === supp._id);
            const suppPayments = payments.filter((p: any) => p.partyId === supp._id || p.partyId === supp.code);
            
            const totalBilled = suppBills.reduce((a: any, b: any) => a + (b.totalAmount || b.total || 0), 0);
            const totalPaid = suppPayments.reduce((a: any, p: any) => a + p.amount, 0);
            const balance = totalBilled - totalPaid;

            // Combine and sort by date descending
            const transactions = [
              ...suppBills.map((b: any) => ({ ...b, txType: "bill", txDate: new Date(b.date) })),
              ...suppPayments.map((p: any) => ({ ...p, txType: "payment", txDate: new Date(p.date) }))
            ].sort((a, b) => b.txDate.getTime() - a.txDate.getTime());

            return (
              <>
                <div className="bg-slate-900 text-white p-6">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-xl bg-white/10 flex items-center justify-center">
                      <FileText className="w-6 h-6 text-[#76C043]" />
                    </div>
                    <div>
                      <h3 className="text-xl font-bold tracking-tight">{supp.name} - Supplier Ledger</h3>
                      <p className="text-xs text-slate-300 mt-0.5">{supp.code} | {supp.phone}</p>
                    </div>
                  </div>
                </div>

                <div className="p-6 bg-slate-50">
                  <div className="grid grid-cols-3 gap-4 mb-6">
                    <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
                      <p className="text-xs font-semibold text-muted-foreground uppercase">Total Payables</p>
                      <p className="text-xl font-bold mt-1 text-slate-800">{formatCurrency(totalBilled)}</p>
                    </div>
                    <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
                      <p className="text-xs font-semibold text-muted-foreground uppercase">Total Paid</p>
                      <p className="text-xl font-bold mt-1 text-emerald-600">{formatCurrency(totalPaid)}</p>
                    </div>
                    <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
                      <p className="text-xs font-semibold text-muted-foreground uppercase">Current Pending</p>
                      <p className="text-xl font-bold mt-1 text-red-600">{formatCurrency(balance)}</p>
                    </div>
                  </div>

                  <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                    <div className="overflow-y-auto max-h-[400px]">
                      <table className="w-full text-sm">
                        <thead className="bg-slate-50 border-b sticky top-0 z-10">
                          <tr>
                            <th className="px-4 py-3 text-left font-semibold text-muted-foreground uppercase text-xs">Date</th>
                            <th className="px-4 py-3 text-left font-semibold text-muted-foreground uppercase text-xs">Transaction</th>
                            <th className="px-4 py-3 text-right font-semibold text-muted-foreground uppercase text-xs">Credit (Billed)</th>
                            <th className="px-4 py-3 text-right font-semibold text-muted-foreground uppercase text-xs">Debit (Paid)</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y">
                          {transactions.length === 0 ? (
                            <tr><td colSpan={4} className="py-8 text-center text-muted-foreground">No transactions found</td></tr>
                          ) : transactions.map((tx, idx) => (
                            <tr key={idx} className="hover:bg-slate-50/50">
                              <td className="px-4 py-3 whitespace-nowrap text-muted-foreground">{new Date(tx.txDate).toLocaleDateString('en-GB')}</td>
                              <td className="px-4 py-3">
                                {tx.txType === "bill" ? (
                                  <div>
                                    <p className="font-semibold text-slate-800">Purchase Bill #{tx.billNo || tx.billNumber || tx.id}</p>
                                    <p className="text-xs text-muted-foreground">Purchase Entry</p>
                                  </div>
                                ) : (
                                  <div>
                                    <p className="font-semibold text-emerald-700">Payment Issued</p>
                                    <p className="text-xs text-muted-foreground">via {tx.paymentMode} ({tx.referenceNo || "No Ref"})</p>
                                  </div>
                                )}
                              </td>
                              <td className="px-4 py-3 text-right font-medium">
                                {tx.txType === "bill" ? <span className="text-slate-800">{formatCurrency(tx.total || tx.totalAmount || 0)}</span> : "-"}
                              </td>
                              <td className="px-4 py-3 text-right font-medium">
                                {tx.txType === "payment" ? <span className="text-emerald-600">{formatCurrency(tx.amount || 0)}</span> : "-"}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
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

