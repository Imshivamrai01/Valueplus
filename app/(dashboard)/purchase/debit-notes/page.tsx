"use client";

import { PageShell } from "@/components/shared/page-shell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Plus, Search, FileMinus, Trash2, AlertTriangle, MoreHorizontal, XCircle } from "lucide-react";
import { useState, useMemo } from "react";
import { toast } from "sonner";
import { formatCurrency, formatDate } from "@/lib/utils";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { PurchaseCreationModal } from "@/components/PurchaseCreationModal";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";

export default function DebitNotesPage() {
  const queryClient = useQueryClient();
  const { data: debitNotes = [], isLoading: loading } = useQuery({
    queryKey: ["debit-notes"],
    queryFn: async () => {
      const res = await fetch("/api/purchase-entries?type=debit-note");
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

  const deleteMutation = useMutation({
    mutationFn: async (billNo: string) => {
      const res = await fetch(`/api/purchase-entries?billNo=${encodeURIComponent(billNo)}`, { method: "DELETE" });
      const json = await res.json();
      if (!json.success) throw new Error(json.error || "Failed to delete debit note");
      return json;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["debit-notes"] });
      toast.success("Debit note deleted successfully");
    },
    onError: (error: any) => {
      toast.error(error.message || "An error occurred while deleting");
    }
  });

  const filtered = useMemo(() => {
    return debitNotes.filter(
      (e: any) =>
        !search ||
        e.billNo.toLowerCase().includes(search.toLowerCase()) ||
        e.supplierName.toLowerCase().includes(search.toLowerCase())
    );
  }, [debitNotes, search]);

  return (
    <PageShell
      title="Debit Notes (Purchase Returns)"
      subtitle="Manage purchase returns and reduce supplier payable balances"
      breadcrumbs={[{ label: "Purchase" }, { label: "Debit Notes" }]}
      actions={
        <Button size="sm" onClick={() => setIsFormOpen(true)} className="bg-red-600 hover:bg-red-700 text-white shadow-md font-bold">
          <Plus className="w-4 h-4 mr-1.5" /> Issue Debit Note
        </Button>
      }
    >
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[{ label: "Total Value of Returns", value: formatCurrency(debitNotes.reduce((a:any, b:any) => a + b.total, 0)) }, { label: "Pending Refunds/Credits", value: formatCurrency(debitNotes.filter((x:any) => x.status === "pending").reduce((a:any, b:any) => a + b.balance, 0)) }, { label: "Total Notes Issued", value: debitNotes.length }].map((s) => (
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
            <Input placeholder="Search Debit Note #, Supplier..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 border-b">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase">Debit Note #</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase">Supplier Name</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase">Date</th>
                <th className="px-4 py-3 text-right text-xs font-semibold text-muted-foreground uppercase">Subtotal</th>
                <th className="px-4 py-3 text-right text-xs font-semibold text-muted-foreground uppercase">GST</th>
                <th className="px-4 py-3 text-right text-xs font-semibold text-muted-foreground uppercase">Total Amount</th>
                <th className="px-4 py-3 text-center text-xs font-semibold text-muted-foreground uppercase">Status</th>
                <th className="px-4 py-3 text-center text-xs font-semibold text-muted-foreground uppercase">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {loading ? (
                <tr>
                  <td colSpan={8} className="px-4 py-8 text-center text-muted-foreground">Loading...</td>
                </tr>
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-4 py-8 text-center text-muted-foreground">No debit notes found</td>
                </tr>
              ) : (
                filtered.map((e: any) => (
                  <tr key={e._id || e.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-4 py-3 font-mono font-bold text-red-600 flex items-center gap-1.5">
                      {e.billNo} <FileMinus className="w-3 h-3 text-muted-foreground" />
                    </td>
                    <td className="px-4 py-3 font-medium text-foreground">{e.supplierName}</td>
                    <td className="px-4 py-3 text-muted-foreground text-xs">{formatDate(e.date || e.billDate)}</td>
                    <td className="px-4 py-3 text-right">{formatCurrency(e.amount || e.subtotal)}</td>
                    <td className="px-4 py-3 text-right text-muted-foreground">{formatCurrency(e.totalTax || e.gst)}</td>
                    <td className="px-4 py-3 text-right font-semibold text-red-600">-{formatCurrency((e.amount || e.subtotal) + (e.totalTax || e.gst))}</td>
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
                              if(confirm(`Are you sure you want to delete ${e.billNo}?`)) {
                                deleteMutation.mutate(e.billNo);
                              }
                            }}
                          >
                            <XCircle className="w-4 h-4" /> Delete Debit Note
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
        mode="debit-note" 
      />
    </PageShell>
  );
}
