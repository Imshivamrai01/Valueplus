"use client";
import { ModuleStub } from "@/components/shared/module-stub";
export default function UsersPage() {
  return <ModuleStub title="Users" subtitle="Manage system users" breadcrumbs={[{ label: "Settings" }, { label: "Users" }]} description="Add and manage users who can access the ValuePlus ERP system. Assign roles, set permissions, and monitor user activity and login history." ctaLabel="Add User" />;
}
