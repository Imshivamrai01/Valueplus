"use client";
import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { PageShell } from "@/components/shared/page-shell";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  ChevronRight, Search, Package, Tag, Award,
  ArrowLeft, TrendingUp, Box, IndianRupee
} from "lucide-react";
import { formatCurrency } from "@/lib/utils";
import { cn } from "@/lib/utils";
import { MetricCardsShimmer, TableShimmer, Skeleton } from "@/components/shared/shimmer-skeleton";

// Brand color palette
const BRAND_COLORS: Record<string, { bg: string; text: string; border: string }> = {
  Apple:    { bg: "bg-slate-900",   text: "text-white",      border: "border-slate-700"    },
  Samsung:  { bg: "bg-blue-600",    text: "text-white",      border: "border-blue-500"     },
  OnePlus:  { bg: "bg-red-600",     text: "text-white",      border: "border-red-500"      },
  Xiaomi:   { bg: "bg-orange-500",  text: "text-white",      border: "border-orange-400"   },
  Realme:   { bg: "bg-yellow-500",  text: "text-slate-900",  border: "border-yellow-400"   },
  Vivo:     { bg: "bg-sky-500",     text: "text-white",      border: "border-sky-400"      },
  Oppo:     { bg: "bg-green-600",   text: "text-white",      border: "border-green-500"    },
  Sony:     { bg: "bg-black",       text: "text-white",      border: "border-slate-600"    },
  LG:       { bg: "bg-rose-600",    text: "text-white",      border: "border-rose-500"     },
  Dell:     { bg: "bg-blue-800",    text: "text-white",      border: "border-blue-700"     },
  HP:       { bg: "bg-blue-500",    text: "text-white",      border: "border-blue-400"     },
  Lenovo:   { bg: "bg-red-800",     text: "text-white",      border: "border-red-700"      },
  Asus:     { bg: "bg-indigo-600",  text: "text-white",      border: "border-indigo-500"   },
  boAt:     { bg: "bg-violet-600",  text: "text-white",      border: "border-violet-500"   },
  JBL:      { bg: "bg-orange-600",  text: "text-white",      border: "border-orange-500"   },
  Noise:    { bg: "bg-cyan-600",    text: "text-white",      border: "border-cyan-500"     },
  Daikin:   { bg: "bg-teal-600",    text: "text-white",      border: "border-teal-500"     },
  Voltas:   { bg: "bg-blue-700",    text: "text-white",      border: "border-blue-600"     },
  Whirlpool:{ bg: "bg-slate-600",   text: "text-white",      border: "border-slate-500"    },
  Haier:    { bg: "bg-sky-700",     text: "text-white",      border: "border-sky-600"      },
};

function getBrandColor(name: string) {
  return BRAND_COLORS[name] || { bg: "bg-[#3F63AD]", text: "text-white", border: "border-[#3F63AD]" };
}

function BrandInitial({ name }: { name: string }) {
  const color = getBrandColor(name);
  const initials = name.slice(0, 2).toUpperCase();
  return (
    <div className={cn("w-14 h-14 rounded-2xl flex items-center justify-center text-lg font-black tracking-tight shadow-lg flex-shrink-0", color.bg, color.text)}>
      {initials}
    </div>
  );
}

