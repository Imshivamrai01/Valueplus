"use client";
import { ModuleStub } from "@/components/shared/module-stub";
export default function StockTransferPage() {
  return <ModuleStub title="Stock Transfer" subtitle="Transfer stock between warehouses" breadcrumbs={[{ label: "Inventory" }, { label: "Stock Transfer" }]} description="Initiate and track inter-warehouse stock transfers. Monitor transit status and confirm receipts at destination warehouses." ctaLabel="New Transfer" />;
}
