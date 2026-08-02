"use client";
import { useState, useMemo } from "react";
import { PageShell } from "@/components/shared/page-shell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Plus, Search } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { formatCurrency } from "@/lib/utils";

const SUPPLIER_NAMES = ["Apple India Pvt Ltd","Samsung Electronics","Vivo Communication","Oppo Mobile India","boAt Lifestyle Audio","Sony India Distribution","LG Electronics","Xiaomi India","Realme Mobile","Dell India","HP Sales India","Lenovo Distribution"];

function generateSuppliers() {
  return SUPPLIER_NAMES.map((name, i) => ({
    id: String(i + 1),
    code: `SUPP-${String(i + 1).padStart(4,"0")}`,
    name,
    email: `orders@${name.split(" ")[0].toLowerCase()}.com`,
    phone: `98${String(Math.floor(10000000 + Math.random() * 89999999))}`,
    city: ["Mumbai","Pune","Delhi","Chennai","Bengaluru","Hyderabad"][i%6],
    state: ["Maharashtra","Maharashtra","Delhi","Tamil Nadu","Karnataka","Telangana"][i%6],
    gst: `27AABS${String(i).padStart(4,"0")}1Z5`,
    outstanding: Math.round(Math.random() * 500000),
    creditLimit: 500000 + Math.floor(Math.random() * 1500000),
    status: i < 11 ? "active" : "inactive",
    bills: Math.floor(2 + Math.random() * 25),
  }));
}

const ALL_SUPPLIERS = generateSuppliers();

export default function SuppliersPage() {
  const [suppliers, setSuppliers] = useState(ALL_SUPPLIERS);
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
  });
  const PER_PAGE = 10;
  const filtered = useMemo(() => suppliers.filter(s => !search || s.name.toLowerCase().includes(search.toLowerCase()) || s.code.toLowerCase().includes(search.toLowerCase())), [suppliers, search]);
  const paginated = filtered.slice((page-1)*PER_PAGE, page*PER_PAGE);
  const totalPages = Math.ceil(filtered.length / PER_PAGE);

  const handleSave = () => {
    if (!formData.name || !formData.phone) {
      toast.error("Please fill Supplier Name and Phone");
      return;
    }

    const newSupp = {
      id: String(Date.now()),
      code: `SUPP-${String(suppliers.length + 1).padStart(4, "0")}`,
      name: formData.name,
      email: formData.email || `orders@${formData.name.split(" ")[0].toLowerCase()}.com`,
      phone: formData.phone,
      city: formData.city,
      state: formData.state,
      gst: formData.gst || "27AAACV9999A1Z2",
      outstanding: 0,
      creditLimit: 1000000,
      status: "active",
      bills: 0,
    };

    setSuppliers([newSupp, ...suppliers]);
    toast.success(`Supplier "${newSupp.name}" added successfully!`);
    setIsFormOpen(false);
  };

  return (
    <PageShell title="Suppliers" subtitle={`${suppliers.length} suppliers in network`} breadcrumbs={[{ label: "Masters" }, { label: "Suppliers" }]}
      actions={<Button size="sm" onClick={() => setIsFormOpen(true)}><Plus className="w-4 h-4 mr-1.5" /> Add Supplier</Button>}>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[{label:"Total Suppliers",value:suppliers.length},{label:"Active",value:suppliers.filter(s=>s.status==="active").length},{label:"Total Payables",value:formatCurrency(suppliers.reduce((a,s)=>a+s.outstanding,0))},{label:"Overdue Bills",value:4}].map(s=>(
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
              {paginated.map(s=>(
                <tr key={s.id} className="hover:bg-slate-50 transition-colors">
                  <td className="px-4 py-3 font-mono font-bold text-[#3F63AD]">{s.code}</td>
                  <td className="px-4 py-3 font-semibold text-foreground">{s.name}</td>
                  <td className="px-4 py-3"><p className="font-medium text-foreground">{s.phone}</p><p className="text-xs text-muted-foreground">{s.email}</p></td>
                  <td className="px-4 py-3 text-muted-foreground">{s.city}, {s.state}</td>
                  <td className="px-4 py-3 font-mono text-xs text-slate-700">{s.gst}</td>
                  <td className="px-4 py-3 font-semibold text-red-600">{formatCurrency(s.outstanding)}</td>
                  <td className="px-4 py-3"><Badge variant={s.status==="active"?"success":"secondary"}>{s.status}</Badge></td>
                  <td className="px-4 py-3 text-center">
                    <Button variant="ghost" size="sm" className="text-red-500" onClick={() => { setSuppliers(prev => prev.filter(x => x.id !== s.id)); toast.success("Supplier removed"); }}>Delete</Button>
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
                <h3 className="text-xl font-bold tracking-tight">Add Supplier & Distributor</h3>
                <p className="text-xs text-slate-300 mt-0.5">
                  Register electronic brand manufacturers, vendors and authorized distributors
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
            <Button onClick={handleSave} className="bg-[#3F63AD] hover:bg-[#2E4F95] text-white px-6 font-bold shadow-lg shadow-[#3F63AD]/20">
              Save & Register Supplier
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </PageShell>
  );
}

