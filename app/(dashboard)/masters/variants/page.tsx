"use client";
import { PageShell } from "@/components/shared/page-shell";
import { Button } from "@/components/ui/button";
import { Plus, Layers } from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";

const VARIANTS = [
  { id:"1", name:"Color", values:["Black","White","Silver","Space Grey","Midnight","Starlight"], status:"active" },
  { id:"2", name:"Storage", values:["64GB","128GB","256GB","512GB","1TB","2TB"], status:"active" },
  { id:"3", name:"RAM", values:["4GB","8GB","16GB","32GB","64GB"], status:"active" },
  { id:"4", name:"Screen Size", values:["13\"","14\"","15.6\"","17\"","55\"","65\""], status:"active" },
  { id:"5", name:"Processor", values:["i3","i5","i7","i9","Ryzen 5","Ryzen 7"], status:"active" },
  { id:"6", name:"Warranty", values:["1 Year","2 Years","3 Years","Extended"], status:"active" },
];

export default function VariantsPage() {
  return (
    <PageShell title="Variants" subtitle="Manage product variants" breadcrumbs={[{ label: "Masters" }, { label: "Variants" }]}
      actions={<Button size="sm" onClick={() => toast.success("Add variant form opened")}><Plus className="w-4 h-4 mr-1.5" /> Add Variant</Button>}>
      <div className="data-table-container divide-y">
        {VARIANTS.map(v => (
          <div key={v.id} className="flex items-center gap-4 px-4 py-4 hover:bg-slate-50 transition-colors">
            <div className="w-10 h-10 rounded-xl bg-[#3F63AD]/10 flex items-center justify-center">
              <Layers className="w-5 h-5 text-[#3F63AD]" />
            </div>
            <div className="flex-1">
              <p className="font-semibold">{v.name}</p>
              <div className="flex flex-wrap gap-1.5 mt-1.5">
                {v.values.map(val => (
                  <span key={val} className="px-2 py-0.5 rounded-full bg-slate-100 text-xs font-medium text-slate-600">{val}</span>
                ))}
              </div>
            </div>
            <Badge variant={v.status === "active" ? "success" : "secondary"}>{v.status}</Badge>
            <Button variant="ghost" size="sm" onClick={() => toast.info(`Editing ${v.name}`)}>Edit</Button>
          </div>
        ))}
      </div>
    </PageShell>
  );
}