export default function BrandsPage() {
  const [selectedBrand, setSelectedBrand] = useState<string | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [search, setSearch] = useState("");

  // ── Fetch all brands ────────────────────────────────────────────
  const { data: brands = [], isLoading: loadingBrands } = useQuery({
    queryKey: ["brands"],
    queryFn: async () => {
      const res = await fetch("/api/brands");
      const json = await res.json();
      if (!json.success) throw new Error(json.error);
      return json.data;
    },
  });

  // ── Fetch items for selected brand ──────────────────────────────
  const { data: brandItems = [], isLoading: loadingBrandItems } = useQuery({
    queryKey: ["items", "brand", selectedBrand],
    queryFn: async () => {
      const res = await fetch(`/api/items?brand=${encodeURIComponent(selectedBrand!)}`);
      const json = await res.json();
      if (!json.success) throw new Error(json.error);
      return json.data;
    },
    enabled: !!selectedBrand,
  });

  // ── Compute categories for selected brand ───────────────────────
  const brandCategories = useMemo(() => {
    if (!Array.isArray(brandItems) || !brandItems.length) return [];
    const catMap: Record<string, { count: number; totalStock: number; avgPrice: number }> = {};
    brandItems.forEach((item: any) => {
      const cat = item.category || "Uncategorized";
      if (!catMap[cat]) catMap[cat] = { count: 0, totalStock: 0, avgPrice: 0 };
      catMap[cat].count += 1;
      catMap[cat].totalStock += item.currentStock || 0;
      catMap[cat].avgPrice += item.sellingPrice || 0;
    });
    return Object.entries(catMap).map(([name, data]) => ({
      name,
      count: data.count,
      totalStock: data.totalStock,
      avgPrice: Math.round(data.avgPrice / data.count),
    })).sort((a, b) => b.count - a.count);
  }, [brandItems]);

  // ── Items for selected brand + category ─────────────────────────
  const categoryItems = useMemo(() => {
    if (!selectedCategory || !Array.isArray(brandItems)) return [];
    return brandItems.filter((item: any) => item.category === selectedCategory);
  }, [brandItems, selectedCategory]);

  // ── Filtered data based on search ───────────────────────────────
  const filteredBrands = useMemo(() => {
    if (!search) return brands;
    return brands.filter((b: any) =>
      b.name.toLowerCase().includes(search.toLowerCase()) ||
      (b.description && b.description.toLowerCase().includes(search.toLowerCase()))
    );
  }, [brands, search]);

  const filteredCategories = useMemo(() => {
    if (!search) return brandCategories;
    return brandCategories.filter((c) => c.name.toLowerCase().includes(search.toLowerCase()));
  }, [brandCategories, search]);

  const filteredItems = useMemo(() => {
    if (!search) return categoryItems;
    return categoryItems.filter((item: any) =>
      item.name.toLowerCase().includes(search.toLowerCase()) ||
      item.code?.toLowerCase().includes(search.toLowerCase())
    );
  }, [categoryItems, search]);

  // ── Stats for brands ────────────────────────────────────────────
  const brandItemCounts = useMemo(() => {
    // We don't fetch all items upfront; show items count from brand.items (if available)
    const map: Record<string, number> = {};
    brands.forEach((b: any) => {
      map[b.name] = b.items || 0;
    });
    return map;
  }, [brands]);

  // ── Navigation ──────────────────────────────────────────────────
  const handleBrandClick = (brandName: string) => {
    setSelectedBrand(brandName);
    setSelectedCategory(null);
    setSearch("");
  };

  const handleCategoryClick = (catName: string) => {
    setSelectedCategory(catName);
    setSearch("");
  };

  const handleBack = () => {
    if (selectedCategory) {
      setSelectedCategory(null);
      setSearch("");
    } else if (selectedBrand) {
      setSelectedBrand(null);
      setSearch("");
    }
  };

  // ── Breadcrumbs ─────────────────────────────────────────────────
  const breadcrumbs = [
    { label: "Masters", href: "/masters/items" },
    { label: "Brands" },
  ];

  // ── Level detection ─────────────────────────────────────────────
  const level = selectedCategory ? "items" : selectedBrand ? "categories" : "brands";

  // ── Page title & subtitle ───────────────────────────────────────
  const pageTitle = level === "items"
    ? `${selectedBrand} — ${selectedCategory}`
    : level === "categories"
    ? `${selectedBrand}`
    : "Brands";

  const pageSubtitle = level === "items"
    ? `${filteredItems.length} products`
    : level === "categories"
    ? `${brandCategories.length} product categories`
    : "Click a brand to explore categories & products";

  return (
    <PageShell
      title={pageTitle}
      subtitle={pageSubtitle}
      breadcrumbs={breadcrumbs}
      actions={
        selectedBrand ? (
          <Button variant="outline" size="sm" onClick={handleBack} className="gap-2">
            <ArrowLeft className="w-4 h-4" />
            {selectedCategory ? `Back to ${selectedBrand}` : "All Brands"}
          </Button>
        ) : undefined
      }
    >
      {/* ── Breadcrumb trail ─────────────────────────────────── */}
      {(selectedBrand || selectedCategory) && (
        <nav className="flex items-center gap-1.5 text-sm text-muted-foreground -mt-4 mb-2">
          <button onClick={() => { setSelectedBrand(null); setSelectedCategory(null); setSearch(""); }} className="hover:text-[#3F63AD] transition-colors font-medium">
            All Brands
          </button>
          {selectedBrand && (
            <>
              <ChevronRight className="w-3.5 h-3.5" />
              <button
                onClick={() => { setSelectedCategory(null); setSearch(""); }}
                className={cn("hover:text-[#3F63AD] transition-colors font-medium", !selectedCategory && "text-foreground")}
              >
                {selectedBrand}
              </button>
            </>
          )}
          {selectedCategory && (
            <>
              <ChevronRight className="w-3.5 h-3.5" />
              <span className="text-foreground font-medium">{selectedCategory}</span>
            </>
          )}
        </nav>
      )}

      {/* ── Stats row ─────────────────────────────────────────── */}
      {level === "brands" && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            { label: "Total Brands", value: brands.length, icon: Award },
            { label: "Active Brands", value: brands.filter((b: any) => b.status === "active").length, icon: TrendingUp },
            { label: "Total Products", value: brands.reduce((a: number, b: any) => a + (b.items || 0), 0), icon: Package },
            { label: "Categories", value: 10, icon: Tag },
          ].map((s) => (
            <div key={s.label} className="metric-card">
              <s.icon className="w-5 h-5 text-[#3F63AD] mb-2" />
              <p className="text-2xl font-bold">{s.value}</p>
              <p className="text-xs text-muted-foreground mt-1">{s.label}</p>
            </div>
          ))}
        </div>
      )}

      {level === "categories" && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            { label: "Categories", value: brandCategories.length },
            { label: "Total Products", value: brandItems.length },
            { label: "Total Stock", value: brandItems.reduce((a: number, i: any) => a + (i.currentStock || 0), 0) },
            { label: "Avg Price", value: formatCurrency(brandItems.length ? brandItems.reduce((a: number, i: any) => a + (i.sellingPrice || 0), 0) / brandItems.length : 0) },
          ].map((s) => (
            <div key={s.label} className="metric-card">
              <p className="text-2xl font-bold">{s.value}</p>
              <p className="text-xs text-muted-foreground mt-1">{s.label}</p>
            </div>
          ))}
        </div>
      )}

      {level === "items" && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            { label: "Total Products", value: categoryItems.length },
            { label: "In Stock", value: categoryItems.filter((i: any) => (i.currentStock || 0) > 0).length },
            { label: "Total Stock", value: categoryItems.reduce((a: number, i: any) => a + (i.currentStock || 0), 0) },
            { label: "Avg Price", value: formatCurrency(categoryItems.length ? categoryItems.reduce((a: number, i: any) => a + (i.sellingPrice || 0), 0) / categoryItems.length : 0) },
          ].map((s) => (
            <div key={s.label} className="metric-card">
              <p className="text-2xl font-bold">{s.value}</p>
              <p className="text-xs text-muted-foreground mt-1">{s.label}</p>
            </div>
          ))}
        </div>
      )}

      {/* ── Search bar ────────────────────────────────────────── */}
      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input
          placeholder={
            level === "brands" ? "Search brands..." :
            level === "categories" ? "Search categories..." :
            "Search products..."
          }
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-9"
        />
      </div>

      {/* ════════════════════════════════════════════════════════ */}
      {/* LEVEL 1: BRANDS GRID                                   */}
      {/* ════════════════════════════════════════════════════════ */}
      {level === "brands" && (
        <div>
          {loadingBrands ? (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {Array.from({ length: 8 }).map((_, i) => (
                <div key={i} className="metric-card animate-pulse h-36 bg-slate-100" />
              ))}
            </div>
          ) : filteredBrands.length === 0 ? (
            <div className="data-table-container p-12 text-center text-muted-foreground">
              No brands found
            </div>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {filteredBrands.map((brand: any) => {
                const color = getBrandColor(brand.name);
                return (
                  <button
                    key={brand._id || brand.id}
                    onClick={() => handleBrandClick(brand.name)}
                    className="metric-card text-left group hover:scale-[1.02] transition-all duration-200 cursor-pointer focus:outline-none focus:ring-2 focus:ring-[#3F63AD] focus:ring-offset-2"
                  >
                    <div className="flex items-start gap-3 mb-4">
                      <BrandInitial name={brand.name} />
                      <div className="flex-1 min-w-0">
                        <p className="font-bold text-foreground text-base leading-tight truncate">{brand.name}</p>
                        <Badge variant={brand.status === "active" ? "success" : "secondary"} className="mt-1">
                          {brand.status}
                        </Badge>
                      </div>
                    </div>
                    <p className="text-xs text-muted-foreground line-clamp-2 mb-3 leading-relaxed">
                      {brand.description}
                    </p>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1 text-xs text-muted-foreground font-medium">
                        <Package className="w-3.5 h-3.5" />
                        <span>{brand.items || 0} items</span>
                      </div>
                      <span className={cn("text-xs font-bold px-2.5 py-1 rounded-full flex items-center gap-1 group-hover:gap-2 transition-all", color.bg, color.text)}>
                        View <ChevronRight className="w-3 h-3" />
                      </span>
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ════════════════════════════════════════════════════════ */}
      {/* LEVEL 2: CATEGORIES for selected brand                 */}
      {/* ════════════════════════════════════════════════════════ */}
      {level === "categories" && (
        <div>
          {loadingBrandItems ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="metric-card animate-pulse h-32 bg-slate-100" />
              ))}
            </div>
          ) : filteredCategories.length === 0 ? (
            <div className="data-table-container p-12 text-center text-muted-foreground">
              No categories found for {selectedBrand}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredCategories.map((cat) => {
                const color = getBrandColor(selectedBrand!);
                return (
                  <button
                    key={cat.name}
                    onClick={() => handleCategoryClick(cat.name)}
                    className="metric-card text-left group hover:scale-[1.01] transition-all duration-200 cursor-pointer focus:outline-none focus:ring-2 focus:ring-[#3F63AD] focus:ring-offset-2"
                  >
                    <div className="flex items-center gap-4 mb-3">
                      <div className={cn("w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0", color.bg)}>
                        <Tag className={cn("w-5 h-5", color.text)} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-bold text-foreground text-base">{cat.name}</p>
                        <p className="text-xs text-muted-foreground">{selectedBrand}</p>
                      </div>
                      <ChevronRight className="w-5 h-5 text-muted-foreground group-hover:text-[#3F63AD] group-hover:translate-x-0.5 transition-all" />
                    </div>
                    <div className="grid grid-cols-3 gap-2 pt-2 border-t border-slate-100">
                      <div>
                        <p className="text-lg font-bold text-foreground">{cat.count}</p>
                        <p className="text-[10px] text-muted-foreground uppercase tracking-wide font-medium">Products</p>
                      </div>
                      <div>
                        <p className="text-lg font-bold text-foreground">{cat.totalStock}</p>
                        <p className="text-[10px] text-muted-foreground uppercase tracking-wide font-medium">In Stock</p>
                      </div>
                      <div>
                        <p className="text-sm font-bold text-foreground">{formatCurrency(cat.avgPrice)}</p>
                        <p className="text-[10px] text-muted-foreground uppercase tracking-wide font-medium">Avg Price</p>
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ════════════════════════════════════════════════════════ */}
      {/* LEVEL 3: ITEMS for selected brand + category           */}
      {/* ════════════════════════════════════════════════════════ */}
      {level === "items" && (
        <div className="data-table-container">
          <div className="flex items-center justify-between px-4 py-3 border-b">
            <div className="flex items-center gap-2">
              <Box className="w-4 h-4 text-[#3F63AD]" />
              <span className="font-semibold text-sm text-foreground">{selectedBrand} — {selectedCategory}</span>
            </div>
            <span className="text-sm text-muted-foreground font-medium">
              {filteredItems.length} products
            </span>
          </div>

          {loadingBrandItems ? (
            <TableShimmer rows={6} cols={8} />
          ) : filteredItems.length === 0 ? (
            <div className="p-12 text-center text-muted-foreground">No products found</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-slate-50/70">
                    <th className="text-left px-4 py-3 font-semibold text-slate-600 text-xs uppercase tracking-wider">Product</th>
                    <th className="text-left px-4 py-3 font-semibold text-slate-600 text-xs uppercase tracking-wider hidden md:table-cell">Code</th>
                    <th className="text-left px-4 py-3 font-semibold text-slate-600 text-xs uppercase tracking-wider hidden lg:table-cell">HSN</th>
                    <th className="text-right px-4 py-3 font-semibold text-slate-600 text-xs uppercase tracking-wider">MRP</th>
                    <th className="text-right px-4 py-3 font-semibold text-slate-600 text-xs uppercase tracking-wider">Price</th>
                    <th className="text-center px-4 py-3 font-semibold text-slate-600 text-xs uppercase tracking-wider hidden sm:table-cell">Stock</th>
                    <th className="text-center px-4 py-3 font-semibold text-slate-600 text-xs uppercase tracking-wider">GST</th>
                    <th className="text-center px-4 py-3 font-semibold text-slate-600 text-xs uppercase tracking-wider">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {filteredItems.map((item: any) => (
                    <tr
                      key={item._id || item.code}
                      className="hover:bg-slate-50/80 transition-colors"
                    >
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          <div className={cn("w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 text-xs font-bold", getBrandColor(item.brand).bg, getBrandColor(item.brand).text)}>
                            {item.brand?.slice(0, 2).toUpperCase()}
                          </div>
                          <div>
                            <p className="font-semibold text-foreground text-sm leading-tight line-clamp-1">{item.name}</p>
                            <p className="text-xs text-muted-foreground">{item.brand}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3 hidden md:table-cell">
                        <span className="font-mono text-xs bg-slate-100 px-2 py-1 rounded-md text-slate-600">{item.code}</span>
                      </td>
                      <td className="px-4 py-3 hidden lg:table-cell">
                        <span className="text-xs text-muted-foreground">{item.hsnCode}</span>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <span className="text-xs text-muted-foreground line-through">{formatCurrency(item.mrp)}</span>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <span className="font-bold text-sm text-foreground">{formatCurrency(item.sellingPrice)}</span>
                      </td>
                      <td className="px-4 py-3 text-center hidden sm:table-cell">
                        <span className={cn("text-sm font-bold", (item.currentStock || 0) <= (item.reorderLevel || 0) ? "text-red-500" : "text-emerald-600")}>
                          {item.currentStock || 0}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-center">
                        <Badge variant="info" className="text-xs">{item.gstRate}%</Badge>
                      </td>
                      <td className="px-4 py-3 text-center">
                        <Badge variant={item.status === "active" ? "success" : "secondary"} className="text-xs">
                          {item.status === "active" ? "Active" : "Inactive"}
                        </Badge>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </PageShell>
  );
}
