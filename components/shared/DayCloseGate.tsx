"use client";

import { useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import { useSession } from "next-auth/react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

// Sales/billing + the cash register itself are hard-blocked until the pending
// day is closed. Everything else (purchase, inventory, reports, etc.) stays
// usable so the business doesn't grind to a halt over a missed night audit.
const BLOCKED_PREFIXES = ["/sales", "/banking/accounts"];

export function DayCloseGate() {
  const pathname = usePathname();
  const { data: session } = useSession();
  const queryClient = useQueryClient();
  const [countedCash, setCountedCash] = useState("");
  const [notes, setNotes] = useState("");
  const lastToastedDate = useRef<string | null>(null);

  const { data } = useQuery({
    queryKey: ["day-close-status"],
    queryFn: async () => {
      const res = await fetch("/api/day-close");
      const json = await res.json();
      if (!json.success) throw new Error(json.error);
      return json.data as { pendingDate: string | null };
    },
    refetchInterval: 5 * 60 * 1000,
  });

  const pendingDate = data?.pendingDate || null;
  const isBlockedRoute = BLOCKED_PREFIXES.some((p) => pathname?.startsWith(p));
  const showBlockingDialog = !!pendingDate && isBlockedRoute;

  useEffect(() => {
    if (pendingDate && lastToastedDate.current !== pendingDate) {
      lastToastedDate.current = pendingDate;
      toast.warning(`${pendingDate} ka cash audit (Day-Close) abhi tak nahi hua hai — Sales/Cash pages lock rahenge jab tak audit na ho.`, {
        duration: 8000,
      });
    } else if (pendingDate && isBlockedRoute) {
      // Re-nag on every poll while sitting on a blocked page, not just once.
      toast.warning(`${pendingDate} ka cash audit baaki hai.`, { duration: 5000 });
    }
  }, [pendingDate, isBlockedRoute]);

  const closeMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch("/api/day-close", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          countedCash: Number(countedCash),
          notes,
          closedBy: session?.user?.name || "Admin / Cashier",
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

  if (!showBlockingDialog) return null;

  return (
    <Dialog open={showBlockingDialog} onOpenChange={() => {}}>
      <DialogContent className="sm:max-w-md" onInteractOutside={(e) => e.preventDefault()} onEscapeKeyDown={(e) => e.preventDefault()}>
        <DialogHeader>
          <DialogTitle>Daily Cash Audit Pending — {pendingDate}</DialogTitle>
          <DialogDescription>
            Pichhle din ka cash audit complete karna zaroori hai. Jab tak audit na ho, Sales/Billing aur Cash Register pages lock rahenge.
          </DialogDescription>
        </DialogHeader>
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
          <DialogFooter>
            <Button type="submit" disabled={closeMutation.isPending} className="w-full">
              {closeMutation.isPending ? "Submitting..." : "Submit Day-Close"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
