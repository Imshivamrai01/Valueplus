"use client";
import { useState, useMemo } from "react";
import { PageShell } from "@/components/shared/page-shell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Plus, Search, Users } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { formatCurrency } from "@/lib/utils";

const STATES = ["Maharashtra","Gujarat","Delhi","Karnataka","Tamil Nadu","Rajasthan","Uttar Pradesh","West Bengal"];
const CUSTOMER_GROUPS = ["Retail","Wholesale","Distributor","Corporate","VIP"];
const CITIES = ["Mumbai","Pune","Ahmedabad","Delhi","Bengaluru","Chennai","Jaipur","Kolkata","Surat","Hyderabad"];

function generateCustomers() {
  const names = ["Sharma Enterprises","Patel Industries","Kapoor Tech","Gupta Electronics","Mehta Trading","Verma Exports","Singh & Sons","Kumar Distributors","Agarwal Holdings","Joshi Retailers","Rao Agencies","Iyer Technologies","Nair Solutions","Menon Brothers","Pillai Traders","Bhat Enterprises","Hegde Agencies","Gowda Industries","Sethi Group","Malhotra Ventures"];
  return names.map((name, i) => ({
    id: String(i + 1),
    code: `CUST-${String(i + 1).padStart(4,"0")}`,
    name: `${name} Pvt Ltd`,
    email: `billing@${name.split(" ")[0].toLowerCase()}.in`,
    phone: `98${String(Math.floor(10000000 + Math.random() * 89999999))}`,
    city: CITIES[i % CITIES.length],
    state: STATES[i % STATES.length],
    gst: `27AA${name.substring(0,4).toUpperCase()}1234A1Z${i%9}`,
    group: CUSTOMER_GROUPS[i % CUSTOMER_GROUPS.length],
    outstanding: Math.round(Math.random() * 200000),
    creditLimit: 100000 + Math.floor(Math.random() * 400000),
    status: i < 18 ? "active" : "inactive",
    invoices: Math.floor(3 + Math.random() * 30),
  }));
}

const ALL_CUSTOMERS = generateCustomers();

export default function CustomersPage() {
  const [customers, setCustomers] = useState(ALL_CUSTOMERS);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    phone: "",
    city: "Mumbai",
    state: "Maharashtra",
    gst: "",
    group: "Retail",
    creditLimit: "100000",
  });
  const PER_PAGE = 10;

  const filtered = useMemo(() => customers.filter(c =>
    !search || c.name.toLowerCase().includes(search.toLowerCase()) || c.code.toLowerCase().includes(search.toLowerCase()) || c.city.toLowerCase().includes(search.toLowerCase())
  ), [customers, search]);

  const paginated = filtered.slice((page-1)*PER_PAGE, page*PER_PAGE);
  const totalPages = Math.ceil(filtered.length / PER_PAGE);

  const handleSave = () => {
    if (!formData.name || !formData.phone) {
      toast.error("Please fill Customer Name and Phone");
      return;
    }

    const newCust = {
      id: String(Date.now()),
      code: `CUST-${String(customers.length + 1).padStart(4, "0")}`,
      name: formData.name,
      email: formData.email || `contact@${formData.name.split(" ")[0].toLowerCase()}.in`,
      phone: formData.phone,
      city: formData.city,
      state: formData.state,
      gst: formData.gst || "27AAACV1234A1Z5",
      group: formData.group,
      outstanding: 0,
      creditLimit: Number(formData.creditLimit) || 100000,
      status: "active",
      invoices: 0,
    };

    setCustomers([newCust, ...customers]);
    toast.success(`Customer "${newCust.name}" added successfully!`);
    setIsFormOpen(false);
  };

  return (
    <PageShell title="Customers" subtitle={`${customers.length} registered customers`} breadcrumbs={[{ label: "Masters" }, { label: "Customers" }]}
      actions={<Button size="sm" onClick={() => setIsFormOpen(true)}><Plus className="w-4 h-4 mr-1.5" /> Add Customer</Button>}>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[{ label:"Total Customers", value:customers.length }, { label:"Active", value:customers.filter(c=>c.status==="active").length }, { label:"Total Outstanding", value:formatCurrency(customers.reduce((a,c)=>a+c.outstanding,0)) }, { label:"New This Month", value:8 }].map(s => (
          <div key={s.label} className="metric-card"><p className="text-2xl font-bold">{s.value}</p><p className="text-xs text-muted-foreground mt-1">{s.label}</p></div>
        ))}
      </div>

      <div className="data-table-container">
        <div className="flex items-center gap-3 p-4 border-b">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input placeholder="Search name, code, city..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 border-b">
              <tr>
                {["Code", "Customer Name", "Phone & Email", "Location", "GSTIN", "Group", "Outstanding", "Status", ""].map(h => (
                  <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y">
              {paginated.map(c => (
                <tr key={c.id} className="hover:bg-slate-50 transition-colors">
                  <td className="px-4 py-3 font-mono font-bold text-[#3F63AD]">{c.code}</td>
                  <td className="px-4 py-3 font-semibold text-foreground">{c.name}</td>
                  <td className="px-4 py-3">
                    <p className="font-medium text-foreground">{c.phone}</p>
                    <p className="text-xs text-muted-foreground">{c.email}</p>
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">{c.city}, {c.state}</td>
                  <td className="px-4 py-3 font-mono text-xs text-slate-700">{c.gst}</td>
                  <td className="px-4 py-3"><Badge variant="outline">{c.group}</Badge></td>
                  <td className="px-4 py-3 font-semibold text-amber-600">{formatCurrency(c.outstanding)}</td>
                  <td className="px-4 py-3"><Badge variant={c.status === "active" ? "success" : "secondary"}>{c.status}</Badge></td>
                  <td className="px-4 py-3 text-center">
                    <Button variant="ghost" size="sm" className="text-red-500" onClick={() => { setCustomers(prev => prev.filter(x => x.id !== c.id)); toast.success("Customer removed"); }}>Delete</Button>
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
                <Users className="w-6 h-6 text-[#76C043]" />
              </div>
              <div>
                <h3 className="text-xl font-bold tracking-tight">Add Customer Account</h3>
                <p className="text-xs text-slate-300 mt-0.5">
                  Register new retail customer, B2B wholesale client or corporate account
                </p>
              </div>
            </div>
          </div>

          <div className="p-6 space-y-4 bg-slate-50/50">
            <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-1.5 md:col-span-2">
                  <Label className="text-xs font-semibold text-slate-700">Business / Customer Name *</Label>
                  <Input
                    placeholder="e.g. Sharma Enterprises Pvt Ltd"
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
                  <Label className="text-xs font-semibold text-slate-700">Phone Contact Number *</Label>
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
                  <Label className="text-xs font-semibold text-slate-700">City</Label>
                  <Input
                    value={formData.city}
                    onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                    className="bg-slate-50 border-slate-300"
                  />
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold text-slate-700">State</Label>
                  <Input
                    value={formData.state}
                    onChange={(e) => setFormData({ ...formData, state: e.target.value })}
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
            <Button onClick={handleSave} className="bg-[#3F63AD] hover:bg-[#2E4F95] text-white px-6 font-bold shadow-lg shadow-[#3F63AD]/20">
              Save & Register Customer
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </PageShell>
  );
}

