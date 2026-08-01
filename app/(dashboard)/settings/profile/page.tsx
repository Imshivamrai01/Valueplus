"use client";
import { PageShell } from "@/components/shared/page-shell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Save, User } from "lucide-react";
import { toast } from "sonner";
import { useState } from "react";

export default function ProfilePage() {
  const [name, setName] = useState("Admin User");
  const [email, setEmail] = useState("admin@valueplus.in");
  const [phone, setPhone] = useState("9876543210");
  const [role] = useState("Super Administrator");

  return (
    <PageShell title="My Profile" subtitle="Manage your account settings" breadcrumbs={[{ label: "Settings" }, { label: "Profile" }]}>
      <div className="max-w-xl">
        <div className="data-table-container p-6">
          <div className="flex items-center gap-4 mb-6">
            <div className="w-20 h-20 rounded-2xl bg-[#3F63AD] flex items-center justify-center text-white text-2xl font-bold">AD</div>
            <div>
              <p className="font-semibold text-xl">{name}</p>
              <p className="text-muted-foreground text-sm">{role}</p>
              <Button variant="outline" size="sm" className="mt-2" onClick={() => toast.info("Photo upload coming soon")}>Change Photo</Button>
            </div>
          </div>
          <div className="space-y-4">
            <div className="space-y-1.5"><Label>Full Name</Label><Input value={name} onChange={e => setName(e.target.value)} /></div>
            <div className="space-y-1.5"><Label>Email Address</Label><Input type="email" value={email} onChange={e => setEmail(e.target.value)} /></div>
            <div className="space-y-1.5"><Label>Phone Number</Label><Input value={phone} onChange={e => setPhone(e.target.value)} /></div>
            <div className="space-y-1.5"><Label>Role</Label><Input value={role} disabled className="bg-slate-50" /></div>
          </div>
          <div className="mt-6 pt-6 border-t">
            <Button onClick={() => toast.success("Profile updated successfully!")}><Save className="w-4 h-4 mr-2" /> Save Profile</Button>
          </div>
        </div>
      </div>
    </PageShell>
  );
}
