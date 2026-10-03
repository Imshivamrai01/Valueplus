"use client";

import { useMemo, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { formatCurrency } from "@/lib/utils";
import { HandCoins, CheckCircle2 } from "lucide-react";

function todayStr() {
  return new Date().toISOString().split("T")[0];
}
function nowTimeStr() {
  const d = new Date();
  return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
}

/**
 * Cashier-only card: lets the cashier record that today's cash was physically
 * handed over to the Admin/MD, with the time it actually happened (not just
 * "now") — so both sides have a shared record of "maine de diya hai".
 * Writes a normal MD_HANDOVER cash-transaction, same category the Cash
 * Register page already understands, just surfaced here for quick one-tap use.
 */
export function CashHandoverCard({ cashierName }: { cashierName: string }) {
  const queryClient = useQueryClient();
  const [isOpen, setIsOpen] = useState(false);
  const [amount, setAmount] = useState("");
  const [time, setTime] = useState(nowTimeStr());
  const [notes, setNotes] = useState("");

  const { data } = useQuery({
    queryKey: ["cash-register"],
    queryFn: async () => {
      const res = await fetch("/api/cash-register");
      const json = await res.json();
      return json.success ? json.data : null;
    },
    refetchInterval: 2 * 60 * 1000,
  });

  const todaysHandover = useMemo(() => {
    const ledger = data?.ledger || [];
    return ledger.find((e: any) => e.category === "MD_HANDOVER" && e.date === todayStr()) || null;
  }, [data]);

  // Today's own net cash movement — not the all-time running register balance
  // (which also carries a ₹2,00,000 opening float and every prior day's
  // history). A cashier hands over what came in today, not the business's
  // entire cash position since day one.
  const todaysNetCash = Math.max(0, (data?.todayInflow || 0) - (data?.todayOutflow || 0));

  const openDialog = () => {
    setAmount(String(Math.round(todaysNetCash)));
    setTime(nowTimeStr());
    setNotes("");
    setIsOpen(true);
  };

  const handoverMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch("/api/cash-register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: "OUTFLOW",
          category: "MD_HANDOVER",
          amount: Number(amount),
          date: todayStr(),
          time,
          handedTo: "Admin",
          partyName: "Admin",
          description: notes || "Cash handover to Admin",
          recordedBy: cashierName,
        }),
      });
      const json = await res.json();
      if (!json.success) throw new Error(json.error);
      return json.data;
    },
    onSuccess: () => {
      toast.success("Handover record ho gaya — Admin ko dikh jaega.");
      setIsOpen(false);
      queryClient.invalidateQueries({ queryKey: ["cash-register"] });
    },
    onError: (err: any) => toast.error(err.message || "Handover record nahi ho paya"),
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!amount || Number(amount) <= 0) {
      toast.error("Valid amount daalein.");
      return;
    }
    if (!time) {
      toast.error("Handover ka time daalein.");
      return;
    }
    handoverMutation.mutate();
  };

  return (
    <div className="bg-white rounded-xl border border-slate-200/90 shadow-sm p-4">
      {todaysHandover ? (
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-emerald-50 border border-emerald-200 flex items-center justify-center text-emerald-600 shrink-0">
            <CheckCircle2 className="w-5 h-5" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-black text-slate-900">Aaj ka cash Admin ko de diya gaya hai</p>
            <p className="text-xs text-slate-500">
              {formatCurrency(todaysHandover.amount)} · {todaysHandover.time} baje
            </p>
          </div>
          <Button variant="outline" size="sm" onClick={openDialog} className="h-8 text-xs shrink-0">
            Ek aur handover karo
          </Button>
        </div>
      ) : (
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-amber-50 border border-amber-200 flex items-center justify-center text-amber-600 shrink-0">
            <HandCoins className="w-5 h-5" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-black text-slate-900">Cash Admin ko hand over karna hai?</p>
            <p className="text-xs text-slate-500">Aaj ka cash: {formatCurrency(todaysNetCash)}</p>
          </div>
          <Button size="sm" onClick={openDialog} className="h-8 text-xs shrink-0 bg-[#3F63AD] hover:bg-[#2E4F95]">
            Transfer to Admin
          </Button>
        </div>
      )}

      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Cash Handover to Admin</DialogTitle>
            <DialogDescription>Jo amount aur jis time par cash diya, wahi yahan daalein.</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="handoverAmount">Amount (₹)</Label>
              <Input
                id="handoverAmount"
                type="number"
                min="0"
                step="1"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="handoverTime">Handover Time</Label>
              <Input
                id="handoverTime"
                type="time"
                value={time}
                onChange={(e) => setTime(e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="handoverNotes">Notes (optional)</Label>
              <Textarea
                id="handoverNotes"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Koi note ho to likhein"
              />
            </div>
            <DialogFooter>
              <Button type="submit" disabled={handoverMutation.isPending} className="w-full">
                {handoverMutation.isPending ? "Saving..." : "Confirm Handover"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
