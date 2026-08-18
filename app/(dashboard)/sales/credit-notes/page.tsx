"use client";

import { useState, useMemo, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { 
  Plus, Search, Download, FileMinus, MoreHorizontal, FileText, XCircle
} from "lucide-react";
import { InvoiceCreationModal } from "@/components/InvoiceCreationModal";
import { toast } from "sonner";
import { PageShell } from "@/components/shared/page-shell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { formatCurrency, formatDate, downloadCSV } from "@/lib/utils";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

export default function CreditNotesPage() {
  return (
    <Suspense fallback={<div className="p-12 text-center text-muted-foreground">Loading Credit Notes...</div>}>
      <CreditNotesContent />
    </Suspense>
  );
}

function CreditNotesContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const queryClient = useQueryClient();
  
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [noteToDelete, setNoteToDelete] = useState<string | null>(null);

  useEffect(() => {
    if (searchParams.get("new") === "true") {
      setIsFormOpen(true);
    }
  }, [searchParams]);

  const { data: creditNotes = [], isLoading: loading } = useQuery({
    queryKey: ["creditNotes"],
    queryFn: async () => {
      const res = await fetch("/api/invoices?type=credit-note");
      const json = await res.json();
      return json.success ? json.data : [];
    }
  });

  const deleteMutation = useMutation({
    mutationFn: async (invoiceNumber: string) => {
      const res = await fetch(`/api/invoices?invoiceNumber=${encodeURIComponent(invoiceNumber)}`, { method: "DELETE" });
      const json = await res.json();
      if (!json.success) throw new Error(json.error || "Failed to delete credit note");
      return json;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["creditNotes"] });
      toast.success("Credit note deleted successfully");
      setNoteToDelete(null);
    },
    onError: (error: any) => {
      toast.error(error.message || "An error occurred while deleting");
    }
  });

  const totalCreditAmount = useMemo(() => {
    return creditNotes.reduce((sum: number, note: any) => sum + (note.total || 0), 0);
  }, [creditNotes]);

  return (
    <PageShell
      title="Credit Notes"
      subtitle={`${creditNotes.length} Credit Notes issued • Total Value: ${formatCurrency(totalCreditAmount)}`}
      breadcrumbs={[{ label: "Sales" }, { label: "Credit Notes" }]}
      actions={
        <>
          <Button variant="outline" size="sm" onClick={() => downloadCSV(creditNotes.map((i: any) => ({ ...i })), "credit_notes.csv")}>
            <Download className="w-4 h-4 mr-1.5" /> Export
          </Button>
          <Button size="sm" onClick={() => setIsFormOpen(true)} className="bg-[#3F63AD] hover:bg-[#2E4F95] text-white font-bold shadow-md">
            <Plus className="w-4 h-4 mr-1.5" /> Issue Credit Note
          </Button>
        </>
      }
    >
      <div className="data-table-container">
        <div className="flex flex-wrap items-center gap-3 p-4 border-b">
          <div className="relative flex-1 min-w-48">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input placeholder="Search credit note #, customer..." value={search} onChange={(e) => { setSearch(e.target.value); setPage(1); }} className="pl-9" />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 border-b">
              <tr>
                {["Credit Note #", "Customer Name", "Date", "Taxable", "GST", "Total Amount", "Action"].map((h) => (
                  <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wide whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y">
              {loading ? (
                <tr><td colSpan={7} className="py-16 text-center text-muted-foreground">Loading credit notes...</td></tr>
              ) : creditNotes.length === 0 ? (
                <tr><td colSpan={7} className="py-16 text-center text-muted-foreground">No credit notes found</td></tr>
              ) : (
                creditNotes
                  .filter((inv: any) => {
                    return inv.invoiceNumber?.toLowerCase().includes(search.toLowerCase()) || 
                           inv.customerName?.toLowerCase().includes(search.toLowerCase());
                  })
                  .slice((page - 1) * 10, page * 10)
                  .map((inv: any) => (
                    <tr key={inv._id || inv.invoiceNumber} className="hover:bg-slate-50/70 transition-colors">
                      <td className="px-4 py-3">
                        <div className="font-semibold text-foreground flex items-center gap-1.5">
                          {inv.invoiceNumber}
                          <FileMinus className="w-3 h-3 text-muted-foreground" />
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <span className="font-semibold text-foreground">{inv.customerName}</span>
                      </td>
                      <td className="px-4 py-3 text-muted-foreground">{formatDate(inv.date || inv.createdAt)}</td>
                      <td className="px-4 py-3 font-mono">{formatCurrency(inv.subtotal || 0)}</td>
                      <td className="px-4 py-3 font-mono">{formatCurrency(inv.totalGST || 0)}</td>
                      <td className="px-4 py-3 font-bold font-mono text-red-600">-{formatCurrency(inv.total || 0)}</td>
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
                                if(confirm(`Are you sure you want to delete ${inv.invoiceNumber}?`)) {
                                  deleteMutation.mutate(inv.invoiceNumber);
                                }
                              }}
                            >
                              <XCircle className="w-4 h-4" /> Delete Credit Note
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
        
        {creditNotes.length > 10 && (
          <div className="p-4 border-t flex items-center justify-between bg-slate-50 rounded-b-xl">
            <span className="text-xs text-muted-foreground">Showing {(page - 1) * 10 + 1} to {Math.min(page * 10, creditNotes.length)} of {creditNotes.length} entries</span>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" disabled={page === 1} onClick={() => setPage(p => p - 1)}>Prev</Button>
              <Button variant="outline" size="sm" disabled={page * 10 >= creditNotes.length} onClick={() => setPage(p => p + 1)}>Next</Button>
            </div>
          </div>
        )}
      </div>

      <InvoiceCreationModal 
        isOpen={isFormOpen} 
        onClose={() => setIsFormOpen(false)}
        onSuccess={() => queryClient.invalidateQueries({ queryKey: ["creditNotes"] })}
        mode="credit-note"
      />
    </PageShell>
  );
}
