"use client";
import { PageShell } from "@/components/shared/page-shell";
import { Button } from "@/components/ui/button";
import { Plus, Warehouse, MapPin, Phone } from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";

const WAREHOUSES = [
  { id:"1", code:"WH-MUM", name:"Main Warehouse - Mumbai", address:"Plot 45, MIDC Andheri East", city:"Mumbai", state:"Maharashtra", contact:"Ravi Kumar", phone:"9876543210", items:485, status:"active", isDefault:true },
  { id:"2", code:"WH-PUN", name:"Pune Branch", address:"Survey No. 89, Hinjewadi Phase 2", city:"Pune", state:"Maharashtra", contact:"Suresh Patil", phone:"9812345678", items:234, status:"active", isDefault:false },
  { id:"3", code:"WH-DEL", name:"Delhi Hub", address:"Sector 63, Noida Industrial Area", city:"Noida", state:"Uttar Pradesh", contact:"Amit Sharma", phone:"9801234567", items:167, status:"active", isDefault:false },
  { id:"4", code:"WH-BLR", name:"Bengaluru Store", address:"BTM Layout, 2nd Stage", city:"Bengaluru", state:"Karnataka", contact:"Priya Nair", phone:"9890123456", items:98, status:"active", isDefault:false },
];

export default function WarehousesPage() {
  return (
    <PageShell title="Warehouses" subtitle="Manage your warehouse locations" breadcrumbs={[{ label: "Masters" }, { label: "Warehouses" }]}
      actions={<Button size="sm" onClick={() => toast.success("Add warehouse form opened")}><Plus className="w-4 h-4 mr-1.5" /> Add Warehouse</Button>}>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {WAREHOUSES.map(wh => (
          <div key={wh.id} className="metric-card">
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
                <span>{wh.contact} · {wh.phone}</span>
              </div>
            </div>
            <div className="mt-4 pt-4 border-t flex items-center justify-between">
              <div>
                <p className="text-2xl font-bold text-foreground">{wh.items}</p>
                <p className="text-xs text-muted-foreground">Total SKUs</p>
              </div>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={() => toast.info(`Viewing ${wh.name}`)}>View</Button>
                <Button variant="outline" size="sm" onClick={() => toast.info(`Editing ${wh.name}`)}>Edit</Button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </PageShell>
  );
}
