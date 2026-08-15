"use client";
import { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { PageShell } from "@/components/shared/page-shell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Plus, Search, Edit, Trash2, Users, Download, Eye, FileText, CheckCircle, Clock, AlertTriangle, XCircle, X } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { AutocompleteSearch } from "@/components/shared/autocomplete-search";
import { TableShimmer, MetricCardsShimmer } from "@/components/shared/shimmer-skeleton";
import { toast } from "sonner";
import { formatCurrency } from "@/lib/utils";
import { INDIA_STATES, INDIA_STATES_AND_DISTRICTS, normalizeStateName, normalizeCityName } from "@/lib/data/locations";

const CUSTOMER_GROUPS = ["Retail","Wholesale","Distributor","Corporate","VIP"];

export default function CustomersPage() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [isLedgerOpen, setIsLedgerOpen] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState<any | null>(null);
  const [deletingCode, setDeletingCode] = useState<string | null>(null);
  const [selectedCustomerForLedger, setSelectedCustomerForLedger] = useState<any | null>(null);
  const [formData, setFormData] = useState({
    code: "",
    name: "",
    email: "",
    phone: "",
    city: "Mumbai",
    state: "Maharashtra",
    address: "",
    pincode: "",
    gst: "",
    group: "Retail",
    creditLimit: "100000",
  });
  const PER_PAGE = 10;

  const { data: customers = [], isLoading: loading } = useQuery({
    queryKey: ["customers"],
    queryFn: async () => {
      const res = await fetch("/api/customers");
      const json = await res.json();
      if (!json.success) throw new Error(json.error);
      return json.data;
    }
  });

  const { data: invoices = [] } = useQuery({
    queryKey: ["invoices"],
    queryFn: async () => {
      const res = await fetch("/api/invoices");
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

  const filtered = useMemo(() => customers.filter(c =>
    !search || c.name.toLowerCase().includes(search.toLowerCase()) || c.code.toLowerCase().includes(search.toLowerCase()) || (c.billingAddress?.city && c.billingAddress.city.toLowerCase().includes(search.toLowerCase()))
  ), [customers, search]);

  const paginated = filtered.slice((page-1)*PER_PAGE, page*PER_PAGE);
  const totalPages = Math.ceil(filtered.length / PER_PAGE);

  const saveMutation = useMutation({
    mutationFn: async (payload: any) => {
      const method = editingCustomer ? "PUT" : "POST";
      const res = await fetch("/api/customers", {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });
      const json = await res.json();
      if (!json.success) throw new Error(json.error || "Failed to save customer");
      return json.data;
    },
    onSuccess: () => {
      toast.success(editingCustomer ? "Customer updated successfully" : "Customer added successfully");
      setIsFormOpen(false);
      queryClient.invalidateQueries({ queryKey: ["customers"] });
    },
    onError: (error: any) => {
      toast.error(error.message || "An error occurred");
    }
  });

  const deleteMutation = useMutation({
    mutationFn: async (code: string) => {
      const res = await fetch(`/api/customers?code=${code}`, { method: "DELETE" });
      const json = await res.json();
      if (!json.success) throw new Error(json.error || "Failed to delete customer");
      return json;
    },
    onSuccess: () => {
      toast.success("Customer deleted");
      queryClient.invalidateQueries({ queryKey: ["customers"] });
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
    if (!formData.name) {
      toast.error("Please fill Customer Name");
      return;
    }
    if (!formData.phone || formData.phone.replace(/\D/g, '').length !== 10) {
      toast.error("Please enter a valid 10-digit mobile number");
      return;
    }
    saveMutation.mutate(formData);
  };

  const handleEdit = (c: any) => {
    setEditingCustomer(c);
    const stateName = normalizeStateName(c.billingAddress?.state || "Maharashtra");
    const cityName = normalizeCityName(c.billingAddress?.city || "Mumbai", stateName);
    setFormData({
      code: c.code,
      name: c.name,
      email: c.email || "",
      phone: c.phone || "",
      city: cityName,
      state: stateName,
      address: c.billingAddress?.line1 || "",
      pincode: c.billingAddress?.pincode || "",
      gst: c.gstNumber || "",
      group: c.customerGroup || "Retail",
      creditLimit: String(c.creditLimit || "100000"),
    });
    setIsFormOpen(true);
  };

  const confirmDelete = (code: string) => {
    setDeletingCode(code);
    setIsDeleteOpen(true);
  };

  const handleViewLedger = (c: any) => {
    setSelectedCustomerForLedger(c);
    setIsLedgerOpen(true);
  };

  const handleDelete = () => {
    if (deletingCode) {
      deleteMutation.mutate(deletingCode);
    }
  };

  const handleAddNew = () => {
    setEditingCustomer(null);
    setFormData({
      code: "",
      name: "",
      email: "",
      phone: "",
      city: "Mumbai",
      state: "Maharashtra",
      address: "",
      pincode: "",
      gst: "",
      group: "Retail",
      creditLimit: "100000",
    });
    setIsFormOpen(true);
  };

  return (
    <PageShell title="Customers" subtitle={`${customers.length} registered customers`} breadcrumbs={[{ label: "Masters" }, { label: "Customers" }]}
      actions={<Button size="sm" onClick={handleAddNew}><Plus className="w-4 h-4 mr-1.5" /> Add Customer</Button>}>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[{ label:"Total Customers", value:customers.length }, { label:"Active", value:customers.filter(c=>c.status==="active").length }, { label:"Total Outstanding", value:formatCurrency(customers.reduce((a,c)=>a+(c.outstandingBalance || 0),0)) }, { label:"New This Month", value:customers.length }].map(s => (
          <div key={s.label} className="metric-card"><p className="text-2xl font-bold">{s.value}</p><p className="text-xs text-muted-foreground mt-1">{s.label}</p></div>
        ))}
      </div>

      <div className="data-table-container">
        <div className="flex items-center gap-3 p-4 border-b">
          <AutocompleteSearch
            data={customers}
            searchKeys={["name", "code", "city", "phone", "email"]}
            displayKey="name"
            subDisplayKey="phone"
            placeholder="Search name, code, phone, city..."
            value={search}
            onSearchChange={(val) => setSearch(val)}
            className="flex-1 max-w-sm"
          />
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 border-b">
              <tr>
                {["Code", "Customer Name", "Phone & Email", "Location", "GSTIN", "Group", "Outstanding", "Status", "Action"].map(h => (
                  <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y">
              {loading ? (
                <tr><td colSpan={9} className="p-0"><TableShimmer rows={6} cols={9} /></td></tr>
              ) : paginated.length === 0 ? (
                <tr><td colSpan={9} className="text-center p-8 text-muted-foreground">No customers found</td></tr>
              ) : (
                paginated.map(c => (
                <tr key={c._id || c.id} className="hover:bg-slate-50 transition-colors">
                  <td className="px-4 py-3 font-mono font-bold text-[#3F63AD]">{c.code}</td>
                  <td className="px-4 py-3 font-semibold text-foreground">{c.name}</td>
                  <td className="px-4 py-3">
                    <p className="font-medium text-foreground">{c.phone}</p>
                    <p className="text-xs text-muted-foreground">{c.email}</p>
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">{c.billingAddress?.city || "N/A"}, {c.billingAddress?.state || "N/A"}</td>
                  <td className="px-4 py-3 font-mono text-xs text-slate-700">{c.gstNumber || "URP"}</td>
                  <td className="px-4 py-3"><Badge variant="outline">{c.customerGroup || "Retail"}</Badge></td>
                  <td className="px-4 py-3 font-semibold text-amber-600">{formatCurrency(c.outstandingBalance || 0)}</td>
                  <td className="px-4 py-3"><Badge variant={c.status === "active" ? "success" : "secondary"}>{c.status}</Badge></td>
                  <td className="px-4 py-3 text-center">
                    <div className="flex items-center justify-end gap-2">
                      <Button variant="outline" size="sm" className="h-8 gap-1.5 text-blue-600 hover:text-blue-700 bg-blue-50/50 border-blue-200" onClick={() => handleViewLedger(c)}>
                        <FileText className="w-3.5 h-3.5" /> Ledger
                      </Button>
                      <Button variant="ghost" size="icon" className="h-8 w-8 text-blue-600 hover:text-blue-700 hover:bg-blue-50" onClick={() => handleEdit(c)}>
                        <Edit className="w-4 h-4" />
                      </Button>
                      <Button variant="ghost" size="icon" className="h-8 w-8 text-red-500 hover:text-red-600 hover:bg-red-50" onClick={() => confirmDelete(c.code)}>
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </td>
                </tr>
              )))}
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
                <Users className="w-6 h-6 text-[#76C043]" />
              </div>
              <div>
                <h3 className="text-xl font-bold tracking-tight">{editingCustomer ? "Edit Customer Account" : "Add Customer Account"}</h3>
                <p className="text-xs text-slate-300 mt-0.5">
                  {editingCustomer ? "Update existing customer details" : "Register new retail customer, B2B wholesale client or corporate account"}
                </p>
              </div>
            </div>
          </div>

          <div className="p-6 space-y-4 bg-slate-50/50">
            <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-1.5 md:col-span-2">
                  <Label className="text-xs font-semibold text-slate-700">Customer Name *</Label>
                  <Input
                    placeholder="e.g. Ramesh Kumar / Apex Enterprises"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="bg-slate-50 border-slate-300"
                  />
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold text-slate-700">Customer Group</Label>
                  <Select value={formData.group} onValueChange={(v) => setFormData({ ...formData, group: v })}>
                    <SelectTrigger className="bg-slate-50 border-slate-300"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {CUSTOMER_GROUPS.map((g) => <SelectItem key={g} value={g}>{g}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold text-slate-700">Customer Mobile Number *</Label>
                  <Input
                    placeholder="9876543210"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    className="bg-slate-50 border-slate-300 font-mono"
                  />
                </div>

                <div className="space-y-1.5 md:col-span-2">
                  <Label className="text-xs font-semibold text-slate-700">Email Address</Label>
                  <Input
                    placeholder="billing@sharma.in"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    className="bg-slate-50 border-slate-300"
                  />
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold text-slate-700">State</Label>
                  <Select 
                    value={formData.state} 
                    onValueChange={(v) => setFormData({ ...formData, state: v, city: "" })}
                  >
                    <SelectTrigger className="bg-slate-50 border-slate-300">
                      <SelectValue placeholder="Select State" />
                    </SelectTrigger>
                    <SelectContent>
                      {(INDIA_STATES.includes(formData.state) ? INDIA_STATES : [...INDIA_STATES, formData.state].filter(Boolean)).map(s => (
                        <SelectItem key={s} value={s}>{s}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold text-slate-700">District / City</Label>
                  <Select 
                    value={formData.city} 
                    onValueChange={(v) => setFormData({ ...formData, city: v })}
                    disabled={!formData.state}
                  >
                    <SelectTrigger className="bg-slate-50 border-slate-300">
                      <SelectValue placeholder="Select District" />
                    </SelectTrigger>
                    <SelectContent>
                      {(() => {
                        const available = INDIA_STATES_AND_DISTRICTS[formData.state] || [];
                        const options = available.includes(formData.city) ? available : [...available, formData.city].filter(Boolean);
                        return options.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>);
                      })()}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold text-slate-700">PIN Code</Label>
                  <Input
                    value={formData.pincode}
                    onChange={(e) => setFormData({ ...formData, pincode: e.target.value })}
                    className="bg-slate-50 border-slate-300"
                  />
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold text-slate-700">GSTIN Identification No.</Label>
                  <Input
                    placeholder="09AAFCV1234M1ZQ"
                    value={formData.gst}
                    onChange={(e) => setFormData({ ...formData, gst: e.target.value })}
                    className="bg-slate-50 border-slate-300 font-mono"
                  />
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold text-slate-700">Credit Limit (₹)</Label>
                  <Input
                    type="number"
                    placeholder="100000"
                    value={formData.creditLimit}
                    onChange={(e) => setFormData({ ...formData, creditLimit: e.target.value })}
                    className="bg-slate-50 border-slate-300 font-semibold"
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
              {saveMutation.isPending ? "Saving..." : (editingCustomer ? "Update Customer" : "Save & Register")}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={isDeleteOpen} onOpenChange={setIsDeleteOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Confirm Deletion</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete this customer? This action cannot be undone and may break related invoices.
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
          {selectedCustomerForLedger && (() => {
            const cust = selectedCustomerForLedger;
            const custInvoices = invoices.filter((i: any) => i.customer === cust.name || i.customerId === cust._id || i.customerName === cust.name);
            const custPayments = payments.filter((p: any) => p.partyId === cust._id || p.partyId === cust.code);
            
            const totalBilled = custInvoices.reduce((a: any, i: any) => a + (i.type === "credit-note" ? -(i.total || i.totalAmount || 0) : (i.total || i.totalAmount || 0)), 0);
            const totalPaid = custPayments.reduce((a: any, p: any) => a + (p.type === "paid" ? -p.amount : p.amount), 0);
            const balance = totalBilled - totalPaid;

            // Combine and sort by date descending
            const transactions = [
              ...custInvoices.map((i: any) => ({ ...i, txType: "invoice", txDate: new Date(i.date) })),
              ...custPayments.map((p: any) => ({ ...p, txType: "payment", txDate: new Date(p.date) }))
            ].sort((a, b) => b.txDate.getTime() - a.txDate.getTime());

            return (
              <>
                <div className="bg-slate-900 text-white p-6">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-xl bg-white/10 flex items-center justify-center">
                      <FileText className="w-6 h-6 text-[#76C043]" />
                    </div>
                    <div>
                      <h3 className="text-xl font-bold tracking-tight">{cust.name} - Ledger</h3>
                      <p className="text-xs text-slate-300 mt-0.5">{cust.code} | {cust.phone}</p>
                    </div>
                  </div>
                </div>

                <div className="p-6 bg-slate-50">
                  <div className="grid grid-cols-3 gap-4 mb-6">
                    <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
                      <p className="text-xs font-semibold text-muted-foreground uppercase">Total Billed</p>
                      <p className="text-xl font-bold mt-1 text-slate-800">{formatCurrency(totalBilled)}</p>
                    </div>
                    <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
                      <p className="text-xs font-semibold text-muted-foreground uppercase">Total Paid</p>
                      <p className="text-xl font-bold mt-1 text-emerald-600">{formatCurrency(totalPaid)}</p>
                    </div>
                    <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
                      <p className="text-xs font-semibold text-muted-foreground uppercase">Current Pending</p>
                      <p className="text-xl font-bold mt-1 text-amber-600">{formatCurrency(balance)}</p>
                    </div>
                  </div>

                  <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                    <div className="overflow-y-auto max-h-[400px]">
                      <table className="w-full text-sm">
                        <thead className="bg-slate-50 border-b sticky top-0 z-10">
                          <tr>
                            <th className="px-4 py-3 text-left font-semibold text-muted-foreground uppercase text-xs">Date</th>
                            <th className="px-4 py-3 text-left font-semibold text-muted-foreground uppercase text-xs">Transaction</th>
                            <th className="px-4 py-3 text-right font-semibold text-muted-foreground uppercase text-xs">Debit (Billed)</th>
                            <th className="px-4 py-3 text-right font-semibold text-muted-foreground uppercase text-xs">Credit (Paid)</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y">
                          {transactions.length === 0 ? (
                            <tr><td colSpan={4} className="py-8 text-center text-muted-foreground">No transactions found</td></tr>
                          ) : transactions.map((tx, idx) => (
                            <tr key={idx} className="hover:bg-slate-50/50">
                              <td className="px-4 py-3 whitespace-nowrap text-muted-foreground">{new Date(tx.txDate).toLocaleDateString('en-GB')}</td>
                              <td className="px-4 py-3">
                                {tx.txType === "invoice" ? (
                                  <div>
                                    <p className="font-semibold text-slate-800">Invoice #{tx.invoiceNumber || tx.id}</p>
                                    <p className="text-xs text-muted-foreground">Sales Bill</p>
                                  </div>
                                ) : (
                                  <div>
                                    <p className="font-semibold text-emerald-700">Payment Received</p>
                                    <p className="text-xs text-muted-foreground">via {tx.paymentMode} ({tx.referenceNo || "No Ref"})</p>
                                  </div>
                                )}
                              </td>
                              <td className="px-4 py-3 text-right font-medium">
                              {tx.txType === "invoice" ? (tx.type === "credit-note" ? <span className="text-red-600">-{formatCurrency(tx.total || tx.totalAmount)}</span> : formatCurrency(tx.total || tx.totalAmount)) : "-"}
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
                </div>
              </>
            );
          })()}
        </DialogContent>
      </Dialog>
    </PageShell>
  );
}

