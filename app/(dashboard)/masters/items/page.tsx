"use client";

import { useState, useMemo } from "react";
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
import { formatCurrency, downloadCSV } from "@/lib/utils";

// ─── DUMMY DATA ────────────────────────────────────────────────
const CATEGORIES = [
  "Smartphones & Feature Phones",
  "Mobile Accessories",
  "Smartwatches & Wearables",
  "Audio & Sound",
  "Laptops & Computers",
  "Computer Accessories",
  "Storage & Memory",
  "Televisions & Display",
  "Home Appliances",
  "Networking & Smart Home"
];

const BRANDS = ["Apple", "Samsung", "Vivo", "Oppo", "OnePlus", "Xiaomi", "Realme", "boAt", "Sony", "LG", "Dell", "HP", "Lenovo", "Asus", "Noise", "SanDisk"];
const WAREHOUSES = ["Main Store - Mumbai", "Pune Branch", "Delhi Hub", "Bengaluru Store"];

function generateItems() {
  const items = [
    { name: "iPhone 15 Pro Max 256GB", code: "ITM-0001", category: "Smartphones & Feature Phones", brand: "Apple", unit: "PCS", hsn: "85171300", gstRate: 18, purchasePrice: 125000, sellingPrice: 144900, mrp: 149900, currentStock: 24, reorderLevel: 5, warehouse: "Main Store - Mumbai", status: "active" },
    { name: "Samsung Galaxy S24 Ultra 512GB", code: "ITM-0002", category: "Smartphones & Feature Phones", brand: "Samsung", unit: "PCS", hsn: "85171300", gstRate: 18, purchasePrice: 110000, sellingPrice: 129999, mrp: 139999, currentStock: 18, reorderLevel: 4, warehouse: "Main Store - Mumbai", status: "active" },
    { name: "MacBook Air M3 16GB/512GB", code: "ITM-0003", category: "Laptops & Computers", brand: "Apple", unit: "PCS", hsn: "84713010", gstRate: 18, purchasePrice: 105000, sellingPrice: 124900, mrp: 134900, currentStock: 12, reorderLevel: 3, warehouse: "Main Store - Mumbai", status: "active" },
    { name: "Sony Bravia 55 inch 4K Ultra HD Smart LED TV", code: "ITM-0004", category: "Televisions & Display", brand: "Sony", unit: "PCS", hsn: "85285900", gstRate: 28, purchasePrice: 52000, sellingPrice: 64990, mrp: 74900, currentStock: 8, reorderLevel: 2, warehouse: "Main Store - Mumbai", status: "active" },
    { name: "AirPods Pro (2nd Gen) USB-C", code: "ITM-0005", category: "Audio & Sound", brand: "Apple", unit: "PR", hsn: "85183000", gstRate: 18, purchasePrice: 18500, sellingPrice: 22900, mrp: 24900, currentStock: 45, reorderLevel: 10, warehouse: "Delhi Hub", status: "active" },
    { name: "boAt Airdopes 141 TWS Earbuds", code: "ITM-0006", category: "Audio & Sound", brand: "boAt", unit: "PR", hsn: "85183000", gstRate: 18, purchasePrice: 750, sellingPrice: 1299, mrp: 4490, currentStock: 120, reorderLevel: 25, warehouse: "Pune Branch", status: "active" },
    { name: "OnePlus 12 5G 16GB/512GB", code: "ITM-0007", category: "Smartphones & Feature Phones", brand: "OnePlus", unit: "PCS", hsn: "85171300", gstRate: 18, purchasePrice: 58000, sellingPrice: 64999, mrp: 69999, currentStock: 15, reorderLevel: 5, warehouse: "Bengaluru Store", status: "active" },
    { name: "Apple 20W USB-C Power Adapter", code: "ITM-0008", category: "Mobile Accessories", brand: "Apple", unit: "PCS", hsn: "85044090", gstRate: 18, purchasePrice: 1300, sellingPrice: 1799, mrp: 1900, currentStock: 85, reorderLevel: 20, warehouse: "Main Store - Mumbai", status: "active" },
    { name: "SanDisk Extreme 1TB Portable SSD", code: "ITM-0009", category: "Storage & Memory", brand: "SanDisk", unit: "PCS", hsn: "85235100", gstRate: 18, purchasePrice: 8200, sellingPrice: 10999, mrp: 14500, currentStock: 32, reorderLevel: 8, warehouse: "Main Store - Mumbai", status: "active" },
    { name: "TP-Link Archer AX5400 WiFi 6 Router", code: "ITM-0010", category: "Networking & Smart Home", brand: "Asus", unit: "PCS", hsn: "85176290", gstRate: 18, purchasePrice: 7200, sellingPrice: 9999, mrp: 12999, currentStock: 14, reorderLevel: 5, warehouse: "Delhi Hub", status: "active" },
    { name: "Logitech MX Master 3S Wireless Mouse", code: "ITM-0011", category: "Computer Accessories", brand: "Asus", unit: "PCS", hsn: "84716060", gstRate: 18, purchasePrice: 6800, sellingPrice: 8995, mrp: 10995, currentStock: 22, reorderLevel: 6, warehouse: "Pune Branch", status: "active" },
    { name: "LG 1.5 Ton 5 Star AI Dual Inverter Split AC", code: "ITM-0012", category: "Home Appliances", brand: "LG", unit: "UNT", hsn: "84151010", gstRate: 28, purchasePrice: 36500, sellingPrice: 44490, mrp: 54990, currentStock: 6, reorderLevel: 2, warehouse: "Main Store - Mumbai", status: "active" },
    { name: "Samsung 253L 3 Star Frost Free Refrigerator", code: "ITM-0013", category: "Home Appliances", brand: "Samsung", unit: "UNT", hsn: "84182100", gstRate: 18, purchasePrice: 21500, sellingPrice: 26490, mrp: 31990, currentStock: 9, reorderLevel: 3, warehouse: "Bengaluru Store", status: "active" },
    { name: "Realme 12 Pro+ 5G 256GB", code: "ITM-0014", category: "Smartphones & Feature Phones", brand: "Realme", unit: "PCS", hsn: "85171300", gstRate: 18, purchasePrice: 24500, sellingPrice: 29999, mrp: 33999, currentStock: 40, reorderLevel: 10, warehouse: "Main Store - Mumbai", status: "active" },
    { name: "Anker 10000mAh Magnetic Power Bank", code: "ITM-0015", category: "Mobile Accessories", brand: "Apple", unit: "PCS", hsn: "85044090", gstRate: 18, purchasePrice: 2800, sellingPrice: 3999, mrp: 4999, currentStock: 50, reorderLevel: 15, warehouse: "Pune Branch", status: "active" },
  ];

  // Generate more mobile & electronics items
  const extraNames = [
    "Vivo V30 Pro 5G 256GB", "Xiaomi 14 Ultra 512GB", "Noise ColorFit Pulse 3 Smartwatch",
    "Dell XPS 13 Core i7 16GB/1TB", "HP LaserJet Pro Wireless Printer", "Asus ROG Strix Gaming Monitor 27\"",
    "Samsung Galaxy Tab S9 Ultra", "boAt Stone 1200 Bluetooth Speaker", "Sony WH-1000XM5 Wireless Headphones",
    "Tempered Glass Screen Protector 9H", "Silicone Protective Phone Case", "Braided Type-C Fast Charging Cable 2m",
    "Mi Smart Wi-Fi Security Camera 360", "SanDisk 128GB MicroSDXC Card Class 10", "Logitech K380 Multi-Device Bluetooth Keyboard",
  ];

  for (let i = 0; i < extraNames.length; i++) {
    items.push({
      name: extraNames[i],
      code: `ITM-${String(i + 16).padStart(4, "0")}`,
      category: CATEGORIES[i % CATEGORIES.length],
      brand: BRANDS[i % BRANDS.length],
      unit: "PCS",
      hsn: "84716090",
      gstRate: [5, 12, 18][i % 3],
      purchasePrice: Math.round((800 + ((i * 37) % 100) / 100 * 15000) / 10) * 10,
      sellingPrice: Math.round((1500 + ((i * 41) % 100) / 100 * 30000) / 10) * 10,
      mrp: Math.round((2000 + ((i * 43) % 100) / 100 * 35000) / 10) * 10,
      currentStock: Math.floor(((i * 47) % 100) / 100 * 300),
      reorderLevel: Math.floor(((i * 53) % 100) / 100 * 30) + 5,
      warehouse: WAREHOUSES[i % WAREHOUSES.length],
      status: ((i * 59) % 100) > 10 ? "active" : "inactive",
    });
  }

  return items;
}

