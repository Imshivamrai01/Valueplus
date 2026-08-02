"use client";
import { PageShell } from "@/components/shared/page-shell";
import { Button } from "@/components/ui/button";
import { Plus, Award, Search } from "lucide-react";
import { useState, useMemo } from "react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

const BRANDS_DATA = [
  { id: "1", name: "Apple", description: "iPhones, MacBooks, iPads & AirPods", items: 142, status: "active" },
  { id: "2", name: "Samsung", description: "Smartphones, Smart TVs, Memory & Home Appliances", items: 188, status: "active" },
  { id: "3", name: "Vivo", description: "Smartphones & Mobile Accessories", items: 65, status: "active" },
  { id: "4", name: "Oppo", description: "Smartphones, Audio & Wearables", items: 58, status: "active" },
  { id: "5", name: "OnePlus", description: "Flagship Smartphones, Nord series & TWS Earbuds", items: 45, status: "active" },
  { id: "6", name: "Xiaomi / Redmi", description: "Smartphones, Smart TVs & Smart Home products", items: 120, status: "active" },
  { id: "7", name: "Realme", description: "Smartphones, Laptops & Audio products", items: 76, status: "active" },
  { id: "8", name: "boAt", description: "TWS Earbuds, Headphones & Bluetooth Speakers", items: 94, status: "active" },
  { id: "9", name: "Sony", description: "Bravia TVs, Headphones, Cameras & Audio Systems", items: 52, status: "active" },
  { id: "10", name: "LG", description: "Smart OLED/QLED TVs, ACs & Washing Machines", items: 48, status: "active" },
  { id: "11", name: "Dell", description: "Laptops, Desktops, Alienware & Monitors", items: 67, status: "active" },
  { id: "12", name: "HP", description: "Laptops, Printers & Computer Accessories", items: 83, status: "active" },
];

