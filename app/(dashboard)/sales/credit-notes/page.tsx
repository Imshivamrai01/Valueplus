"use client";
import { ModuleStub } from "@/components/shared/module-stub";
export default function CreditNotesPage() {
  return <ModuleStub title="Credit Notes" subtitle="Manage sales returns" breadcrumbs={[{ label: "Sales" }, { label: "Credit Notes" }]} description="Issue credit notes for sales returns, overcharges, or goodwill adjustments. Track applied and pending credits." ctaLabel="New Credit Note" />;
}
