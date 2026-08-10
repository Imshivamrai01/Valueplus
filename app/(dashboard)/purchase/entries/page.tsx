"use client";

import { PageShell } from "@/components/shared/page-shell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Plus, Search, ClipboardList, Trash2, AlertTriangle, MoreHorizontal, XCircle } from "lucide-react";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { useState, useMemo } from "react";
import { toast } from "sonner";
import { formatCurrency, formatDate } from "@/lib/utils";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { PurchaseCreationModal } from "@/components/PurchaseCreationModal";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

interface PurchaseEntryItem {
  id: string;
  billNo: string;
  supplierName: string;
  billDate: string;
  dueDate: string;
  subtotal: number;
  gst: number;
  total: number;
  paid: number;
  balance: number;
  status: "paid" | "pending" | "partial" | "overdue";
}

export default function PurchaseEntriesPage() {
  const queryClient = useQueryClient();
  const { data: entries = [], isLoading: loading } = useQuery({
    queryKey: ["purchase-entries"],
    queryFn: async () => {
      const res = await fetch("/api/purchase-entries");
      const json = await res.json();
      return json.success ? json.data : [];
    }
  });

  const { data: suppliers = [] } = useQuery({
    queryKey: ["suppliers"],
    queryFn: async () => {
      const res = await fetch("/api/suppliers");
      const json = await res.json();
      return json.success ? json.data : [];
    }
  });

  const [search, setSearch] = useState("");
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [entryToDelete, setEntryToDelete] = useState<string | null>(null);

  const deleteMutation = useMutation({
    mutationFn: async (billNo: string) => {
      const res = await fetch(`/api/purchase-entries?billNo=${encodeURIComponent(billNo)}`, { method: "DELETE" });
      const json = await res.json();
      if (!json.success) throw new Error(json.error || "Failed to delete entry");
      return json;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["purchase-entries"] });
      toast.success("Purchase entry deleted successfully");
      setEntryToDelete(null);
    },
    onError: (error: any) => {
      toast.error(error.message || "An error occurred while deleting");
    }
  });

  const filtered = useMemo(() => {
    return entries.filter(
      (e: any) =>
        !search ||
        e.billNo.toLowerCase().includes(search.toLowerCase()) ||
        e.supplierName.toLowerCase().includes(search.toLowerCase())
    );
  }, [entries, search]);

  return (
    <PageShell
      title="Purchase Entry (Supplier Bills)"
      subtitle="Record and manage supplier purchase invoices & payables"
      breadcrumbs={[{ label: "Purchase" }, { label: "Purchase Entry" }]}
      actions={
        <Button size="sm" onClick={() => setIsFormOpen(true)}>
          <Plus className="w-4 h-4 mr-1.5" /> New Purchase Entry
        </Button>
      }
    >
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[{ label: "Total Billed", value: formatCurrency(entries.reduce((a, b) => a + b.total, 0)) }, { label: "Paid to Suppliers", value: formatCurrency(entries.reduce((a, b) => a + b.paid, 0)) }, { label: "Payables Balance", value: formatCurrency(entries.reduce((a, b) => a + b.balance, 0)) }, { label: "Total Bills", value: entries.length }].map((s) => (
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
            <Input placeholder="Search Bill #, Supplier..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 border-b">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase">Supplier Bill #</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase">Supplier Name</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase">Bill Date</th>
                <th className="px-4 py-3 text-right text-xs font-semibold text-muted-foreground uppercase">Subtotal</th>
                <th className="px-4 py-3 text-right text-xs font-semibold text-muted-foreground uppercase">GST</th>
                <th className="px-4 py-3 text-right text-xs font-semibold text-muted-foreground uppercase">Total Amount</th>
                <th className="px-4 py-3 text-center text-xs font-semibold text-muted-foreground uppercase">Status</th>
                <th className="px-4 py-3 text-center text-xs font-semibold text-muted-foreground uppercase"></th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {loading ? (
                <tr>
                  <td colSpan={8} className="px-4 py-8 text-center text-muted-foreground">Loading...</td>
                </tr>
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-4 py-8 text-center text-muted-foreground">No purchase entries found</td>
                </tr>
              ) : (
                filtered.map((e) => (
                  <tr key={e._id || e.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-4 py-3 font-mono font-bold text-[#3F63AD]">{e.billNo}</td>
                    <td className="px-4 py-3 font-medium text-foreground">{e.supplierName}</td>
                    <td className="px-4 py-3 text-muted-foreground text-xs">{formatDate(e.date || e.billDate)}</td>
                    <td className="px-4 py-3 text-right">{formatCurrency(e.amount || e.subtotal)}</td>
                    <td className="px-4 py-3 text-right text-muted-foreground">{formatCurrency(e.totalTax || e.gst)}</td>
                    <td className="px-4 py-3 text-right font-semibold">{formatCurrency((e.amount || e.subtotal) + (e.totalTax || e.gst))}</td>
                    <td className="px-4 py-3 text-center">
                      <Badge variant={e.status === "paid" ? "success" : e.status === "partial" ? "info" : "warning"}>{e.status}</Badge>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-foreground">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-48">
                          <DropdownMenuItem 
                            className="gap-2 text-red-600 focus:bg-red-50 focus:text-red-700 cursor-pointer"
                            onClick={() => {
                              if(confirm(`Are you sure you want to delete bill ${e.billNo}?`)) {
                                deleteMutation.mutate(e.billNo);
                              }
                            }}
                          >
                            <XCircle className="w-4 h-4" /> Delete Entry
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      <PurchaseCreationModal 
        isOpen={isFormOpen} 
        onClose={() => setIsFormOpen(false)} 
        mode="entry" 
      />
    </PageShell>
  );
}

