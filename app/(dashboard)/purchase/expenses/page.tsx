"use client";
import { ModuleStub } from "@/components/shared/module-stub";
export default function ExpensesPage() {
  return <ModuleStub title="Expenses" subtitle="Track business expenses" breadcrumbs={[{ label: "Purchase" }, { label: "Expenses" }]} description="Record and categorize all business expenses. Track travel, utilities, rent, salaries, and other operational costs with GST compliance." ctaLabel="Add Expense" />;
}
