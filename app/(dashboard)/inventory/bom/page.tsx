"use client";
import { ModuleStub } from "@/components/shared/module-stub";
export default function BOMPage() {
  return <ModuleStub title="Bill of Material" subtitle="Define product assemblies" breadcrumbs={[{ label: "Inventory" }, { label: "Bill of Material" }]} description="Create bill of materials for manufactured or assembled products. Define component items, quantities, and production costs for each finished good." ctaLabel="New BOM" />;
}
