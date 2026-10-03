"use client";

import { useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import { useSession } from "next-auth/react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Lock } from "lucide-react";

// Sales/billing + the cash register itself are genuinely blocked — no way
// through — until the pending day is closed. Everything else (purchase,
// inventory, reports, etc.) stays usable so the business doesn't grind to a
// halt over a missed night audit; the reminder toast still follows the user
// everywhere so the block itself doesn't come as a surprise.
const BLOCKED_PREFIXES = ["/sales", "/banking/accounts"];
const NAG_INTERVAL_MS = 2 * 60 * 1000;

export function DayCloseGate() {
  const pathname = usePathname();
  const { data: session } = useSession();
  const queryClient = useQueryClient();
  const [countedCash, setCountedCash] = useState("");
  const [notes, setNotes] = useState("");
  const lastToastedDate = useRef<string | null>(null);

  // Super Admin never gets nagged or blocked by this — only every other role
  // (cashier, accounts, manager, etc.) is expected to do the nightly audit.
  const userRole = ((session?.user as any)?.role || "").toLowerCase();
  const isExemptRole = userRole === "admin";

  const { data } = useQuery({
    queryKey: ["day-close-status"],
    queryFn: async () => {
      const res = await fetch("/api/day-close");
      const json = await res.json();
      if (!json.success) throw new Error(json.error);
      return json.data as { pendingDate: string | null };
    },
    refetchInterval: 5 * 60 * 1000,
    enabled: !!session && !isExemptRole,
  });

  const pendingDate = isExemptRole ? null : data?.pendingDate || null;
  const isBlockedRoute = BLOCKED_PREFIXES.some((p) => pathname?.startsWith(p));
  // No dismiss, no close button — the only way off this screen is actually
  // submitting the audit. Cancelling out of it is not an option by design:
  // the cashier cannot start the next day's billing without it.
  const showBlock = !!pendingDate && isBlockedRoute;

  // Keeps nagging on its own timer everywhere else in the app too, not just
  // on the blocked pages, so the pending audit never goes unnoticed.
  useEffect(() => {
    if (!pendingDate) return;

    if (lastToastedDate.current !== pendingDate) {
      lastToastedDate.current = pendingDate;
      toast.warning(`${pendingDate} ka cash audit (Day-Close) abhi tak nahi hua hai.`, { duration: 8000 });
    }

    const interval = setInterval(() => {
      toast.warning(`${pendingDate} ka cash audit abhi bhi baaki hai — Sales/Cash pages lock hain.`, { duration: 6000 });
    }, NAG_INTERVAL_MS);

    return () => clearInterval(interval);
  }, [pendingDate]);

  const closeMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch("/api/day-close", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          countedCash: Number(countedCash),
          notes,
          closedBy: session?.user?.name || "Admin / Cashier",
          closedByRole: userRole,
        }),
      });
      const json = await res.json();
      if (!json.success) throw new Error(json.error);
      return json.data;
    },
    onSuccess: () => {
      toast.success("Day-close recorded. Sales/Cash pages unlocked.");
      setCountedCash("");
      setNotes("");
      queryClient.invalidateQueries({ queryKey: ["day-close-status"] });
    },
    onError: (err: any) => toast.error(err.message || "Day-close failed"),
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!countedCash || Number(countedCash) < 0) {
      toast.error("Ginti kiya hua cash amount daalein.");
      return;
    }
    closeMutation.mutate();
  };

  if (!showBlock) return null;

  return (
    <div className="fixed inset-0 z-[100] bg-white flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-white rounded-2xl border border-slate-200 shadow-xl p-6">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-xl bg-amber-50 border border-amber-200 flex items-center justify-center text-amber-600">
            <Lock className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-base font-black text-slate-900">Daily Cash Audit Pending — {pendingDate}</h2>
            <p className="text-xs text-slate-500">
              Jab tak pichhle din ka audit submit na ho, Sales/Billing aur Cash Register yahan nahi khulega.
            </p>
          </div>
        </div>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="countedCash">Physically Counted Cash (₹)</Label>
            <Input
              id="countedCash"
              type="number"
              min="0"
              step="1"
              value={countedCash}
              onChange={(e) => setCountedCash(e.target.value)}
              placeholder="Gallay me jo cash mila, wo amount daalein"
              required
              autoFocus
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="notes">Notes (optional)</Label>
            <Textarea
              id="notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Koi discrepancy ya note ho to likhein"
            />
          </div>
          <Button type="submit" disabled={closeMutation.isPending} className="w-full">
            {closeMutation.isPending ? "Submitting..." : "Submit Day-Close & Unlock"}
          </Button>
        </form>
      </div>
    </div>
  );
}