const ALL_ITEMS = generateItems();

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
  const [items, setItems] = useState(ALL_ITEMS);
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<typeof ALL_ITEMS[0] | null>(null);
  const [deletingCode, setDeletingCode] = useState<string | null>(null);
  const [formData, setFormData] = useState<ItemFormData>(EMPTY_FORM);
  const [page, setPage] = useState(1);
  const PER_PAGE = 10;

  const filtered = useMemo(() => {
    return items.filter((item) => {
      const matchSearch = !search || 
        item.name.toLowerCase().includes(search.toLowerCase()) ||
        item.code.toLowerCase().includes(search.toLowerCase()) ||
        item.brand.toLowerCase().includes(search.toLowerCase());
      const matchCategory = categoryFilter === "all" || item.category === categoryFilter;
      const matchStatus = statusFilter === "all" || item.status === statusFilter;
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

  const openEdit = (item: typeof ALL_ITEMS[0]) => {
    setEditingItem(item);
    setFormData({
      name: item.name, code: item.code, category: item.category, brand: item.brand,
      unit: item.unit, hsn: item.hsn, gstRate: String(item.gstRate),
      purchasePrice: String(item.purchasePrice), sellingPrice: String(item.sellingPrice),
      mrp: String(item.mrp), currentStock: String(item.currentStock),
      reorderLevel: String(item.reorderLevel), warehouse: item.warehouse, status: item.status,
    });
    setIsFormOpen(true);
  };

  const handleSave = () => {
    if (!formData.name || !formData.sellingPrice) {
      toast.error("Please fill all required fields");
      return;
    }
    if (editingItem) {
      setItems((prev) => prev.map((i) =>
        i.code === editingItem.code ? { ...i, ...formData, gstRate: Number(formData.gstRate), purchasePrice: Number(formData.purchasePrice), sellingPrice: Number(formData.sellingPrice), mrp: Number(formData.mrp), currentStock: Number(formData.currentStock), reorderLevel: Number(formData.reorderLevel) } : i
      ));
      toast.success("Item updated successfully");
    } else {
      setItems((prev) => [...prev, { ...formData, gstRate: Number(formData.gstRate), purchasePrice: Number(formData.purchasePrice), sellingPrice: Number(formData.sellingPrice), mrp: Number(formData.mrp), currentStock: Number(formData.currentStock), reorderLevel: Number(formData.reorderLevel) }]);
      toast.success("Item added successfully");
    }
    setIsFormOpen(false);
  };

  const confirmDelete = (code: string) => {
    setDeletingCode(code);
    setIsDeleteOpen(true);
  };

  const handleDelete = () => {
    setItems((prev) => prev.filter((i) => i.code !== deletingCode));
    toast.success("Item deleted");
    setIsDeleteOpen(false);
    setDeletingCode(null);
  };

  const handleBulkDelete = () => {
    setItems((prev) => prev.filter((i) => !selectedIds.includes(i.code)));
    toast.success(`${selectedIds.length} items deleted`);
    setSelectedIds([]);
  };

  const getStockStatus = (item: typeof ALL_ITEMS[0]) => {
    if (item.currentStock === 0) return { label: "Out of Stock", variant: "destructive" as const };
    if (item.currentStock <= item.reorderLevel) return { label: "Low Stock", variant: "warning" as const };
    return { label: "In Stock", variant: "success" as const };
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
              {CATEGORIES.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
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
              {paginated.length === 0 ? (
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
                  return (
                    <tr key={item.code} className={`hover:bg-slate-50/70 transition-colors ${isSelected ? "bg-blue-50/50" : ""}`}>
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
                        <p className="text-sm font-mono">{item.hsn}</p>
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
                            <DropdownMenuItem onClick={() => toast.info(`Viewing ${item.name}`)}>
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
                      {CATEGORIES.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold text-slate-700">Brand *</Label>
                  <Select value={formData.brand} onValueChange={(v) => setFormData((f) => ({ ...f, brand: v }))}>
                    <SelectTrigger className="bg-slate-50 border-slate-300"><SelectValue placeholder="Select brand" /></SelectTrigger>
                    <SelectContent>
                      {BRANDS.map((b) => <SelectItem key={b} value={b}>{b}</SelectItem>)}
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
            <Button onClick={handleSave} className="bg-[#3F63AD] hover:bg-[#2E4F95] text-white px-6 font-bold shadow-lg shadow-[#3F63AD]/20">
              {editingItem ? "Update Catalog Item" : "Save & Add to Catalog"}
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
            <Button variant="outline" onClick={() => setIsDeleteOpen(false)}>Cancel</Button>
            <Button variant="destructive" onClick={handleDelete}>Delete</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </PageShell>
  );
}
