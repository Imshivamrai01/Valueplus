"use client";

import { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Plus, Search, Filter, Download, Upload, Printer, MoreHorizontal, Edit, Trash2, Eye, Package, TrendingUp, AlertTriangle, CheckCircle } from "lucide-react";
import { toast } from "sonner";
import { PageShell } from "@/components/shared/page-shell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { formatCurrency, downloadCSV, formatDate } from "@/lib/utils";

const WAREHOUSES = ["Main Store - Mumbai", "Pune Branch", "Delhi Hub", "Bengaluru Store"];

interface ItemFormData {
  name: string;
  code: string;
  category: string;
  brand: string;
  unit: string;
  hsn: string;
  gstRate: string;
  purchasePrice: string;
  sellingPrice: string;
  mrp: string;
  currentStock: string;
  reorderLevel: string;
  warehouse: string;
  status: string;
}

const EMPTY_FORM: ItemFormData = {
  name: "", code: "", category: "", brand: "", unit: "PCS",
  hsn: "", gstRate: "18", purchasePrice: "", sellingPrice: "",
  mrp: "", currentStock: "0", reorderLevel: "10",
  warehouse: WAREHOUSES[0], status: "active",
};

export default function ItemsPage() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<any | null>(null);
  const [viewingItem, setViewingItem] = useState<any | null>(null);
  const [deletingCode, setDeletingCode] = useState<string | null>(null);
  const [formData, setFormData] = useState<ItemFormData>(EMPTY_FORM);
  const [page, setPage] = useState(1);
  const PER_PAGE = 10;

  const { data: items = [], isLoading: loading } = useQuery({
    queryKey: ["items"],
    queryFn: async () => {
      const res = await fetch("/api/items");
      const json = await res.json();
      if (!json.success) throw new Error(json.error);
      return json.data;
    }
  });

  const { data: categories = [] } = useQuery({
    queryKey: ["categories"],
    queryFn: async () => {
      const res = await fetch("/api/categories");
      const json = await res.json();
      if (!json.success) return [];
      return json.data;
    }
  });

  const { data: salesHistory = [], isLoading: historyLoading } = useQuery({
    queryKey: ["item-history", viewingItem?.code],
    queryFn: async () => {
      if (!viewingItem?.code) return [];
      const res = await fetch(`/api/items/history?code=${encodeURIComponent(viewingItem.code)}`);
      const json = await res.json();
      if (!json.success) throw new Error(json.error);
      return json.data;
    },
    enabled: !!viewingItem
  });

  const { data: brands = [] } = useQuery({
    queryKey: ["brands"],
    queryFn: async () => {
      const res = await fetch("/api/brands");
      const json = await res.json();
      if (!json.success) return [];
      return json.data;
    }
  });

  const filtered = useMemo(() => {
    return items.filter((item) => {
      const matchSearch = !search || 
        item.name.toLowerCase().includes(search.toLowerCase()) ||
        item.code.toLowerCase().includes(search.toLowerCase()) ||
        item.brand.toLowerCase().includes(search.toLowerCase());
      const matchCategory = categoryFilter === "all" || item.category === categoryFilter;
      let matchStatus = true;
      if (statusFilter === "low_stock") {
        matchStatus = item.currentStock > 0 && item.currentStock <= item.reorderLevel;
      } else if (statusFilter !== "all") {
        matchStatus = item.status === statusFilter;
      }
      return matchSearch && matchCategory && matchStatus;
    });
  }, [items, search, categoryFilter, statusFilter]);

  const paginated = filtered.slice((page - 1) * PER_PAGE, page * PER_PAGE);
  const totalPages = Math.ceil(filtered.length / PER_PAGE);

  const summaryStats = useMemo(() => ({
    total: items.length,
    active: items.filter((i) => i.status === "active").length,
    lowStock: items.filter((i) => i.currentStock > 0 && i.currentStock <= i.reorderLevel).length,
    outOfStock: items.filter((i) => i.currentStock === 0).length,
  }), [items]);

  const handleSelectAll = (checked: boolean) => {
    setSelectedIds(checked ? paginated.map((i) => i.code) : []);
  };

  const handleSelect = (code: string, checked: boolean) => {
    setSelectedIds((prev) => checked ? [...prev, code] : prev.filter((id) => id !== code));
  };

  const openAdd = () => {
    setEditingItem(null);
    setFormData({ ...EMPTY_FORM, code: `ITM-${String(items.length + 1).padStart(4, "0")}` });
    setIsFormOpen(true);
  };

  const openEdit = (item: any) => {
    setEditingItem(item);
    setFormData({
      name: item.name, code: item.code, category: item.category, brand: item.brand,
      unit: item.unit, hsn: item.hsnCode || item.hsn || "", gstRate: String(item.gstRate),
      purchasePrice: String(item.purchasePrice), sellingPrice: String(item.sellingPrice),
      mrp: String(item.mrp), currentStock: String(item.currentStock),
      reorderLevel: String(item.reorderLevel), warehouse: item.warehouse, status: item.status,
    });
    setIsFormOpen(true);
  };

  const saveMutation = useMutation({
    mutationFn: async (payload: any) => {
      const method = editingItem ? "PUT" : "POST";
      const res = await fetch("/api/items", {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });
      const json = await res.json();
      if (!json.success) throw new Error(json.error || "Failed to save item");
      return json.data;
    },
    onSuccess: () => {
      toast.success(editingItem ? "Item updated successfully" : "Item added successfully");
      setIsFormOpen(false);
      queryClient.invalidateQueries({ queryKey: ["items"] });
    },
    onError: (error: any) => {
      toast.error(error.message || "An error occurred");
    }
  });

  const deleteMutation = useMutation({
    mutationFn: async (code: string) => {
      const res = await fetch(`/api/items?code=${code}`, { method: "DELETE" });
      const json = await res.json();
      if (!json.success) throw new Error(json.error || "Failed to delete item");
      return json;
    },
    onSuccess: () => {
      toast.success("Item deleted");
      queryClient.invalidateQueries({ queryKey: ["items"] });
      setIsDeleteOpen(false);
      setDeletingCode(null);
    },
    onError: (error: any) => {
      toast.error(error.message || "An error occurred");
      setIsDeleteOpen(false);
      setDeletingCode(null);
    }
  });

  const handleSave = async () => {
    if (!formData.name || !formData.sellingPrice) {
      toast.error("Please fill all required fields");
      return;
    }
    
    const payload = {
      ...formData,
      code: formData.code || `ITM-${String(items.length + 1).padStart(4, "0")}`,
      gstRate: Number(formData.gstRate),
      purchasePrice: Number(formData.purchasePrice),
      sellingPrice: Number(formData.sellingPrice),
      mrp: Number(formData.mrp),
      currentStock: Number(formData.currentStock),
      reorderLevel: Number(formData.reorderLevel)
    };

    saveMutation.mutate(payload);
  };

  const confirmDelete = (code: string) => {
    setDeletingCode(code);
    setIsDeleteOpen(true);
  };

  const handleDelete = () => {
    if (deletingCode) {
      deleteMutation.mutate(deletingCode);
    }
  };

  const handleBulkDelete = () => {
    toast.error("Bulk delete not fully implemented via API yet");
    setSelectedIds([]);
  };

  const getStockStatus = (item: any) => {
    if (item.currentStock === 0) return { label: "Out of Stock", variant: "destructive" as const, low: true };
    if (item.currentStock <= item.reorderLevel) return { label: "Reorder Needed", variant: "destructive" as const, low: true };
    return { label: "In Stock", variant: "success" as const, low: false };
  };

  return (
    <PageShell
      title="Items"
      subtitle={`${summaryStats.total} products in your catalog`}
      breadcrumbs={[{ label: "Masters", href: "/masters/items" }, { label: "Items" }]}
      actions={
        <>
          <Button variant="outline" size="sm" onClick={() => toast.info("Import feature coming soon")}>
            <Upload className="w-4 h-4 mr-1.5" /> Import
          </Button>
          <Button variant="outline" size="sm" onClick={() => downloadCSV(items.map(i => ({...i})), "items.csv")}>
            <Download className="w-4 h-4 mr-1.5" /> Export
          </Button>
          <Button size="sm" onClick={openAdd}>
            <Plus className="w-4 h-4 mr-1.5" /> Add Item
          </Button>
        </>
      }
    >
      {/* Summary Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: "Total Items", value: summaryStats.total, icon: Package, color: "text-[#3F63AD]", bg: "bg-[#3F63AD]/10" },
          { label: "Active", value: summaryStats.active, icon: CheckCircle, color: "text-emerald-600", bg: "bg-emerald-50" },
          { label: "Low Stock", value: summaryStats.lowStock, icon: AlertTriangle, color: "text-amber-600", bg: "bg-amber-50" },
          { label: "Out of Stock", value: summaryStats.outOfStock, icon: AlertTriangle, color: "text-red-600", bg: "bg-red-50" },
        ].map((stat) => (
          <div key={stat.label} className="metric-card flex items-center gap-4">
            <div className={`w-11 h-11 rounded-2xl flex items-center justify-center ${stat.bg}`}>
              <stat.icon className={`w-5 h-5 ${stat.color}`} />
            </div>
            <div>
              <p className="text-2xl font-bold">{stat.value}</p>
              <p className="text-xs text-muted-foreground">{stat.label}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Table */}
      <div className="data-table-container">
        {/* Toolbar */}
        <div className="flex flex-wrap items-center gap-3 p-4 border-b">
          <div className="relative flex-1 min-w-48">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Search items, code, brand..."
              value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(1); }}
              className="pl-9"
            />
          </div>
          <Select value={categoryFilter} onValueChange={(v) => { setCategoryFilter(v); setPage(1); }}>
            <SelectTrigger className="w-44">
              <SelectValue placeholder="Category" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Categories</SelectItem>
              {categories.map((c: any) => <SelectItem key={c._id || c.id} value={c.name}>{c.name}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={statusFilter} onValueChange={(v) => { setStatusFilter(v); setPage(1); }}>
            <SelectTrigger className="w-32">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="active">Active</SelectItem>
              <SelectItem value="inactive">Inactive</SelectItem>
              <SelectItem value="low_stock">Low Stock (Reorder)</SelectItem>
            </SelectContent>
          </Select>

          {selectedIds.length > 0 && (
            <div className="flex items-center gap-2 ml-auto">
              <span className="text-sm text-muted-foreground">{selectedIds.length} selected</span>
              <Button variant="destructive" size="sm" onClick={handleBulkDelete}>
                <Trash2 className="w-3.5 h-3.5 mr-1" /> Delete
              </Button>
            </div>
          )}
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 border-b">
              <tr>
                <th className="w-10 px-4 py-3">
                  <Checkbox
                    checked={selectedIds.length === paginated.length && paginated.length > 0}
                    onCheckedChange={handleSelectAll}
                  />
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wide">Item</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wide">Category</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wide">HSN / GST</th>
                <th className="px-4 py-3 text-right text-xs font-semibold text-muted-foreground uppercase tracking-wide">Purchase ₹</th>
                <th className="px-4 py-3 text-right text-xs font-semibold text-muted-foreground uppercase tracking-wide">Selling ₹</th>
                <th className="px-4 py-3 text-right text-xs font-semibold text-muted-foreground uppercase tracking-wide">Stock</th>
                <th className="px-4 py-3 text-center text-xs font-semibold text-muted-foreground uppercase tracking-wide">Status</th>
                <th className="px-4 py-3 text-center text-xs font-semibold text-muted-foreground uppercase tracking-wide">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {loading ? (
                <tr>
                  <td colSpan={9} className="px-4 py-16 text-center">
                    <p className="text-muted-foreground font-medium">Loading items...</p>
                  </td>
                </tr>
              ) : paginated.length === 0 ? (
                <tr>
                  <td colSpan={9} className="px-4 py-16 text-center">
                    <Package className="w-12 h-12 text-muted-foreground/30 mx-auto mb-3" />
                    <p className="text-muted-foreground font-medium">No items found</p>
                    <p className="text-xs text-muted-foreground mt-1">Try adjusting your search or filters</p>
                  </td>
                </tr>
              ) : (
                paginated.map((item) => {
                  const stockStatus = getStockStatus(item);
                  const isSelected = selectedIds.includes(item.code);
                  const rowBg = isSelected ? "bg-blue-50/50" : (stockStatus.low ? "bg-red-50/50 hover:bg-red-50/70" : "hover:bg-slate-50/70");
                  return (
                    <tr key={item.code} className={`transition-colors ${rowBg}`}>
                      <td className="px-4 py-3">
                        <Checkbox
                          checked={isSelected}
                          onCheckedChange={(v) => handleSelect(item.code, v as boolean)}
                        />
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-xl bg-[#3F63AD]/10 flex items-center justify-center flex-shrink-0">
                            <Package className="w-4 h-4 text-[#3F63AD]" />
                          </div>
                          <div>
                            <p className="font-medium text-foreground">{item.name}</p>
                            <p className="text-xs text-muted-foreground">{item.code} · {item.brand}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-muted-foreground">{item.category}</td>
                      <td className="px-4 py-3">
                        <p className="text-sm font-mono">{item.hsnCode || item.hsn}</p>
                        <p className="text-xs text-muted-foreground">GST {item.gstRate}%</p>
                      </td>
                      <td className="px-4 py-3 text-right font-medium">{formatCurrency(item.purchasePrice)}</td>
                      <td className="px-4 py-3 text-right">
                        <p className="font-semibold text-foreground">{formatCurrency(item.sellingPrice)}</p>
                        <p className="text-xs text-muted-foreground">MRP {formatCurrency(item.mrp)}</p>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <p className={`font-semibold ${item.currentStock === 0 ? "text-red-600" : item.currentStock <= item.reorderLevel ? "text-amber-600" : "text-foreground"}`}>
                          {item.currentStock}
                        </p>
                        <p className="text-xs text-muted-foreground">Min: {item.reorderLevel}</p>
                      </td>
                      <td className="px-4 py-3 text-center">
                        <Badge variant={stockStatus.variant}>{stockStatus.label}</Badge>
                      </td>
                      <td className="px-4 py-3 text-center">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <button className="p-1.5 rounded-lg hover:bg-slate-100 transition-colors">
                              <MoreHorizontal className="w-4 h-4 text-muted-foreground" />
                            </button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="w-40">
                            <DropdownMenuItem onClick={() => setViewingItem(item)}>
                              <Eye className="w-4 h-4 mr-2" /> View
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => openEdit(item)}>
                              <Edit className="w-4 h-4 mr-2" /> Edit
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem
                              onClick={() => confirmDelete(item.code)}
                              className="text-red-600 focus:text-red-600 focus:bg-red-50"
                            >
                              <Trash2 className="w-4 h-4 mr-2" /> Delete
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        <div className="flex items-center justify-between px-4 py-3 border-t text-sm text-muted-foreground">
          <p>Showing {Math.min((page - 1) * PER_PAGE + 1, filtered.length)}–{Math.min(page * PER_PAGE, filtered.length)} of {filtered.length} items</p>
          <div className="flex items-center gap-1">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page === 1}
              className="px-3 py-1.5 rounded-lg border hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              Previous
            </button>
            {Array.from({ length: Math.min(5, totalPages) }, (_, i) => i + 1).map((p) => (
              <button
                key={p}
                onClick={() => setPage(p)}
                className={`w-8 h-8 rounded-lg text-xs font-medium transition-colors ${page === p ? "bg-[#3F63AD] text-white" : "hover:bg-slate-100"}`}
              >
                {p}
              </button>
            ))}
            <button
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page === totalPages}
              className="px-3 py-1.5 rounded-lg border hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              Next
            </button>
          </div>
        </div>
      </div>

      {/* Add/Edit Modal */}
      <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto p-0 rounded-2xl border-none shadow-2xl">
          {/* Header */}
          <div className="bg-gradient-to-r from-[#1B2537] via-[#2C3E5A] to-[#1B2537] text-white p-6 rounded-t-2xl flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl bg-white/10 flex items-center justify-center backdrop-blur-md border border-white/20">
                <Package className="w-6 h-6 text-[#76C043]" />
              </div>
              <div>
                <h3 className="text-xl font-bold tracking-tight">
                  {editingItem ? "Edit Product Catalog Item" : "Add Mobile & Electronics Item"}
                </h3>
                <p className="text-xs text-slate-300 mt-0.5">
                  Specify product particulars, pricing, GST tax slate & warehouse stock levels
                </p>
              </div>
            </div>
          </div>

          <div className="p-6 space-y-6 bg-slate-50/50">
            {/* Section 1: General Product Particulars */}
            <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm space-y-4">
              <h4 className="text-xs font-extrabold uppercase tracking-wider text-[#3F63AD] flex items-center gap-2">
                <Package className="w-4 h-4 text-[#3F63AD]" /> 1. Product Identification & Categorization
              </h4>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="md:col-span-2 space-y-1.5">
                  <Label className="text-xs font-semibold text-slate-700">Product Name & Model *</Label>
                  <Input
                    placeholder="e.g. iPhone 15 Pro Max 256GB"
                    value={formData.name}
                    onChange={(e) => setFormData((f) => ({ ...f, name: e.target.value }))}
                    className="bg-slate-50 border-slate-300"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold text-slate-700">Item Code (SKU)</Label>
                  <Input
                    placeholder="Auto-generated (e.g. ITM-0016)"
                    value={formData.code}
                    onChange={(e) => setFormData((f) => ({ ...f, code: e.target.value }))}
                    className="bg-slate-50 border-slate-300 font-mono"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold text-slate-700">Category *</Label>
                  <Select value={formData.category} onValueChange={(v) => setFormData((f) => ({ ...f, category: v }))}>
                    <SelectTrigger className="bg-slate-50 border-slate-300"><SelectValue placeholder="Select category" /></SelectTrigger>
                    <SelectContent>
                      {categories.map((c: any) => <SelectItem key={c._id || c.id} value={c.name}>{c.name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold text-slate-700">Brand *</Label>
                  <Select value={formData.brand} onValueChange={(v) => setFormData((f) => ({ ...f, brand: v }))}>
                    <SelectTrigger className="bg-slate-50 border-slate-300"><SelectValue placeholder="Select brand" /></SelectTrigger>
                    <SelectContent>
                      {brands.map((b: any) => <SelectItem key={b._id || b.id} value={b.name}>{b.name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold text-slate-700">HSN Code</Label>
                  <Input
                    placeholder="85171300"
                    value={formData.hsn}
                    onChange={(e) => setFormData((f) => ({ ...f, hsn: e.target.value }))}
                    className="bg-slate-50 border-slate-300 font-mono"
                  />
                </div>
              </div>
            </div>

            {/* Section 2: Pricing & GST Tax */}
            <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm space-y-4">
              <h4 className="text-xs font-extrabold uppercase tracking-wider text-[#3F63AD] flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-[#3F63AD]" /> 2. Pricing & GST Tax Slabs
              </h4>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold text-slate-700">Purchase Cost (₹) *</Label>
                  <Input
                    type="number"
                    placeholder="125000"
                    value={formData.purchasePrice}
                    onChange={(e) => setFormData((f) => ({ ...f, purchasePrice: e.target.value }))}
                    className="bg-slate-50 border-slate-300"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold text-slate-700">Selling Price (₹) *</Label>
                  <Input
                    type="number"
                    placeholder="144900"
                    value={formData.sellingPrice}
                    onChange={(e) => setFormData((f) => ({ ...f, sellingPrice: e.target.value }))}
                    className="bg-slate-50 border-slate-300 font-semibold"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold text-slate-700">MRP (₹)</Label>
                  <Input
                    type="number"
                    placeholder="149900"
                    value={formData.mrp}
                    onChange={(e) => setFormData((f) => ({ ...f, mrp: e.target.value }))}
                    className="bg-slate-50 border-slate-300"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold text-slate-700">GST Rate (%)</Label>
                  <Select value={formData.gstRate} onValueChange={(v) => setFormData((f) => ({ ...f, gstRate: v }))}>
                    <SelectTrigger className="bg-slate-50 border-slate-300"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {[0, 5, 12, 18, 28].map((r) => <SelectItem key={r} value={String(r)}>{r}% GST</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>

            {/* Section 3: Inventory & Warehouse Allocation */}
            <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm space-y-4">
              <h4 className="text-xs font-extrabold uppercase tracking-wider text-[#3F63AD] flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-[#3F63AD]" /> 3. Stock Level & Warehouse Allocation
              </h4>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold text-slate-700">Fulfillment Store / Warehouse</Label>
                  <Select value={formData.warehouse} onValueChange={(v) => setFormData((f) => ({ ...f, warehouse: v }))}>
                    <SelectTrigger className="bg-slate-50 border-slate-300"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {WAREHOUSES.map((w) => <SelectItem key={w} value={w}>{w}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold text-slate-700">Opening Stock Quantity</Label>
                  <Input
                    type="number"
                    placeholder="25"
                    value={formData.currentStock}
                    onChange={(e) => setFormData((f) => ({ ...f, currentStock: e.target.value }))}
                    className="bg-slate-50 border-slate-300"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold text-slate-700">Low Stock Reorder Alert</Label>
                  <Input
                    type="number"
                    placeholder="5"
                    value={formData.reorderLevel}
                    onChange={(e) => setFormData((f) => ({ ...f, reorderLevel: e.target.value }))}
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
              {saveMutation.isPending ? "Saving..." : (editingItem ? "Update Catalog Item" : "Save & Add to Catalog")}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <Dialog open={isDeleteOpen} onOpenChange={setIsDeleteOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Delete Item</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete this item? This action cannot be undone.
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

      {/* View Item Modal */}
      <Dialog open={!!viewingItem} onOpenChange={(open) => !open && setViewingItem(null)}>
        <DialogContent className="max-w-4xl p-0 rounded-2xl overflow-hidden border-none shadow-2xl">
          <div className="bg-gradient-to-r from-[#1B2537] via-[#2C3E5A] to-[#1B2537] text-white p-5 flex justify-between items-center">
            <div>
              <h3 className="text-lg font-bold tracking-tight">Product Details & Sales History</h3>
              <p className="text-xs text-slate-300 mt-0.5">{viewingItem?.code} · {viewingItem?.brand}</p>
            </div>
            <Badge variant="outline" className="bg-white/10 text-white border-white/20">
              Stock: {viewingItem?.currentStock} {viewingItem?.unit}
            </Badge>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 bg-slate-50 min-h-[400px]">
            {/* Left Side: Details */}
            <div className="p-5 border-r border-slate-200 bg-white space-y-5">
              <h4 className="text-sm font-bold text-slate-700 flex items-center gap-2 border-b pb-2">
                <Package className="w-4 h-4 text-[#3F63AD]" /> Item Particulars
              </h4>
              <div className="grid grid-cols-1 gap-4 text-sm">
                <div>
                  <p className="text-xs text-muted-foreground font-semibold uppercase">Product Name</p>
                  <p className="font-medium text-foreground">{viewingItem?.name}</p>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-xs text-muted-foreground font-semibold uppercase">Category</p>
                    <p className="font-medium text-foreground">{viewingItem?.category}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground font-semibold uppercase">HSN Code</p>
                    <p className="font-medium text-foreground">{viewingItem?.hsnCode || viewingItem?.hsn || "N/A"}</p>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-xs text-muted-foreground font-semibold uppercase">GST Rate</p>
                    <p className="font-medium text-foreground">{viewingItem?.gstRate}%</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground font-semibold uppercase">Warehouse</p>
                    <p className="font-medium text-foreground">{viewingItem?.warehouse || "N/A"}</p>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4 bg-slate-50 p-3 rounded-lg border border-slate-100">
                  <div>
                    <p className="text-xs text-muted-foreground font-semibold uppercase">Purchase Price</p>
                    <p className="font-bold text-slate-700">{formatCurrency(viewingItem?.purchasePrice || 0)}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground font-semibold uppercase">Selling Price</p>
                    <p className="font-bold text-[#3F63AD]">{formatCurrency(viewingItem?.sellingPrice || 0)}</p>
                  </div>
                </div>
              </div>
            </div>
            
            {/* Right Side: History */}
            <div className="col-span-2 p-5 flex flex-col h-[400px]">
              <h4 className="text-sm font-bold text-slate-700 flex items-center gap-2 border-b pb-2 mb-4">
                <TrendingUp className="w-4 h-4 text-[#3F63AD]" /> Complete Transaction History
              </h4>
              
              <div className="flex-1 overflow-y-auto pr-2">
                {historyLoading ? (
                  <div className="flex flex-col items-center justify-center h-full space-y-3">
                    <div className="w-8 h-8 border-4 border-[#3F63AD] border-t-transparent rounded-full animate-spin"></div>
                    <p className="text-sm text-muted-foreground">Loading history...</p>
                  </div>
                ) : salesHistory.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-full text-center">
                    <div className="w-12 h-12 bg-slate-100 rounded-full flex items-center justify-center mb-3">
                      <TrendingUp className="w-5 h-5 text-slate-400" />
                    </div>
                    <p className="text-slate-600 font-medium">No sales recorded yet</p>
                    <p className="text-xs text-muted-foreground mt-1">When this item is sold, invoices will appear here.</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {salesHistory.map((h: any) => (
                      <div key={h.invoiceId} className="bg-white border border-slate-200 rounded-lg p-3 hover:shadow-md transition-shadow">
                        <div className="flex justify-between items-start mb-2">
                          <div>
                            <div className="font-bold text-foreground text-sm flex items-center gap-2">
                              {h.customerName}
                              <Badge variant="secondary" className="text-[10px] px-1.5 py-0 uppercase h-4 tracking-wider">
                                {h.type?.replace("-", " ") || "Tax Invoice"}
                              </Badge>
                            </div>
                            <p className="text-xs text-muted-foreground">{formatDate(h.date)}</p>
                          </div>
                          <Badge variant="outline" className="font-mono text-xs text-[#3F63AD] border-[#3F63AD]/20 bg-[#3F63AD]/5">{h.invoiceNumber}</Badge>
                        </div>
                        <div className="flex justify-between items-center bg-slate-50 p-2 rounded text-sm">
                          <span className="text-slate-600">Qty: <span className="font-bold text-foreground">{h.quantity}</span></span>
                          <span className="text-slate-600">Rate: <span className="font-bold text-foreground">{formatCurrency(h.rate)}</span></span>
                          <span className="text-[#3F63AD] font-bold">{formatCurrency(h.amount)}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
          <div className="bg-white px-5 py-3 flex justify-end border-t">
            <Button onClick={() => setViewingItem(null)} className="px-6 bg-slate-800 hover:bg-slate-700 text-white font-semibold shadow-sm">
              Close Window
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </PageShell>
  );
}
