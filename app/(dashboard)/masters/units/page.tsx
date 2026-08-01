"use client";
import { PageShell } from "@/components/shared/page-shell";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";

const UNITS = [
  { id:"1", name:"Pieces", abbr:"PCS", type:"count", status:"active" },
  { id:"2", name:"Kilograms", abbr:"KG", type:"weight", status:"active" },
  { id:"3", name:"Grams", abbr:"GM", type:"weight", status:"active" },
  { id:"4", name:"Litres", abbr:"LTR", type:"volume", status:"active" },
  { id:"5", name:"Metres", abbr:"MTR", type:"length", status:"active" },
  { id:"6", name:"Box", abbr:"BOX", type:"count", status:"active" },
  { id:"7", name:"Dozen", abbr:"DZN", type:"count", status:"active" },
  { id:"8", name:"Set", abbr:"SET", type:"count", status:"active" },
  { id:"9", name:"Pack", abbr:"PCK", type:"count", status:"active" },
  { id:"10", name:"Pair", abbr:"PR", type:"count", status:"active" },
];

export default function UnitsPage() {
  return (
    <PageShell title="Units of Measurement" subtitle="Manage product units" breadcrumbs={[{ label: "Masters" }, { label: "Units" }]}
      actions={<Button size="sm" onClick={() => toast.success("Add unit form opened")}><Plus className="w-4 h-4 mr-1.5" /> Add Unit</Button>}>
      <div className="data-table-container">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 border-b">
            <tr>{["Unit Name","Abbreviation","Type","Status","Actions"].map(h => <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase">{h}</th>)}</tr>
          </thead>
          <tbody className="divide-y">
            {UNITS.map(u => (
              <tr key={u.id} className="hover:bg-slate-50 transition-colors">
                <td className="px-4 py-3 font-medium">{u.name}</td>
                <td className="px-4 py-3 font-mono font-semibold text-[#3F63AD]">{u.abbr}</td>
                <td className="px-4 py-3 capitalize text-muted-foreground">{u.type}</td>
                <td className="px-4 py-3"><Badge variant="success">Active</Badge></td>
                <td className="px-4 py-3 flex gap-2">
                  <Button variant="ghost" size="sm" onClick={() => toast.info(`Editing ${u.name}`)}>Edit</Button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </PageShell>
  );
}
