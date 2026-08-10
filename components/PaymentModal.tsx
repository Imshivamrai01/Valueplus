"use client";

import React, { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { WalletCards, Banknote, CreditCard, Send, XCircle } from "lucide-react";
import { toast } from "sonner";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { formatCurrency } from "@/lib/utils";

export function PaymentModal({ isOpen, onClose, onSuccess }: { isOpen: boolean; onClose: () => void; onSuccess?: () => void }) {
  const queryClient = useQueryClient();

  const { data: customers = [] } = useQuery({
    queryKey: ["customers"],
    queryFn: async () => {
      const res = await fetch("/api/customers");
      const json = await res.json();
      return json.success ? json.data : [];
    }
  });

  const [form, setForm] = useState({
    partyId: "",
    partyName: "",
    amount: "",
    paymentMode: "Cash",
    date: new Date().toISOString().split("T")[0],
    referenceId: "",
    notes: "",
  });

  // Reset form when modal opens
  useEffect(() => {
    if (isOpen) {
      setForm({
        partyId: "",
        partyName: "",
        amount: "",
        paymentMode: "Cash",
        date: new Date().toISOString().split("T")[0],
        referenceId: "",
        notes: "",
      });
    }
  }, [isOpen]);

  const handleSelectCustomer = (custId: string) => {
    const found = customers.find((c: any) => c._id === custId);
    if (found) {
      setForm({ ...form, partyId: found._id, partyName: found.name });
    }
  };

  const selectedCustomer = customers.find((c: any) => c._id === form.partyId);

  const createPaymentMutation = useMutation({
    mutationFn: async (payload: any) => {
      const res = await fetch("/api/payments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });
      const json = await res.json();
      if (!json.success) throw new Error(json.error || "Failed to record payment");
      return json.data;
    },
    onSuccess: () => {
      toast.success("Payment recorded successfully");
      queryClient.invalidateQueries({ queryKey: ["payments"] });
      queryClient.invalidateQueries({ queryKey: ["customers"] });
      onSuccess?.();
      onClose();
    },
    onError: (error: any) => {
      toast.error(error.message || "Failed to record payment");
    }
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.partyId || !form.amount || Number(form.amount) <= 0) {
      toast.error("Please select a customer and enter a valid amount.");
      return;
    }

    const payload = {
      transactionId: `TXN-${Date.now()}`,
      partyId: form.partyId,
      partyType: "Customer",
      partyName: form.partyName,
      amount: Number(form.amount),
      paymentMode: form.paymentMode,
      date: form.date,
      referenceId: form.referenceId,
      notes: form.notes,
      type: "received"
    };

    createPaymentMutation.mutate(payload);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl p-0 rounded-2xl border-none shadow-2xl overflow-hidden">
        <div className="bg-gradient-to-r from-[#1B2537] via-[#2C3E5A] to-[#1B2537] text-white p-6 flex items-center gap-3">
          <div className="w-12 h-12 rounded-xl bg-white/10 flex items-center justify-center backdrop-blur-md border border-white/20">
            <WalletCards className="w-6 h-6 text-[#76C043]" />
          </div>
          <div>
            <DialogTitle className="text-xl font-bold tracking-tight">Record Incoming Payment</DialogTitle>
            <DialogDescription className="text-slate-300 text-xs mt-0.5">
              Receive and log payments from customers to clear outstanding dues.
            </DialogDescription>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6 bg-slate-50/50">
          <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm space-y-4">
            
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-slate-700">Select Customer *</Label>
              <Select value={form.partyId} onValueChange={handleSelectCustomer}>
                <SelectTrigger className="bg-slate-50 border-slate-300 font-semibold text-[#3F63AD]">
                  <SelectValue placeholder="Search customer..." />
                </SelectTrigger>
                <SelectContent>
                  {customers.map((c: any) => (
                    <SelectItem key={c._id} value={c._id}>
                      {c.name} {c.phone ? `(${c.phone})` : ""}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {selectedCustomer && (
              <div className="bg-blue-50/50 p-3 rounded-lg border border-blue-100 flex items-center justify-between">
                <div>
                  <p className="text-xs font-bold text-slate-500 uppercase">Current Outstanding Balance</p>
                  <p className={`text-lg font-black ${selectedCustomer.outstandingBalance > 0 ? "text-red-600" : "text-emerald-600"}`}>
                    {formatCurrency(selectedCustomer.outstandingBalance || 0)}
                  </p>
                </div>
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-slate-700">Amount Received (₹) *</Label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 font-bold text-slate-500">₹</span>
                  <Input 
                    type="number" 
                    value={form.amount} 
                    onChange={(e) => setForm({ ...form, amount: e.target.value })} 
                    className="pl-8 bg-slate-50 border-slate-300 font-bold text-slate-900 text-lg" 
                    placeholder="0.00" 
                    autoFocus
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-slate-700">Payment Date *</Label>
                <Input 
                  type="date" 
                  value={form.date} 
                  onChange={(e) => setForm({ ...form, date: e.target.value })} 
                  className="bg-slate-50 border-slate-300" 
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-slate-700">Payment Mode *</Label>
                <Select value={form.paymentMode} onValueChange={(v) => setForm({ ...form, paymentMode: v })}>
                  <SelectTrigger className="bg-slate-50 border-slate-300">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Cash">Cash</SelectItem>
                    <SelectItem value="UPI">UPI</SelectItem>
                    <SelectItem value="Bank Transfer">Bank Transfer</SelectItem>
                    <SelectItem value="Credit Card">Credit Card</SelectItem>
                    <SelectItem value="Cheque">Cheque</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-slate-700">Reference / UTR / Cheque No.</Label>
                <Input 
                  value={form.referenceId} 
                  onChange={(e) => setForm({ ...form, referenceId: e.target.value })} 
                  className="bg-slate-50 border-slate-300 font-mono text-xs" 
                  placeholder="e.g. UTR123456789"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-slate-700">Internal Notes / Remarks</Label>
              <Input 
                value={form.notes} 
                onChange={(e) => setForm({ ...form, notes: e.target.value })} 
                className="bg-slate-50 border-slate-300 text-sm" 
                placeholder="Optional notes regarding this payment..."
              />
            </div>

          </div>

          <DialogFooter className="bg-slate-100 px-6 py-4 -mx-6 -mb-6 rounded-b-2xl border-t border-slate-200 flex items-center justify-between">
            <Button type="button" variant="ghost" onClick={onClose} className="text-slate-600">Cancel</Button>
            <Button type="submit" disabled={createPaymentMutation.isPending} className="bg-[#76C043] hover:bg-[#65A639] text-white shadow-lg shadow-green-900/20 font-bold px-8">
              {createPaymentMutation.isPending ? "Saving..." : "Record Payment"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
