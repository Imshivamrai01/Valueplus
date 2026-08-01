"use client";
import { PageShell } from "@/components/shared/page-shell";
import { Button } from "@/components/ui/button";
import { Plus, Award } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";

const BRANDS_DATA = [
  { id: "1", name: "Apple", description: "Premium computing and mobile hardware", items: 42, status: "active" },
  { id: "2", name: "Samsung", description: "Mobiles, TVs, and home appliances", items: 88, status: "active" },
  { id: "3", name: "Sony", description: "Electronics, audio, and displays", items: 29, status: "active" },
  { id: "4", name: "Dell", description: "Laptops and desktop computing", items: 67, status: "active" },
  { id: "5", name: "HP", description: "Laptops, printers, and accessories", items: 53, status: "active" },
  { id: "6", name: "Lenovo", description: "Laptops and workstations", items: 42, status: "active" },
  { id: "7", name: "LG", description: "Televisions and home appliances", items: 38, status: "active" },
  { id: "8", name: "Asus", description: "Laptops, motherboards, and networking", items: 21, status: "active" },
  { id: "9", name: "Boat", description: "Audio and wearables", items: 34, status: "active" },
  { id: "10", name: "OnePlus", description: "Mobiles and accessories", items: 15, status: "inactive" },
];

export default function BrandsPage() {
  const [brands, setBrands] = useState(BRANDS_DATA);
  return (
    <PageShell title="Brands" subtitle="Manage product brands" breadcrumbs={[{ label: "Masters" }, { label: "Brands" }]}
      actions={<Button size="sm" onClick={() => toast.success("Add brand form opened")}><Plus className="w-4 h-4 mr-1.5" /> Add Brand</Button>}>
      <div className="data-table-container">
        <div className="p-4 border-b font-semibold text-sm">All Brands ({brands.length})</div>
        <div className="divide-y">
          {brands.map((b) => (
            <div key={b.id} className="flex items-center gap-4 px-4 py-3.5 hover:bg-slate-50 transition-colors">
              <div className="w-10 h-10 rounded-xl bg-[#3F63AD]/10 flex items-center justify-center font-bold text-[#3F63AD]">{b.name.charAt(0)}</div>
              <div className="flex-1">
                <p className="font-semibold">{b.name}</p>
                <p className="text-xs text-muted-foreground">{b.description}</p>
              </div>
              <span className="text-sm text-muted-foreground">{b.items} items</span>
              <Badge variant={b.status === "active" ? "success" : "secondary"}>{b.status}</Badge>
              <div className="flex gap-1">
                <Button variant="ghost" size="sm" onClick={() => toast.info(`Editing ${b.name}`)}>Edit</Button>
                <Button variant="ghost" size="sm" className="text-red-500 hover:bg-red-50" onClick={() => { setBrands(x => x.filter(i => i.id !== b.id)); toast.success("Brand deleted"); }}>Delete</Button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </PageShell>
  );
}
