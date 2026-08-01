"use client";
import { ModuleStub } from "@/components/shared/module-stub";
export default function ChallanPage() {
  return <ModuleStub title="Delivery Challan" subtitle="Manage delivery challans" breadcrumbs={[{ label: "Sales" }, { label: "Delivery Challan" }]} description="Create and track delivery challans for outgoing shipments. Record vehicle numbers, driver details, and delivery status." ctaLabel="New Challan" />;
}
