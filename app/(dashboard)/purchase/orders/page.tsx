"use client";
import { ModuleStub } from "@/components/shared/module-stub";
export default function PurchaseOrdersPage() {
  return <ModuleStub title="Purchase Orders" subtitle="Manage supplier orders" breadcrumbs={[{ label: "Purchase" }, { label: "Purchase Orders" }]} description="Create and track purchase orders to suppliers. Monitor order status, expected delivery dates, and pending quantities." ctaLabel="New Purchase Order" />;
}
