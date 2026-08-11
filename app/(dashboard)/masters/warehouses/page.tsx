"use client";
import { PageShell } from "@/components/shared/page-shell";
import { Button } from "@/components/ui/button";
import { Plus, Warehouse, MapPin, Phone } from "lucide-react";
import { useState, useEffect } from "react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";

export default function WarehousesPage() {
  const [warehouses, setWarehouses] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    code: "",
    address: "",
    city: "Mumbai",
    state: "Maharashtra",
    contact: "",
    phone: "",
  });

  const fetchWarehouses = async () => {
    try {
      const res = await fetch("/api/warehouses");
      const json = await res.json();
      if (json.success) setWarehouses(json.data);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchWarehouses();
  }, []);

  const handleSave = async () => {
    if (!formData.name || !formData.phone) {
      toast.error("Please fill Warehouse Name and Phone");
      return;
    }

    const newWh = {
      code: formData.code || `WH-${formData.city.substring(0, 3).toUpperCase()}`,
      name: formData.name,
      address: formData.address || "Industrial Area",
      city: formData.city,
      state: formData.state,
      contactPerson: formData.contact || "Store Manager",
      phone: formData.phone.startsWith("+91") ? formData.phone : `+91 ${formData.phone}`,
      email: formData.name.replace(/\s+/g, '').toLowerCase() + "@valueplus.com",
      status: "active",
      isDefault: false,
    };

    try {
      const res = await fetch("/api/warehouses", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newWh)
      });
      const json = await res.json();
      if (json.success) {
        toast.success(`Warehouse "${json.data.name}" added successfully!`);
        setIsFormOpen(false);
        fetchWarehouses();
      } else {
        toast.error(json.error || "Failed to add warehouse");
      }
    } catch (error) {
      toast.error("An error occurred");
    }
  };

  return (
    <PageShell title="Warehouses & Outlets" subtitle={`${warehouses.length} active locations`} breadcrumbs={[{ label: "Masters" }, { label: "Warehouses" }]}
      actions={<Button size="sm" onClick={() => setIsFormOpen(true)}><Plus className="w-4 h-4 mr-1.5" /> Add Warehouse</Button>}>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {loading ? <p className="p-4 text-muted-foreground">Loading...</p> : warehouses.map(wh => (
          <div key={wh._id || wh.id} className="metric-card">
            <div className="flex items-start justify-between mb-3">
              <div className="flex items-center gap-3">
                <div className="w-11 h-11 rounded-2xl bg-[#3F63AD]/10 flex items-center justify-center">
                  <Warehouse className="w-5 h-5 text-[#3F63AD]" />
                </div>
                <div>
                  <p className="font-semibold text-foreground">{wh.name}</p>
                  <p className="text-xs font-mono text-muted-foreground">{wh.code}</p>
                </div>
              </div>
              <div className="flex items-center gap-1.5">
                {wh.isDefault && <Badge variant="info">Default</Badge>}
                <Badge variant="success">Active</Badge>
              </div>
            </div>
            <div className="space-y-1.5 text-sm">
              <div className="flex items-start gap-2 text-muted-foreground">
                <MapPin className="w-3.5 h-3.5 mt-0.5 flex-shrink-0" />
                <span>{wh.address}, {wh.city}, {wh.state}</span>
              </div>
              <div className="flex items-center gap-2 text-muted-foreground">
                <Phone className="w-3.5 h-3.5 flex-shrink-0" />
                <span>{wh.contactPerson || wh.contact} · <a href={`tel:${wh.phone}`} className="text-blue-600 hover:underline font-medium">{wh.phone}</a></span>
              </div>
            </div>
            <div className="mt-4 pt-4 border-t flex items-center justify-between">
              <div>
                <p className="text-2xl font-bold text-foreground">{wh.items || 0}</p>
                <p className="text-xs text-muted-foreground">Total SKUs</p>
              </div>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" className="text-red-500" onClick={() => { setWarehouses(prev => prev.filter(x => x._id !== wh._id)); toast.success("Warehouse removed locally (API not implemented)"); }}>Delete</Button>
              </div>
            </div>
          </div>
        ))}
      </div>

      <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
        <DialogContent className="max-w-2xl p-0 rounded-2xl border-none shadow-2xl overflow-hidden">
          {/* Header */}
          <div className="bg-gradient-to-r from-[#1B2537] via-[#2C3E5A] to-[#1B2537] text-white p-6 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl bg-white/10 flex items-center justify-center backdrop-blur-md border border-white/20">
                <Warehouse className="w-6 h-6 text-[#76C043]" />
              </div>
              <div>
                <h3 className="text-xl font-bold tracking-tight">Add Warehouse / Store Outlet</h3>
                <p className="text-xs text-slate-300 mt-0.5">
                  Register new store showroom location or regional distribution hub
                </p>
              </div>
            </div>
          </div>

          <div className="p-6 space-y-4 bg-slate-50/50">
            <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-1.5 md:col-span-2">
                  <Label className="text-xs font-semibold text-slate-700">Store / Warehouse Name *</Label>
                  <Input
                    placeholder="e.g. Prayagraj Showroom & Hub"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="bg-slate-50 border-slate-300"
                  />
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold text-slate-700">Store Code</Label>
                  <Input
                    placeholder="WH-PRY"
                    value={formData.code}
                    onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                    className="bg-slate-50 border-slate-300 font-mono"
                  />
                </div>

                <div className="space-y-1.5 md:col-span-3">
                  <Label className="text-xs font-semibold text-slate-700">Full Address Location</Label>
                  <Input
                    placeholder="18, Civil Lines, Near Subhash Chauraha"
                    value={formData.address}
                    onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                    className="bg-slate-50 border-slate-300"
                  />
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold text-slate-700">City</Label>
                  <Input
                    value={formData.city}
                    onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                    className="bg-slate-50 border-slate-300"
                  />
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold text-slate-700">State</Label>
                  <Input
                    value={formData.state}
                    onChange={(e) => setFormData({ ...formData, state: e.target.value })}
                    className="bg-slate-50 border-slate-300"
                  />
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold text-slate-700">Store Manager Name</Label>
                  <Input
                    placeholder="Ravi Kumar"
                    value={formData.contact}
                    onChange={(e) => setFormData({ ...formData, contact: e.target.value })}
                    className="bg-slate-50 border-slate-300"
                  />
                </div>

                <div className="space-y-1.5 md:col-span-3">
                  <Label className="text-xs font-semibold text-slate-700">Store Contact Phone *</Label>
                  <div className="flex items-center">
                    <span className="flex items-center justify-center bg-slate-100 border border-r-0 border-slate-300 rounded-l-md h-9 px-3 text-sm font-medium text-slate-600">+91</span>
                    <Input
                      placeholder="9876543210"
                      value={formData.phone}
                      maxLength={10}
                      onKeyDown={(e) => ["-", "+", "e", "E", "."].includes(e.key) && e.preventDefault()}
                      onChange={(e) => setFormData({ ...formData, phone: e.target.value.replace(/\D/g, '').slice(0, 10) })}
                      className="bg-slate-50 border-slate-300 font-mono rounded-l-none"
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-slate-100 px-6 py-4 rounded-b-2xl border-t border-slate-200 flex items-center justify-end gap-3">
            <Button variant="outline" onClick={() => setIsFormOpen(false)} className="px-5">
              Cancel
            </Button>
            <Button onClick={handleSave} className="bg-[#3F63AD] hover:bg-[#2E4F95] text-white px-6 font-bold shadow-lg shadow-[#3F63AD]/20">
              Save & Create Warehouse
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </PageShell>
  );
}