export default function BrandsPage() {
  const [brands, setBrands] = useState(BRANDS_DATA);
  const [search, setSearch] = useState("");
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingBrand, setEditingBrand] = useState<typeof BRANDS_DATA[0] | null>(null);
  const [formData, setFormData] = useState({ name: "", description: "", status: "active" });

  const filtered = useMemo(() => {
    return brands.filter(b =>
      !search || b.name.toLowerCase().includes(search.toLowerCase()) || b.description.toLowerCase().includes(search.toLowerCase())
    );
  }, [brands, search]);

  const openAdd = () => {
    setEditingBrand(null);
    setFormData({ name: "", description: "", status: "active" });
    setIsFormOpen(true);
  };

  const openEdit = (b: typeof BRANDS_DATA[0]) => {
    setEditingBrand(b);
    setFormData({ name: b.name, description: b.description, status: b.status });
    setIsFormOpen(true);
  };

  const handleSave = () => {
    if (!formData.name) {
      toast.error("Brand name is required");
      return;
    }

    if (editingBrand) {
      setBrands(prev => prev.map(b => b.id === editingBrand.id ? { ...b, ...formData } : b));
      toast.success("Brand updated successfully");
    } else {
      const newBrand = {
        id: String(Date.now()),
        name: formData.name,
        description: formData.description || "Electronics product brand",
        items: Math.floor(Math.random() * 25) + 1,
        status: formData.status as "active" | "inactive",
      };
      setBrands(prev => [newBrand, ...prev]);
      toast.success(`Brand "${formData.name}" added successfully`);
    }
    setIsFormOpen(false);
  };

  return (
    <PageShell 
      title="Brands" 
      subtitle="Manage product brands in your catalog" 
      breadcrumbs={[{ label: "Masters" }, { label: "Brands" }]}
      actions={
        <Button size="sm" onClick={openAdd}>
          <Plus className="w-4 h-4 mr-1.5" /> Add Brand
        </Button>
      }
    >
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[{ label: "Total Brands", value: brands.length }, { label: "Active Brands", value: brands.filter(b => b.status === "active").length }, { label: "Total Items", value: brands.reduce((a, b) => a + b.items, 0) }, { label: "Inactive Brands", value: brands.filter(b => b.status === "inactive").length }].map((s) => (
          <div key={s.label} className="metric-card">
            <p className="text-2xl font-bold">{s.value}</p>
            <p className="text-xs text-muted-foreground mt-1">{s.label}</p>
          </div>
        ))}
      </div>

      <div className="data-table-container">
        <div className="flex items-center justify-between p-4 border-b">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Search brands..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9"
            />
          </div>
          <span className="text-sm font-semibold text-muted-foreground">{filtered.length} Brands</span>
        </div>

        <div className="divide-y">
          {filtered.length === 0 ? (
            <div className="p-8 text-center text-muted-foreground">No brands found</div>
          ) : (
            filtered.map((b) => (
              <div key={b.id} className="flex items-center gap-4 px-4 py-3.5 hover:bg-slate-50 transition-colors">
                <div className="w-10 h-10 rounded-xl bg-[#3F63AD]/10 flex items-center justify-center font-bold text-[#3F63AD] text-base flex-shrink-0">
                  {b.name.charAt(0)}
                </div>
                <div className="flex-1">
                  <p className="font-semibold text-foreground">{b.name}</p>
                  <p className="text-xs text-muted-foreground">{b.description}</p>
                </div>
                <span className="text-sm font-medium text-muted-foreground">{b.items} items</span>
                <Badge variant={b.status === "active" ? "success" : "secondary"}>
                  {b.status === "active" ? "Active" : "Inactive"}
                </Badge>
                <div className="flex gap-1">
                  <Button variant="ghost" size="sm" onClick={() => openEdit(b)}>Edit</Button>
                  <Button variant="ghost" size="sm" className="text-red-500 hover:bg-red-50" onClick={() => { setBrands(x => x.filter(i => i.id !== b.id)); toast.success("Brand deleted"); }}>Delete</Button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Add / Edit Brand Dialog */}
      <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
        <DialogContent className="max-w-2xl p-0 rounded-2xl border-none shadow-2xl overflow-hidden">
          {/* Header */}
          <div className="bg-gradient-to-r from-[#1B2537] via-[#2C3E5A] to-[#1B2537] text-white p-6 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl bg-white/10 flex items-center justify-center backdrop-blur-md border border-white/20">
                <Sparkles className="w-6 h-6 text-[#76C043]" />
              </div>
              <div>
                <h3 className="text-xl font-bold tracking-tight">
                  {editingBrand ? "Edit Electronics Brand" : "Add Electronics Brand"}
                </h3>
                <p className="text-xs text-slate-300 mt-0.5">
                  Register mobile & electronics brand manufacturers in your ERP master catalog
                </p>
              </div>
            </div>
          </div>

          <div className="p-6 space-y-4 bg-slate-50/50">
            <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1.5 md:col-span-2">
                  <Label className="text-xs font-semibold text-slate-700">Brand Manufacturer Name *</Label>
                  <Input
                    placeholder="e.g. Apple, Samsung, Sony, boAt"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="bg-slate-50 border-slate-300"
                  />
                </div>
                <div className="space-y-1.5 md:col-span-2">
                  <Label className="text-xs font-semibold text-slate-700">Description / Brand Tagline</Label>
                  <Input
                    placeholder="Brief info (e.g. Premium smartphones, laptops and accessories)"
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    className="bg-slate-50 border-slate-300"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold text-slate-700">Catalog Status</Label>
                  <Select value={formData.status} onValueChange={(v) => setFormData({ ...formData, status: v })}>
                    <SelectTrigger className="bg-slate-50 border-slate-300"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="active">Active</SelectItem>
                      <SelectItem value="inactive">Inactive</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-slate-100 px-6 py-4 rounded-b-2xl border-t border-slate-200 flex items-center justify-end gap-3">
            <Button variant="outline" onClick={() => setIsFormOpen(false)} className="px-5">
              Cancel
            </Button>
            <Button onClick={handleSave} className="bg-[#3F63AD] hover:bg-[#2E4F95] text-white px-6 font-bold shadow-lg shadow-[#3F63AD]/20">
              {editingBrand ? "Save Changes" : "Register Brand"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </PageShell>
  );
}
