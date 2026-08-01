"use client";
import { ModuleStub } from "@/components/shared/module-stub";
export default function GeneralLedgerPage() {
  return <ModuleStub title="General Ledger" subtitle="Complete account ledger" breadcrumbs={[{ label: "Accounting" }, { label: "General Ledger" }]} description="View all transactions for any account over any date range. Filter by account, date, and transaction type for detailed financial analysis." />;
}
