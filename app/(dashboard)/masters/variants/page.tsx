"use client";
import { PageShell } from "@/components/shared/page-shell";
import { Button } from "@/components/ui/button";
import { Plus, Layers } from "lucide-react";
import { useState, useEffect } from "react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";

export default function VariantsPage() {
  const [variants, setVariants] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [formData, setFormData] = useState({ name: "", values: "" });

  const fetchVariants = async () => {
    try {
      const res = await fetch("/api/variants");
      const json = await res.json();
      if (json.success) {
        setVariants(json.data);
      }
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchVariants();
  }, []);

  const handleSave = async () => {
    if (!formData.name || !formData.values) {
      toast.error("Please fill Variant Name and Values");
      return;
    }

    try {
      const res = await fetch("/api/variants", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: formData.name,
          values: formData.values.split(",").map((s) => s.trim()).filter(Boolean),
        })
      });
      const json = await res.json();
      if (json.success) {
        toast.success(`Variant "${json.data.name}" added successfully!`);
        setIsFormOpen(false);
        fetchVariants();
      } else {
        toast.error(json.error || "Failed to save variant");
      }
    } catch (error) {
      console.error(error);
      toast.error("An error occurred");
    }
  };

  return (
    <PageShell title="Variants" subtitle="Manage electronics product attributes & variants" breadcrumbs={[{ label: "Masters" }, { label: "Variants" }]}
      actions={<Button size="sm" onClick={() => setIsFormOpen(true)}><Plus className="w-4 h-4 mr-1.5" /> Add Variant</Button>}>
      <div className="data-table-container divide-y">
        {loading ? (
          <div className="p-8 text-center text-muted-foreground">Loading...</div>
        ) : variants.length === 0 ? (
          <div className="p-8 text-center text-muted-foreground">No variants found</div>
        ) : variants.map(v => (
          <div key={v._id || v.id} className="flex items-center gap-4 px-4 py-4 hover:bg-slate-50 transition-colors">
            <div className="w-10 h-10 rounded-xl bg-[#3F63AD]/10 flex items-center justify-center flex-shrink-0">
              <Layers className="w-5 h-5 text-[#3F63AD]" />
            </div>
            <div className="flex-1">
              <p className="font-semibold text-foreground">{v.name}</p>
              <div className="flex flex-wrap gap-1.5 mt-1.5">
                {v.values.map((val: string) => (
                  <span key={val} className="px-2.5 py-0.5 rounded-full bg-slate-100 text-xs font-medium text-slate-700">{val}</span>
                ))}
              </div>
            </div>
            <Badge variant={v.status === "active" ? "success" : "secondary"}>{v.status}</Badge>
            <Button variant="ghost" size="sm" className="text-red-500" onClick={() => { setVariants(prev => prev.filter(x => (x._id || x.id) !== (v._id || v.id))); toast.success("Variant deleted"); }}>Delete</Button>
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

