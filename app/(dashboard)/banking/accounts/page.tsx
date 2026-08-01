"use client";
import { PageShell } from "@/components/shared/page-shell";
import { Button } from "@/components/ui/button";
import { Plus, Building2, CreditCard, IndianRupee } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { formatCurrency } from "@/lib/utils";

const ACCOUNTS = [
  { id:"1", name:"HDFC Current Account", bank:"HDFC Bank", number:"XXXX XXXX 4521", type:"current", balance:2845000, status:"active" },
  { id:"2", name:"SBI Savings Account", bank:"State Bank of India", number:"XXXX XXXX 8734", type:"savings", balance:856000, status:"active" },
  { id:"3", name:"ICICI Business Account", bank:"ICICI Bank", number:"XXXX XXXX 2198", type:"current", balance:1234000, status:"active" },
  { id:"4", name:"Cash Account", bank:"—", number:"—", type:"cash", balance:125000, status:"active" },
  { id:"5", name:"Petty Cash", bank:"—", number:"—", type:"cash", balance:15000, status:"active" },
];

export default function BankAccountsPage() {
  return (
    <PageShell title="Bank Accounts" subtitle="Manage bank & cash accounts" breadcrumbs={[{ label: "Banking" }, { label: "Bank Accounts" }]}
      actions={<Button size="sm" onClick={() => toast.success("Add account form opened")}><Plus className="w-4 h-4 mr-1.5" /> Add Account</Button>}>
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
        {ACCOUNTS.map(acc => (
          <div key={acc.id} className="metric-card">
            <div className="flex items-start justify-between mb-4">
              <div className="w-11 h-11 rounded-2xl bg-[#3F63AD]/10 flex items-center justify-center">
                {acc.type === "cash" ? <IndianRupee className="w-5 h-5 text-[#3F63AD]" /> : <Building2 className="w-5 h-5 text-[#3F63AD]" />}
              </div>
              <Badge variant={acc.type === "cash" ? "info" : "success"}>{acc.type}</Badge>
            </div>
            <p className="font-semibold text-foreground">{acc.name}</p>
            <p className="text-xs text-muted-foreground mt-0.5">{acc.bank} · {acc.number}</p>
            <div className="mt-4 pt-4 border-t">
              <p className="text-xs text-muted-foreground">Current Balance</p>
              <p className="text-2xl font-bold text-foreground mt-0.5">{formatCurrency(acc.balance)}</p>
            </div>
            <div className="flex gap-2 mt-4">
              <Button variant="outline" size="sm" className="flex-1" onClick={() => toast.info(`Viewing ${acc.name}`)}>Transactions</Button>
              <Button variant="outline" size="sm" onClick={() => toast.info(`Editing ${acc.name}`)}>Edit</Button>
            </div>
          </div>
        ))}
      </div>
    </PageShell>
  );
}
