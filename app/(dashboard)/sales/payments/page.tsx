"use client";

import { PageShell } from "@/components/shared/page-shell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Plus, Search, WalletCards, ArrowDownLeft, Building2, User } from "lucide-react";
import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { formatCurrency, formatDate } from "@/lib/utils";
import { PaymentModal } from "@/components/PaymentModal";

export default function ReceivePaymentPage() {
  const [search, setSearch] = useState("");
  const [isFormOpen, setIsFormOpen] = useState(false);

  const { data: payments = [], isLoading } = useQuery({
    queryKey: ["payments"],
    queryFn: async () => {
      const res = await fetch("/api/payments");
      const json = await res.json();
      return json.success ? json.data.filter((p: any) => p.type === "received") : [];
    }
  });

  const filtered = useMemo(() => {
    return payments.filter(
      (p: any) =>
        !search ||
        (p.transactionId || "").toLowerCase().includes(search.toLowerCase()) ||
        (p.partyName || "").toLowerCase().includes(search.toLowerCase()) ||
        (p.referenceId || "").toLowerCase().includes(search.toLowerCase())
    );
  }, [payments, search]);

  const totalReceived = payments.reduce((sum: number, p: any) => sum + (p.amount || 0), 0);
  const todayReceived = payments
    .filter((p: any) => p.date === new Date().toISOString().split("T")[0])
    .reduce((sum: number, p: any) => sum + (p.amount || 0), 0);

  return (
    <PageShell
      title="Receive Payments"
      subtitle="Track and record incoming payments from customers"
      breadcrumbs={[{ label: "Sales" }, { label: "Receive Payments" }]}
      actions={
        <Button size="sm" onClick={() => setIsFormOpen(true)} className="bg-[#76C043] hover:bg-[#65A639] text-white">
          <Plus className="w-4 h-4 mr-1.5" /> Record Payment
        </Button>
      }
    >
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[{ label: "Total Transactions", value: payments.length }, { label: "Today's Receipts", value: formatCurrency(todayReceived) }, { label: "Total Collected", value: formatCurrency(totalReceived) }].map((s) => (
          <div key={s.label} className="metric-card bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex flex-col justify-center">
            <p className="text-2xl font-bold text-slate-800">{s.value}</p>
            <p className="text-xs text-slate-500 font-medium uppercase mt-1">{s.label}</p>
          </div>
        ))}
      </div>

      <div className="data-table-container mt-6">
        <div className="flex items-center justify-between p-4 border-b bg-white rounded-t-xl">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input placeholder="Search by TXN ID, Customer or Ref..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9 bg-slate-50 border-slate-200" />
          </div>
        </div>

        <div className="overflow-x-auto bg-white rounded-b-xl border border-t-0 border-slate-200 shadow-sm">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 border-b">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Transaction ID</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Date</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Customer</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Mode & Ref</th>
                <th className="px-4 py-3 text-right text-xs font-semibold text-slate-500 uppercase tracking-wider">Amount</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {isLoading ? (
                <tr>
                  <td colSpan={5} className="px-4 py-8 text-center text-slate-500 font-medium">Loading payments...</td>
                </tr>
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-4 py-12 text-center text-slate-500 font-medium">
                    <div className="flex flex-col items-center justify-center space-y-3">
                      <WalletCards className="w-10 h-10 text-slate-300" />
                      <p>No payments recorded yet</p>
                      <Button variant="outline" size="sm" onClick={() => setIsFormOpen(true)}>Record your first payment</Button>
                    </div>
                  </td>
                </tr>
              ) : filtered.map((p: any) => (
                <tr key={p._id || p.id} className="hover:bg-slate-50/80 transition-colors">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <div className="w-7 h-7 rounded bg-emerald-100 flex items-center justify-center shrink-0">
                        <ArrowDownLeft className="w-4 h-4 text-emerald-600" />
                      </div>
                      <span className="font-mono font-bold text-slate-700 text-xs">{p.transactionId}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-slate-600 text-xs font-medium">{formatDate(p.date)}</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <User className="w-4 h-4 text-slate-400" />
                      <span className="font-semibold text-slate-800">{p.partyName}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex flex-col gap-0.5">
                      <Badge variant="outline" className="w-fit text-[10px] uppercase font-bold tracking-wider bg-slate-50 text-slate-600 border-slate-200">
                        {p.paymentMode}
                      </Badge>
                      {p.referenceId && <span className="text-[10px] text-slate-500 font-mono mt-1">Ref: {p.referenceId}</span>}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <span className="font-black text-emerald-600 text-base">{formatCurrency(p.amount)}</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <PaymentModal 
        isOpen={isFormOpen} 
        onClose={() => setIsFormOpen(false)} 
        onSuccess={() => setIsFormOpen(false)} 
      />
    </PageShell>
  );
}
