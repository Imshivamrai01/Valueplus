"use client";
import { ModuleStub } from "@/components/shared/module-stub";
export default function DebitNotesPage() {
  return <ModuleStub title="Debit Notes" subtitle="Manage purchase returns" breadcrumbs={[{ label: "Purchase" }, { label: "Debit Notes" }]} description="Issue debit notes for purchase returns and overcharges. Reduce your supplier payable balances with proper documentation." ctaLabel="New Debit Note" />;
}
