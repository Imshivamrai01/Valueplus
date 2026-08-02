"use client";
import { PageShell } from "@/components/shared/page-shell";
import { Button } from "@/components/ui/button";
import { Plus, Layers } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";

const INITIAL_VARIANTS = [
  { id: "1", name: "Color", values: ["Black", "White", "Silver", "Space Grey", "Midnight", "Starlight"], status: "active" },
  { id: "2", name: "Storage", values: ["64GB", "128GB", "256GB", "512GB", "1TB", "2TB"], status: "active" },
  { id: "3", name: "RAM", values: ["4GB", "8GB", "16GB", "32GB", "64GB"], status: "active" },
  { id: "4", name: "Screen Size", values: ["13\"", "14\"", "15.6\"", "17\"", "55\"", "65\""], status: "active" },
  { id: "5", name: "Processor", values: ["Apple M3", "Intel i5", "Intel i7", "Intel i9", "Ryzen 7"], status: "active" },
  { id: "6", name: "Warranty", values: ["1 Year Brand Warranty", "2 Years Extended Warranty", "6 Months Seller Warranty"], status: "active" },
];

export default function VariantsPage() {
  const [variants, setVariants] = useState(INITIAL_VARIANTS);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [formData, setFormData] = useState({ name: "", values: "" });

  const handleSave = () => {
    if (!formData.name || !formData.values) {
      toast.error("Please fill Variant Name and Values");
      return;
    }

    const newVar = {
      id: String(Date.now()),
      name: formData.name,
      values: formData.values.split(",").map((s) => s.trim()).filter(Boolean),
      status: "active",
    };

    setVariants([...variants, newVar]);
    toast.success(`Variant "${newVar.name}" added successfully!`);
    setIsFormOpen(false);
  };

  return (
    <PageShell title="Variants" subtitle="Manage electronics product attributes & variants" breadcrumbs={[{ label: "Masters" }, { label: "Variants" }]}
      actions={<Button size="sm" onClick={() => setIsFormOpen(true)}><Plus className="w-4 h-4 mr-1.5" /> Add Variant</Button>}>
      <div className="data-table-container divide-y">
        {variants.map(v => (
          <div key={v.id} className="flex items-center gap-4 px-4 py-4 hover:bg-slate-50 transition-colors">
            <div className="w-10 h-10 rounded-xl bg-[#3F63AD]/10 flex items-center justify-center flex-shrink-0">
              <Layers className="w-5 h-5 text-[#3F63AD]" />
            </div>
            <div className="flex-1">
              <p className="font-semibold text-foreground">{v.name}</p>
              <div className="flex flex-wrap gap-1.5 mt-1.5">
                {v.values.map(val => (
                  <span key={val} className="px-2.5 py-0.5 rounded-full bg-slate-100 text-xs font-medium text-slate-700">{val}</span>
                ))}
              </div>
            </div>
            <Badge variant={v.status === "active" ? "success" : "secondary"}>{v.status}</Badge>
            <Button variant="ghost" size="sm" className="text-red-500" onClick={() => { setVariants(prev => prev.filter(x => x.id !== v.id)); toast.success("Variant deleted"); }}>Delete</Button>
          </div>
        ))}
      </div>

      <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Add Product Variant Attribute</DialogTitle>
            <DialogDescription>Define a new variant type (e.g. Storage, Network, Battery Capacity)</DialogDescription>
          </DialogHeader>

          <div className="space-y-3 py-2">
            <div className="space-y-1.5">
              <Label>Variant Attribute Name *</Label>
              <Input placeholder="e.g. Battery Capacity" value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} />
            </div>
            <div className="space-y-1.5">
              <Label>Values (Comma separated) *</Label>
              <Input placeholder="e.g. 4000mAh, 5000mAh, 6000mAh" value={formData.values} onChange={(e) => setFormData({ ...formData, values: e.target.value })} />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsFormOpen(false)}>Cancel</Button>
            <Button onClick={handleSave}>Add Variant</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </PageShell>
  );
}

