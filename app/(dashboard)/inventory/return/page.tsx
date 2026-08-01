"use client";
import { ModuleStub } from "@/components/shared/module-stub";
export default function StockReturnPage() {
  return <ModuleStub title="Stock Return" subtitle="Process inventory returns" breadcrumbs={[{ label: "Inventory" }, { label: "Stock Return" }]} description="Process returns from customers or back to suppliers. Update stock quantities and generate appropriate accounting entries automatically." ctaLabel="New Return" />;
}
