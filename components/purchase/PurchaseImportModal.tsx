"use client";

import { useEffect, useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { BrandSelect } from "@/components/shared/brand-select";
import {
  UploadCloud,
  FileSpreadsheet,
  FileText,
  Trash2,
  AlertTriangle,
  CheckCircle2,
  Sparkles,
  X,
} from "lucide-react";
import { toast } from "sonner";
import { formatCurrency, cn } from "@/lib/utils";
import { findMatchingItem } from "@/lib/purchase-import/match-item";

/**
 * Upload an Excel sheet or a text-based PDF, review what was found, then hand
 * the reviewed rows to PurchaseCreationModal for the actual save.
 *
 * This modal never writes a purchase entry itself — parsing (server) and
 * matching (here, live) only produce a list of rows the admin has looked at
 * and confirmed. Any row whose name is edited here is re-matched against the
 * live product catalog on every keystroke, using the same matching function
 * the server used at parse time, so fixing a misread name to match an
 * existing product re-links it without a separate "search and relink" UI —
 * and once handed off, every row is still fully editable inside
 * PurchaseCreationModal's own product search, the same as manual entry.
 */

interface PreviewRow {
  key: string;
  sourceRow: number;
  name: string;
  quantity: number;
  rate: number;
  gstRate: number;
  lowConfidence: boolean;
  matchedItem: any | null;
  serialNumbers?: string[];
  /** The HSN code resolveRows found on the invoice itself — used as the real
   *  code for a new product instead of a generic placeholder, and carried
   *  onto the purchase entry line even when matched to an existing item. */
  hsn?: string;
  /** Only meaningful for a "New item" row — a matched row always keeps the
   *  catalog item's own category/brand, shown read-only. Empty string means
   *  "use the blanket default below", so a single-category invoice still
   *  needs just one selection while a mixed one can override per row. */
  category?: string;
  brand?: string;
  /** True when category/brand above came from the Stock Reference table
   *  (Masters > Items > Import Stock Reference) by VP code, not a guess —
   *  shown so the admin knows it's vetted data, still fully editable. */
  fromReference?: boolean;
}

export function PurchaseImportModal({
  open,
  onOpenChange,
  onResolved,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Items ready for PurchaseCreationModal's `preloadedItems` prop, plus
   *  whatever supplier name/phone/GSTIN was read off the invoice's own
   *  letterhead (PDF only — undefined for an Excel/CSV upload). */
  onResolved: (items: any[], supplier?: { name?: string; phone?: string; gstin?: string }) => void;
}) {
  const queryClient = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [rows, setRows] = useState<PreviewRow[]>([]);
  const [meta, setMeta] = useState<{
    sourceType: "excel" | "pdf";
    usedTableExtraction: boolean;
  } | null>(null);
  const [defaultCategory, setDefaultCategory] = useState("");
  const [defaultBrand, setDefaultBrand] = useState("");
  const [supplier, setSupplier] = useState<{ name?: string; phone?: string; gstin?: string } | undefined>(undefined);

  const { data: categories = [] } = useQuery({
    queryKey: ["categories"],
    queryFn: async () => {
      const res = await fetch("/api/categories");
      const json = await res.json();
      return json.success ? json.data : [];
    },
    enabled: open,
  });

  const { data: allItems = [] } = useQuery({
    queryKey: ["items"],
    queryFn: async () => {
      const res = await fetch("/api/items");
      const json = await res.json();
      return json.success ? json.data : [];
    },
    enabled: open,
  });

  useEffect(() => {
    if (!open) {
      setRows([]);
      setMeta(null);
      setDefaultCategory("");
      setDefaultBrand("");
      setSupplier(undefined);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  }, [open]);

  const parseMutation = useMutation({
    mutationFn: async (file: File) => {
      const form = new FormData();
      form.append("file", file);
      const res = await fetch("/api/purchase-entries/import", { method: "POST", body: form });
      const contentType = res.headers.get("content-type") || "";
      if (!contentType.includes("application/json")) {
        throw new Error(
          res.status === 413
            ? "This file is too large for the server to accept."
            : `The server hit an unexpected error (status ${res.status}). Try again, or use a smaller/simpler file.`
        );
      }
      const json = await res.json();
      if (!json.success) throw new Error(json.error || "Could not read this file");
      return json.data;
    },
    onSuccess: (data) => {
      setMeta(data.meta);
      setSupplier(data.supplier);
      setRows(
        data.rows.map((r: any, i: number) => ({
          key: `${r.sourceRow}-${i}`,
          sourceRow: r.sourceRow,
          name: r.name,
          quantity: r.quantity,
          rate: r.rate,
          gstRate: r.gstRate,
          lowConfidence: r.lowConfidence,
          matchedItem: r.matchedItem,
          serialNumbers: r.serialNumbers,
          hsn: r.hsn,
          category: r.referenceMatch?.category || "",
          brand: r.referenceMatch?.brand || "",
          fromReference: Boolean(r.referenceMatch),
        }))
      );
      const referenceCount = data.rows.filter((r: any) => r.referenceMatch).length;
      toast.success(
        `Found ${data.rows.length} row(s) — review before adding` +
          (referenceCount > 0 ? ` (${referenceCount} auto-filled from stock reference)` : "")
      );
    },
    onError: (e: any) => toast.error(e.message),
  });

  const handleFilePick = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setRows([]);
    setMeta(null);
    parseMutation.mutate(file);
  };

  const updateRow = (key: string, patch: Partial<PreviewRow>) => {
    setRows((prev) =>
      prev.map((r) => {
        if (r.key !== key) return r;
        const next = { ...r, ...patch };
        // Re-match live whenever the name changes, using the same function
        // the server used, so correcting a misread name to an existing
        // product's name re-links it without any extra step.
        if (patch.name !== undefined) {
          next.matchedItem = findMatchingItem(next.name, allItems);
        }
        return next;
      })
    );
  };

  const removeRow = (key: string) => setRows((prev) => prev.filter((r) => r.key !== key));

  const matchedCount = rows.filter((r) => r.matchedItem).length;
  const newCount = rows.length - matchedCount;

  const resolveMutation = useMutation({
    mutationFn: async () => {
      if (rows.length === 0) throw new Error("No rows to add");
      // Each new row can carry its own category (for a mixed-category
      // invoice); the blanket picker only needs to cover whichever rows
      // didn't get one of their own.
      const uncategorised = rows.filter((r) => !r.matchedItem && !(r.category || defaultCategory));
      if (uncategorised.length > 0) {
        throw new Error(
          `Pick a category for "${uncategorised[0].name}"${uncategorised.length > 1 ? ` and ${uncategorised.length - 1} other new row(s)` : ""} — either per-row or via the default above.`
        );
      }

      const resolved: any[] = [];

      for (const row of rows) {
        if (row.matchedItem) {
          resolved.push({
            code: row.matchedItem.code,
            vpCode: row.matchedItem.vpCode,
            _id: row.matchedItem._id,
            name: row.matchedItem.name,
            purchasePrice: row.rate,
            gstRate: row.gstRate || row.matchedItem.gstRate || 18,
            orderQty: row.quantity,
            serialNumbers: row.serialNumbers,
          });
          continue;
        }

        // New product — created through the same endpoint Masters > Items
        // uses, so it shows up there exactly like any manually added item.
        const res = await fetch("/api/items", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            code: `ITM-${Date.now().toString().slice(-8)}-${resolved.length}`,
            name: row.name,
            category: row.category || defaultCategory,
            brand: row.brand || defaultBrand || "Unbranded",
            unit: "PCS",
            // The invoice itself already told us this product's real HSN —
            // "8528" (a generic electronics fallback) only applies when the
            // sheet genuinely had no HSN column to read one from.
            hsnCode: row.hsn || "8528",
            gstRate: row.gstRate || 18,
            purchasePrice: row.rate,
            sellingPrice: Math.round(row.rate * 1.25),
            mrp: Math.round(row.rate * 1.3),
            openingStock: 0,
            currentStock: 0,
            status: "active",
          }),
        });
        const json = await res.json();
        if (!json.success) {
          throw new Error(`Could not create "${row.name}": ${json.error}`);
        }
        resolved.push({
          code: json.data.code,
          vpCode: json.data.vpCode,
          _id: json.data._id,
          name: json.data.name,
          purchasePrice: row.rate,
          gstRate: row.gstRate,
          orderQty: row.quantity,
          serialNumbers: row.serialNumbers,
        });
      }

      return resolved;
    },
    onSuccess: (resolved) => {
      queryClient.invalidateQueries({ queryKey: ["items"] });
      toast.success(`${resolved.length} row(s) ready — opening the purchase entry`);
      onResolved(resolved, supplier);
    },
    onError: (e: any) => toast.error(e.message),
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl p-0 rounded-2xl border-none shadow-2xl overflow-hidden max-h-[90vh] flex flex-col">
        <div className="bg-gradient-to-r from-[#1B2537] via-[#2C3E5A] to-[#1B2537] text-white p-5 flex items-center gap-3 shrink-0">
          <div className="w-11 h-11 rounded-xl bg-white/10 flex items-center justify-center border border-white/20">
            <UploadCloud className="w-5 h-5 text-[#76C043]" />
          </div>
          <div>
            <h3 className="text-lg font-bold tracking-tight">Import Purchase Sheet</h3>
            <p className="text-xs text-slate-300 mt-0.5">
              Excel (.xlsx, .csv) or a text-based PDF invoice — review every row before it's added
            </p>
          </div>
        </div>

        <div className="p-5 space-y-4 bg-slate-50/50 overflow-y-auto flex-1">
          {rows.length === 0 ? (
            <div className="border-2 border-dashed border-slate-300 rounded-xl p-10 text-center bg-white">
              {parseMutation.isPending ? (
                <div className="flex flex-col items-center gap-3">
                  <div className="w-8 h-8 border-3 border-[#30539C] border-t-transparent rounded-full animate-spin" />
                  <p className="text-sm font-semibold text-slate-600">Reading the file…</p>
                </div>
              ) : (
                <>
                  <div className="flex items-center justify-center gap-3 mb-3">
                    <FileSpreadsheet className="w-8 h-8 text-emerald-500" />
                    <FileText className="w-8 h-8 text-red-500" />
                  </div>
                  <p className="text-sm font-semibold text-slate-700">
                    Choose an Excel sheet or a PDF invoice
                  </p>
                  <p className="text-xs text-slate-400 mt-1 max-w-md mx-auto">
                    Scanned or photographed PDFs aren't supported — only ones with real, selectable
                    text. Every row is shown for review below before anything is saved.
                  </p>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".xlsx,.xls,.csv,.pdf"
                    className="hidden"
                    onChange={handleFilePick}
                  />
                  <Button className="mt-4" onClick={() => fileInputRef.current?.click()}>
                    <UploadCloud className="w-4 h-4 mr-1.5" /> Choose File
                  </Button>
                </>
              )}
            </div>
          ) : (
            <>
              <div className="flex flex-wrap items-center gap-2">
                <Badge variant="secondary" className="text-xs">
                  {meta?.sourceType === "pdf" ? "PDF" : "Excel"}
                </Badge>
                {meta?.sourceType === "pdf" && !meta.usedTableExtraction && (
                  <Badge variant="warning" className="text-[10px]">
                    No table structure found — read from plain text, double-check every row
                  </Badge>
                )}
                <Badge className="bg-emerald-50 text-emerald-700 border-emerald-200 text-xs">
                  {matchedCount} matched to existing products
                </Badge>
                <Badge className="bg-amber-50 text-amber-700 border-amber-200 text-xs">
                  {newCount} will be created new
                </Badge>
                {meta?.sourceType === "pdf" && (
                  supplier?.name || supplier?.phone ? (
                    <Badge className="bg-blue-50 text-blue-700 border-blue-200 text-xs">
                      Supplier: {supplier.name || "Name not found"}{supplier.phone ? ` • ${supplier.phone}` : ""}
                    </Badge>
                  ) : (
                    <Badge variant="warning" className="text-[10px]">
                      Supplier not detected on this invoice — enter it in the next step
                    </Badge>
                  )
                )}
                <div className="flex-1" />
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setRows([]);
                    setMeta(null);
                    if (fileInputRef.current) fileInputRef.current.value = "";
                  }}
                >
                  <X className="w-3.5 h-3.5 mr-1.5" /> Choose a different file
                </Button>
              </div>

              {newCount > 0 && (
                <div className="bg-amber-50/60 border border-amber-200 rounded-xl p-3.5 flex flex-wrap items-end gap-3">
                  <Sparkles className="w-4 h-4 text-amber-600 shrink-0 mb-2" />
                  <div className="space-y-1.5">
                    <Label className="text-[11px] font-semibold text-amber-800">
                      Default Category for new products
                    </Label>
                    <Select value={defaultCategory} onValueChange={setDefaultCategory}>
                      <SelectTrigger className="w-[200px] bg-white h-8 text-xs">
                        <SelectValue placeholder="Select category…" />
                      </SelectTrigger>
                      <SelectContent>
                        {categories.map((c: any) => (
                          <SelectItem key={c._id || c.name} value={c.name}>
                            {c.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-[11px] font-semibold text-amber-800">
                      Default Brand for new products
                    </Label>
                    <BrandSelect
                      value={defaultBrand}
                      onValueChange={setDefaultBrand}
                      className="w-[200px] bg-white h-8 text-xs"
                      placeholder="Optional"
                    />
                  </div>
                  <p className="text-[11px] text-amber-700 max-w-xs">
                    Used for every "New Item" row below that doesn't have its own Category/Brand
                    picked in the table — a single-category invoice needs just this. Matched rows
                    always keep their existing product's category and brand.
                  </p>
                </div>
              )}

              <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
                <table className="w-full text-xs">
                  <thead className="bg-slate-50 border-b border-slate-200">
                    <tr className="text-[10px] uppercase tracking-wider text-slate-500 font-bold">
                      <th className="px-3 py-2.5 text-left">Product Name</th>
                      <th className="px-3 py-2.5 text-right w-20">Qty</th>
                      <th className="px-3 py-2.5 text-right w-28">Rate (₹)</th>
                      <th className="px-3 py-2.5 text-right w-20">GST %</th>
                      <th className="px-3 py-2.5 text-left w-36">Category</th>
                      <th className="px-3 py-2.5 text-left w-32">Brand</th>
                      <th className="px-3 py-2.5 text-left w-40">Status</th>
                      <th className="px-3 py-2.5 w-10" />
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {rows.map((row) => (
                      <tr
                        key={row.key}
                        className={cn(row.lowConfidence && "bg-amber-50/40")}
                      >
                        <td className="px-3 py-2">
                          <Input
                            value={row.name}
                            onChange={(e) => updateRow(row.key, { name: e.target.value })}
                            className="h-8 text-xs"
                          />
                        </td>
                        <td className="px-3 py-2">
                          <Input
                            type="number"
                            value={row.quantity}
                            onChange={(e) =>
                              updateRow(row.key, { quantity: Number(e.target.value) || 0 })
                            }
                            className="h-8 text-xs text-right"
                          />
                        </td>
                        <td className="px-3 py-2">
                          <Input
                            type="number"
                            value={row.rate}
                            onChange={(e) => updateRow(row.key, { rate: Number(e.target.value) || 0 })}
                            className={cn(
                              "h-8 text-xs text-right",
                              !(row.rate > 0) && "border-red-300 bg-red-50"
                            )}
                          />
                        </td>
                        <td className="px-3 py-2">
                          <Input
                            type="number"
                            value={row.gstRate}
                            onChange={(e) =>
                              updateRow(row.key, { gstRate: Number(e.target.value) || 0 })
                            }
                            className="h-8 text-xs text-right"
                          />
                        </td>
                        <td className="px-3 py-2">
                          {row.matchedItem ? (
                            // Matched to a real catalog item — its category is
                            // whatever that item is already filed under, not
                            // something this import can change.
                            <span className="text-slate-500 truncate block max-w-[130px]" title={row.matchedItem.category || ""}>
                              {row.matchedItem.category || "—"}
                            </span>
                          ) : (
                            <div className="space-y-0.5">
                              {row.fromReference && (
                                <span className="flex items-center gap-1 text-[9px] font-bold text-emerald-600">
                                  <CheckCircle2 className="w-2.5 h-2.5" /> Stock reference
                                </span>
                              )}
                              <Select
                                value={row.category || ""}
                                onValueChange={(v) => updateRow(row.key, { category: v, fromReference: false })}
                              >
                                <SelectTrigger
                                  className={cn(
                                    "h-8 text-xs w-full",
                                    !(row.category || defaultCategory) && "border-red-300 bg-red-50"
                                  )}
                                >
                                  <SelectValue placeholder={defaultCategory ? `Default: ${defaultCategory}` : "Pick one…"} />
                                </SelectTrigger>
                                <SelectContent>
                                  {categories.map((c: any) => (
                                    <SelectItem key={c._id || c.name} value={c.name}>
                                      {c.name}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </div>
                          )}
                        </td>
                        <td className="px-3 py-2">
                          {row.matchedItem ? (
                            <span className="text-slate-500 truncate block max-w-[110px]" title={row.matchedItem.brand || ""}>
                              {row.matchedItem.brand || "—"}
                            </span>
                          ) : (
                            <BrandSelect
                              value={row.brand || ""}
                              onValueChange={(v) => updateRow(row.key, { brand: v, fromReference: false })}
                              placeholder={defaultBrand || "Optional"}
                              className="h-8 text-xs w-full"
                            />
                          )}
                        </td>
                        <td className="px-3 py-2">
                          {row.matchedItem ? (
                            <span className="inline-flex items-center gap-1 text-emerald-700 font-semibold">
                              <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
                              <span className="truncate max-w-[140px]" title={row.matchedItem.name}>
                                {row.matchedItem.name}
                              </span>
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 text-amber-700 font-semibold">
                              <Sparkles className="w-3.5 h-3.5 shrink-0" /> New item
                            </span>
                          )}
                          {row.lowConfidence && (
                            <span className="flex items-center gap-1 text-red-500 text-[10px] mt-0.5">
                              <AlertTriangle className="w-3 h-3" /> Check this row
                            </span>
                          )}
                          {row.serialNumbers && row.serialNumbers.length > 0 && (
                            <span className="flex items-center gap-1 text-[#3F63AD] text-[10px] font-bold mt-0.5">
                              {row.serialNumbers.length} serial{row.serialNumbers.length === 1 ? "" : "s"} found
                            </span>
                          )}
                        </td>
                        <td className="px-3 py-2 text-center">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7 text-red-500 hover:bg-red-50"
                            onClick={() => removeRow(row.key)}
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </div>

        <div className="bg-white px-5 py-4 border-t border-slate-200 flex items-center justify-between gap-2 shrink-0">
          <p className="text-xs text-slate-500">
            {rows.length > 0
              ? `${rows.length} row(s) — nothing is saved until you confirm`
              : "Nothing uploaded yet"}
          </p>
          <div className="flex items-center gap-2">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button
              onClick={() => resolveMutation.mutate()}
              disabled={rows.length === 0 || resolveMutation.isPending}
            >
              {resolveMutation.isPending
                ? "Adding…"
                : `Add ${rows.length || ""} Row${rows.length === 1 ? "" : "s"} to Purchase Entry`}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
