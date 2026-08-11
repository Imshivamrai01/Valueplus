"use client";

import { PageShell } from "@/components/shared/page-shell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Plus, Search, DollarSign, Receipt, Trash2, AlertTriangle } from "lucide-react";
import { useState, useMemo } from "react";
import { toast } from "sonner";
import { formatCurrency, formatDate } from "@/lib/utils";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

interface ExpenseItem {
  id: string;
  expenseNo: string;
  category: string;
  description: string;
  amount: number;
  date: string;
  paymentMode: "UPI" | "Bank Transfer" | "Cash" | "Card";
  status: "paid" | "approved" | "pending";
}

export default function ExpensesPage() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [expenseToDelete, setExpenseToDelete] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    category: "Store Rent",
    description: "",
    amount: "",
    paymentMode: "UPI",
  });

  const { data: expenses = [], isLoading: loading } = useQuery({
    queryKey: ["expenses"],
    queryFn: async () => {
      const res = await fetch("/api/expenses");
      const json = await res.json();
      return json.success ? json.data : [];
    }
  });

  const filtered = useMemo(() => {
    return expenses.filter(
      (e) =>
        !search ||
        e.expenseNo.toLowerCase().includes(search.toLowerCase()) ||
        e.category.toLowerCase().includes(search.toLowerCase()) ||
        e.description.toLowerCase().includes(search.toLowerCase())
    );
  }, [expenses, search]);

  const createExpenseMutation = useMutation({
    mutationFn: async (payload: any) => {
      const res = await fetch("/api/expenses", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });
      const json = await res.json();
      if (!json.success) throw new Error(json.error || "Failed to create expense");
      return json.data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["expenses"] });
      toast.success(`Expense ${data.expenseNo || ""} recorded!`);
      setIsFormOpen(false);
      setFormData({ category: "Store Rent", description: "", amount: "", paymentMode: "UPI" });
    },
    onError: (error: any) => {
      toast.error(error.message || "An error occurred");
    }
  });

  const deleteExpenseMutation = useMutation({
    mutationFn: async (expenseNo: string) => {
      const res = await fetch(`/api/expenses?expenseNo=${encodeURIComponent(expenseNo)}`, { method: "DELETE" });
      const json = await res.json();
      if (!json.success) throw new Error(json.error || "Failed to delete expense");
      return json;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["expenses"] });
      toast.success("Expense deleted successfully");
      setExpenseToDelete(null);
    },
    onError: (error: any) => {
      toast.error(error.message || "An error occurred while deleting");
    }
  });

  const handleSave = () => {
    if (!formData.description || !formData.amount) {
      toast.error("Please fill Description and Expense Amount");
      return;
    }

    const payload = {
      expenseNo: `EXP-${new Date().getFullYear()}-${String(expenses.length + 92).padStart(4, "0")}`,
      category: formData.category,
      description: formData.description,
      amount: Number(formData.amount) || 0,
      date: new Date().toISOString().split("T")[0],
      paymentMode: formData.paymentMode,
      status: "paid",
    };

    createExpenseMutation.mutate(payload);
  };

  return (
    <PageShell
      title="Expenses"
      subtitle="Categorize and track business operating costs"
      breadcrumbs={[{ label: "Purchase" }, { label: "Expenses" }]}
      actions={
        <Button size="sm" onClick={() => setIsFormOpen(true)}>
          <Plus className="w-4 h-4 mr-1.5" /> Add Expense
        </Button>
      }
    >
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[{ label: "Total Expenses", value: formatCurrency(expenses.reduce((a, b) => a + b.amount, 0)) }, { label: "Paid Expenses", value: formatCurrency(expenses.filter(e => e.status === "paid").reduce((a, b) => a + b.amount, 0)) }, { label: "Total Entries", value: expenses.length }, { label: "Top Category", value: "Store Rent" }].map((s) => (
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
            <Input placeholder="Search expenses, category..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 border-b">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase">Expense #</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase">Category</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase">Description</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase">Date</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase">Payment Mode</th>
                <th className="px-4 py-3 text-right text-xs font-semibold text-muted-foreground uppercase">Amount</th>
                <th className="px-4 py-3 text-center text-xs font-semibold text-muted-foreground uppercase">Status</th>
                <th className="px-4 py-3 text-center text-xs font-semibold text-muted-foreground uppercase w-10">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {loading ? (
                <tr>
                  <td colSpan={8} className="px-4 py-8 text-center text-muted-foreground">Loading...</td>
                </tr>
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-4 py-8 text-center text-muted-foreground">No expenses found</td>
                </tr>
              ) : (
                filtered.map((e: any) => (
                <tr key={e._id || e.expenseNo} className="hover:bg-slate-50 transition-colors">
                  <td className="px-4 py-3 font-mono font-bold text-[#3F63AD]">{e.expenseNo}</td>
                  <td className="px-4 py-3 font-semibold text-foreground">{e.category}</td>
                  <td className="px-4 py-3 text-muted-foreground">{e.description}</td>
                  <td className="px-4 py-3 text-muted-foreground text-xs">{formatDate(e.date)}</td>
                  <td className="px-4 py-3 font-medium text-slate-700">{e.paymentMode}</td>
                  <td className="px-4 py-3 text-right font-bold text-slate-900">{formatCurrency(e.amount)}</td>
                  <td className="px-4 py-3 text-center">
                    <Badge variant={e.status === "paid" ? "success" : "warning"}>{e.status}</Badge>
                  </td>
                  <td className="px-4 py-3 text-center">
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      className="h-8 w-8 text-red-500 hover:text-red-700 hover:bg-red-50"
                      onClick={() => setExpenseToDelete(e.expenseNo)}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </td>
                </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
        <DialogContent className="max-w-2xl p-0 rounded-2xl border-none shadow-2xl overflow-hidden">
          {/* Header */}
          <div className="bg-gradient-to-r from-[#1B2537] via-[#2C3E5A] to-[#1B2537] text-white p-6 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl bg-white/10 flex items-center justify-center backdrop-blur-md border border-white/20">
                <Receipt className="w-6 h-6 text-[#76C043]" />
              </div>
              <div>
                <h3 className="text-xl font-bold tracking-tight">Record Store Expense</h3>
                <p className="text-xs text-slate-300 mt-0.5">
                  Categorize showroom operating costs, rent, electricity, freight & wages
                </p>
              </div>
            </div>
          </div>

          <div className="p-6 space-y-4 bg-slate-50/50">
            <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold text-slate-700">Expense Category *</Label>
                  <Select value={formData.category} onValueChange={(v) => setFormData({ ...formData, category: v })}>
                    <SelectTrigger className="bg-slate-50 border-slate-300"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Store Rent">Store Rent</SelectItem>
                      <SelectItem value="Electricity & Utilities">Electricity & Utilities</SelectItem>
                      <SelectItem value="Courier & Freight">Courier & Freight</SelectItem>
                      <SelectItem value="Staff Salary & Wages">Staff Salary & Wages</SelectItem>
                      <SelectItem value="Marketing & Promotions">Marketing & Promotions</SelectItem>
                      <SelectItem value="Office Maintenance">Office Maintenance</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold text-slate-700">Payment Mode</Label>
                  <Select value={formData.paymentMode} onValueChange={(v) => setFormData({ ...formData, paymentMode: v })}>
                    <SelectTrigger className="bg-slate-50 border-slate-300"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="UPI">UPI</SelectItem>
                      <SelectItem value="Bank Transfer">Bank Transfer</SelectItem>
                      <SelectItem value="Cash">Cash</SelectItem>
                      <SelectItem value="Card">Card</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1.5 md:col-span-2">
                  <Label className="text-xs font-semibold text-slate-700">Particulars / Description *</Label>
                  <Input
                    placeholder="e.g. Monthly Showroom Rent — Prayagraj Outlet"
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    className="bg-slate-50 border-slate-300"
                  />
                </div>

                <div className="space-y-1.5 md:col-span-2">
                  <Label className="text-xs font-semibold text-slate-700">Expense Amount (₹) *</Label>
                  <Input
                    type="number"
                    placeholder="25000"
                    value={formData.amount}
                    onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                    className="bg-slate-50 border-slate-300 font-semibold text-slate-900"
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
              Record Expense
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* DELETE CONFIRMATION MODAL */}
      <Dialog open={!!expenseToDelete} onOpenChange={(open) => !open && setExpenseToDelete(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-red-600 flex items-center gap-2">
              <AlertTriangle className="w-5 h-5" />
              Confirm Deletion
            </DialogTitle>
            <DialogDescription>
              Are you sure you want to delete expense <span className="font-bold">{expenseToDelete}</span>? 
              This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="mt-4">
            <Button variant="outline" onClick={() => setExpenseToDelete(null)} disabled={deleteExpenseMutation.isPending}>
              Cancel
            </Button>
            <Button 
              variant="destructive" 
              onClick={() => expenseToDelete && deleteExpenseMutation.mutate(expenseToDelete)}
              disabled={deleteExpenseMutation.isPending}
            >
              {deleteExpenseMutation.isPending ? "Deleting..." : "Delete Expense"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </PageShell>
  );
}

