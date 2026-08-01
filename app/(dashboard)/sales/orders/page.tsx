"use client";
import { ModuleStub } from "@/components/shared/module-stub";
export default function SalesOrdersPage() {
  return <ModuleStub title="Sales Orders" subtitle="Manage customer orders" breadcrumbs={[{ label: "Sales" }, { label: "Sales Orders" }]} description="Track and manage all customer orders from placement to delivery. Monitor order status, quantities, and delivery schedules." ctaLabel="New Sales Order" />;
}
