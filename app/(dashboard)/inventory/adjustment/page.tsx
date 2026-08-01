"use client";
import { ModuleStub } from "@/components/shared/module-stub";
export default function StockAdjustmentPage() {
  return <ModuleStub title="Stock Adjustment" subtitle="Adjust inventory quantities" breadcrumbs={[{ label: "Inventory" }, { label: "Stock Adjustment" }]} description="Record stock additions and reductions. Handle breakage, theft, damage, and opening stock entries with full audit trails." ctaLabel="New Adjustment" />;
}
