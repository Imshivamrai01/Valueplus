"use client";
import { ModuleStub } from "@/components/shared/module-stub";
export default function JournalEntriesPage() {
  return <ModuleStub title="Journal Entries" subtitle="Double-entry bookkeeping" breadcrumbs={[{ label: "Accounting" }, { label: "Journal Entries" }]} description="Create manual journal entries for adjustments, accruals, and other accounting transactions. Full double-entry bookkeeping compliance." ctaLabel="New Entry" />;
}
