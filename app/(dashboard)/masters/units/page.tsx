"use client";
import { PageShell } from "@/components/shared/page-shell";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";

const INITIAL_UNITS = [
  { id: "1", name: "Pieces", abbr: "PCS", type: "count", status: "active" },
  { id: "2", name: "Numbers", abbr: "NOS", type: "count", status: "active" },
  { id: "3", name: "Box", abbr: "BOX", type: "count", status: "active" },
  { id: "4", name: "Set", abbr: "SET", type: "count", status: "active" },
  { id: "5", name: "Pack / Packet", abbr: "PKT", type: "count", status: "active" },
  { id: "6", name: "Pair", abbr: "PR", type: "count", status: "active" },
  { id: "7", name: "Unit", abbr: "UNT", type: "count", status: "active" },
  { id: "8", name: "Meter", abbr: "MTR", type: "length", status: "active" },
];

export default function UnitsPage() {
  const [units, setUnits] = useState(INITIAL_UNITS);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [formData, setFormData] = useState({ name: "", abbr: "", type: "count" });

  const handleSave = () => {
    if (!formData.name || !formData.abbr) {
      toast.error("Please fill Unit Name and Abbreviation");
      return;
    }

    const newUnit = {
      id: String(Date.now()),
      name: formData.name,
      abbr: formData.abbr.toUpperCase(),
      type: formData.type,
      status: "active",
    };

    setUnits([...units, newUnit]);
    toast.success(`Unit "${newUnit.name}" added successfully!`);
    setIsFormOpen(false);
  };

  return (
    <PageShell title="Units of Measurement" subtitle="Manage electronics product units" breadcrumbs={[{ label: "Masters" }, { label: "Units" }]}
      actions={<Button size="sm" onClick={() => setIsFormOpen(true)}><Plus className="w-4 h-4 mr-1.5" /> Add Unit</Button>}>
      <div className="data-table-container">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 border-b">
            <tr>{["Unit Name","Abbreviation","Type","Status","Actions"].map(h => <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase">{h}</th>)}</tr>
          </thead>
          <tbody className="divide-y">
            {units.map(u => (
              <tr key={u.id} className="hover:bg-slate-50 transition-colors">
                <td className="px-4 py-3 font-medium">{u.name}</td>
                <td className="px-4 py-3 font-mono font-semibold text-[#3F63AD]">{u.abbr}</td>
                <td className="px-4 py-3 capitalize text-muted-foreground">{u.type}</td>
                <td className="px-4 py-3"><Badge variant="success">Active</Badge></td>
                <td className="px-4 py-3 flex gap-2">
                  <Button variant="ghost" size="sm" className="text-red-500" onClick={() => { setUnits(prev => prev.filter(x => x.id !== u.id)); toast.success("Unit deleted"); }}>Delete</Button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Add New Unit of Measurement</DialogTitle>
            <DialogDescription>Define a unit for measuring products</DialogDescription>
          </DialogHeader>

          <div className="space-y-3 py-2">
            <div className="space-y-1.5">
              <Label>Unit Name *</Label>
              <Input placeholder="e.g. Carton" value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} />
            </div>
            <div className="space-y-1.5">
              <Label>Abbreviation *</Label>
              <Input placeholder="CTN" value={formData.abbr} onChange={(e) => setFormData({ ...formData, abbr: e.target.value })} />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsFormOpen(false)}>Cancel</Button>
            <Button onClick={handleSave}>Add Unit</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </PageShell>
  );
}

