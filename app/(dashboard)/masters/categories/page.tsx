"use client";
import { PageShell } from "@/components/shared/page-shell";
import { Button } from "@/components/ui/button";
import { Plus, Tag, Search } from "lucide-react";
import { useState, useMemo } from "react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

const INITIAL_CATEGORIES = [
  { id: "1", name: "Smartphones & Feature Phones", description: "Android, iOS, 5G smartphones & keypad feature phones", items: 145, status: "active" },
  { id: "2", name: "Mobile Accessories", description: "Chargers, cables, power banks, cases & screen protectors", items: 230, status: "active" },
  { id: "3", name: "Smartwatches & Wearables", description: "Fitness bands, smartwatches & smart rings", items: 48, status: "active" },
  { id: "4", name: "Audio & Sound", description: "TWS earbuds, headphones, bluetooth speakers & soundbars", items: 96, status: "active" },
  { id: "5", name: "Laptops & Computers", description: "Laptops, MacBooks, gaming PCs & all-in-one desktops", items: 64, status: "active" },
  { id: "6", name: "Computer Accessories", description: "Keyboards, mice, webcams, laptop stands & USB hubs", items: 112, status: "active" },
  { id: "7", name: "Storage & Memory", description: "Memory cards, pen drives, external SSDs & HDDs", items: 78, status: "active" },
  { id: "8", name: "Televisions & Display", description: "Smart TVs, 4K OLED/QLED TVs, monitors & projectors", items: 42, status: "active" },
  { id: "9", name: "Home Appliances", description: "Air conditioners, refrigerators, microwave ovens & washing machines", items: 55, status: "active" },
  { id: "10", name: "Networking & Smart Home", description: "Wi-Fi 6 routers, security cameras & smart home devices", items: 39, status: "active" },
];

export default function CategoriesPage() {
  const [categories, setCategories] = useState(INITIAL_CATEGORIES);
  const [search, setSearch] = useState("");
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<typeof INITIAL_CATEGORIES[0] | null>(null);
  const [formData, setFormData] = useState({ name: "", description: "", status: "active" });

  const filtered = useMemo(() => {
    return categories.filter(c =>
      !search || c.name.toLowerCase().includes(search.toLowerCase()) || c.description.toLowerCase().includes(search.toLowerCase())
    );
  }, [categories, search]);

  const openAdd = () => {
    setEditingCategory(null);
    setFormData({ name: "", description: "", status: "active" });
    setIsFormOpen(true);
  };

  const openEdit = (cat: typeof INITIAL_CATEGORIES[0]) => {
    setEditingCategory(cat);
    setFormData({ name: cat.name, description: cat.description, status: cat.status });
    setIsFormOpen(true);
  };

  const handleSave = () => {
    if (!formData.name) {
      toast.error("Category name is required");
      return;
    }

    if (editingCategory) {
      setCategories(prev => prev.map(c => c.id === editingCategory.id ? { ...c, ...formData } : c));
      toast.success("Category updated successfully");
    } else {
      const newCategory = {
        id: String(Date.now()),
        name: formData.name,
        description: formData.description || "Electronics product category",
        items: Math.floor(Math.random() * 20) + 1,
        status: formData.status as "active" | "inactive",
      };
      setCategories(prev => [newCategory, ...prev]);
      toast.success(`Category "${formData.name}" added successfully`);
    }
    setIsFormOpen(false);
  };

  return (
    <PageShell
      title="Categories"
      subtitle="Organize your mobile & electronics items"
      breadcrumbs={[{ label: "Masters", href: "/masters/items" }, { label: "Categories" }]}
      actions={
        <Button size="sm" onClick={openAdd}>
          <Plus className="w-4 h-4 mr-1.5" /> Add Category
        </Button>
      }
    >
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[{ label: "Total Categories", value: categories.length }, { label: "Active", value: categories.filter(c => c.status === "active").length }, { label: "Total Items", value: categories.reduce((a, c) => a + c.items, 0) }, { label: "Inactive", value: categories.filter(c => c.status === "inactive").length }].map((s) => (
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
              placeholder="Search categories..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9"
            />
          </div>
          <span className="text-sm font-semibold text-muted-foreground">{filtered.length} Categories</span>
        </div>

        <div className="divide-y">
          {filtered.length === 0 ? (
            <div className="p-8 text-center text-muted-foreground">No categories found</div>
          ) : (
            filtered.map((cat) => (
              <div key={cat.id} className="flex items-center gap-4 px-4 py-3.5 hover:bg-slate-50 transition-colors">
                <div className="w-10 h-10 rounded-xl bg-[#3F63AD]/10 flex items-center justify-center flex-shrink-0">
                  <Tag className="w-5 h-5 text-[#3F63AD]" />
                </div>
                <div className="flex-1">
                  <p className="font-semibold text-foreground">{cat.name}</p>
                  <p className="text-xs text-muted-foreground">{cat.description}</p>
                </div>
                <div className="text-sm text-muted-foreground font-medium">{cat.items} items</div>
                <Badge variant={cat.status === "active" ? "success" : "secondary"}>
                  {cat.status === "active" ? "Active" : "Inactive"}
                </Badge>
                <div className="flex gap-1">
                  <Button variant="ghost" size="sm" onClick={() => openEdit(cat)}>Edit</Button>
                  <Button variant="ghost" size="sm" className="text-red-500 hover:text-red-600 hover:bg-red-50" onClick={() => { setCategories(c => c.filter(x => x.id !== cat.id)); toast.success("Category deleted"); }}>Delete</Button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Add / Edit Category Dialog */}
      <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
        <DialogContent className="max-w-2xl p-0 rounded-2xl border-none shadow-2xl overflow-hidden">
          {/* Header */}
          <div className="bg-gradient-to-r from-[#1B2537] via-[#2C3E5A] to-[#1B2537] text-white p-6 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl bg-white/10 flex items-center justify-center backdrop-blur-md border border-white/20">
                <Tag className="w-6 h-6 text-[#76C043]" />
              </div>
              <div>
                <h3 className="text-xl font-bold tracking-tight">
                  {editingCategory ? "Edit Product Category" : "Add Product Category"}
                </h3>
                <p className="text-xs text-slate-300 mt-0.5">
                  Organize your mobile & electronics stock items into categories
                </p>
              </div>
            </div>
          </div>

          <div className="p-6 space-y-4 bg-slate-50/50">
            <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1.5 md:col-span-2">
                  <Label className="text-xs font-semibold text-slate-700">Category Name *</Label>
                  <Input
                    placeholder="e.g. Smartwatches & Wearables"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="bg-slate-50 border-slate-300"
                  />
                </div>
                <div className="space-y-1.5 md:col-span-2">
                  <Label className="text-xs font-semibold text-slate-700">Description</Label>
                  <Input
                    placeholder="Brief description of products in this category (e.g. Smartbands, Apple Watches)"
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    className="bg-slate-50 border-slate-300"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold text-slate-700">Status</Label>
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
              {editingCategory ? "Save Changes" : "Create Category"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </PageShell>
  );
}

