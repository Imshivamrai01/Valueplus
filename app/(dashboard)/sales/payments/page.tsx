"use client";
import { ModuleStub } from "@/components/shared/module-stub";
export default function ReceivePaymentPage() {
  return <ModuleStub title="Receive Payment" subtitle="Record customer payments" breadcrumbs={[{ label: "Sales" }, { label: "Receive Payment" }]} description="Record incoming payments from customers. Support multiple payment modes including cash, bank transfer, UPI, and cheque." ctaLabel="Record Payment" />;
}
