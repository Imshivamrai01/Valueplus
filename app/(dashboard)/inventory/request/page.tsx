"use client";
import { ModuleStub } from "@/components/shared/module-stub";
export default function StockRequestPage() {
  return <ModuleStub title="Stock Request" subtitle="Internal stock requisitions" breadcrumbs={[{ label: "Inventory" }, { label: "Stock Request" }]} description="Raise and manage internal stock requisitions across departments. Track approvals and fulfillment status for all requests." ctaLabel="New Request" />;
}
