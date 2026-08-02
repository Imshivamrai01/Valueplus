"use client";

import { PageShell } from "@/components/shared/page-shell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Plus, Search, DollarSign, Receipt } from "lucide-react";
import { useState, useMemo } from "react";
import { toast } from "sonner";
import { formatCurrency, formatDate } from "@/lib/utils";

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

const INITIAL_EXPENSES: ExpenseItem[] = [
  { id: "1", expenseNo: "EXP-2026-0091", category: "Store Rent", description: "Monthly Showroom Rent — Prayagraj Branch", amount: 65000, date: "2026-08-01", paymentMode: "Bank Transfer", status: "paid" },
  { id: "2", expenseNo: "EXP-2026-0090", category: "Electricity & Utilities", description: "UPPCL Electricity Bill — Noida Hub", amount: 28400, date: "2026-07-30", paymentMode: "UPI", status: "paid" },
  { id: "3", expenseNo: "EXP-2026-0089", category: "Courier & Freight", description: "Bluedart express delivery for customer returns", amount: 14500, date: "2026-07-28", paymentMode: "UPI", status: "paid" },
  { id: "4", expenseNo: "EXP-2026-0088", category: "Staff Salary & Wages", description: "Sales Executives Incentive Bonus Q1", amount: 120000, date: "2026-07-25", paymentMode: "Bank Transfer", status: "paid" },
  { id: "5", expenseNo: "EXP-2026-0087", category: "Marketing & Promotions", description: "Local Newspaper & Flex Banner Ads", amount: 35000, date: "2026-07-20", paymentMode: "Cash", status: "approved" },
];

export default function ExpensesPage() {
  const [expenses, setExpenses] = useState<ExpenseItem[]>(INITIAL_EXPENSES);
  const [search, setSearch] = useState("");
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [formData, setFormData] = useState({
    category: "Store Rent",
    description: "",
    amount: "",
    paymentMode: "UPI",
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

  const handleSave = () => {
    if (!formData.description || !formData.amount) {
      toast.error("Please fill Description and Expense Amount");
      return;
    }

    const newExp: ExpenseItem = {
      id: String(Date.now()),
      expenseNo: `EXP-2026-${String(expenses.length + 92).padStart(4, "0")}`,
      category: formData.category,
      description: formData.description,
      amount: Number(formData.amount) || 0,
      date: new Date().toISOString().split("T")[0],
      paymentMode: formData.paymentMode as any,
      status: "paid",
    };

    setExpenses([newExp, ...expenses]);
    toast.success(`Expense ${newExp.expenseNo} recorded!`);
    setIsFormOpen(false);
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
              </tr>
            </thead>
            <tbody className="divide-y">
              {filtered.map((e) => (
                <tr key={e.id} className="hover:bg-slate-50 transition-colors">
                  <td className="px-4 py-3 font-mono font-bold text-[#3F63AD]">{e.expenseNo}</td>
                  <td className="px-4 py-3 font-semibold text-foreground">{e.category}</td>
                  <td className="px-4 py-3 text-muted-foreground">{e.description}</td>
                  <td className="px-4 py-3 text-muted-foreground text-xs">{formatDate(e.date)}</td>
                  <td className="px-4 py-3 font-medium text-slate-700">{e.paymentMode}</td>
                  <td className="px-4 py-3 text-right font-bold text-slate-900">{formatCurrency(e.amount)}</td>
                  <td className="px-4 py-3 text-center">
                    <Badge variant={e.status === "paid" ? "success" : "warning"}>{e.status}</Badge>
                  </td>
                </tr>
              ))}
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
    </PageShell>
  );
}

