"use client";
import { PageShell } from "@/components/shared/page-shell";
import { Button } from "@/components/ui/button";
import { Plus, Tag } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";

const INITIAL_CATEGORIES = [
  { id: "1", name: "Smartphones", description: "Mobiles and accessories", items: 145, status: "active" },
  { id: "2", name: "Laptops & PCs", description: "Laptops, desktops, and workstations", items: 98, status: "active" },
  { id: "3", name: "Televisions", description: "LED, OLED, and Smart TVs", items: 34, status: "active" },
  { id: "4", name: "Home Appliances", description: "ACs, Refrigerators, Washing Machines", items: 67, status: "active" },
  { id: "5", name: "Audio", description: "Headphones, speakers, soundbars", items: 28, status: "active" },
  { id: "6", name: "Storage", description: "Hard drives, SSDs, and storage media", items: 42, status: "active" },
  { id: "7", name: "Peripherals", description: "Keyboards, mice, and input devices", items: 56, status: "active" },
  { id: "8", name: "Cables & Connectors", description: "All types of cables and connectors", items: 89, status: "inactive" },
];

export default function CategoriesPage() {
  const [categories, setCategories] = useState(INITIAL_CATEGORIES);

  return (
    <PageShell
      title="Categories"
      subtitle="Organize your items into categories"
      breadcrumbs={[{ label: "Masters", href: "/masters/items" }, { label: "Categories" }]}
      actions={
        <Button size="sm" onClick={() => toast.success("Category form opened")}>
          <Plus className="w-4 h-4 mr-1.5" /> Add Category
        </Button>
      }
    >
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[{ label: "Total", value: categories.length }, { label: "Active", value: categories.filter(c => c.status === "active").length }, { label: "Total Items", value: categories.reduce((a, c) => a + c.items, 0) }, { label: "Inactive", value: categories.filter(c => c.status === "inactive").length }].map((s) => (
          <div key={s.label} className="metric-card">
            <p className="text-2xl font-bold">{s.value}</p>
            <p className="text-xs text-muted-foreground mt-1">{s.label}</p>
          </div>
        ))}
      </div>

      <div className="data-table-container">
        <div className="p-4 border-b font-semibold text-sm">All Categories ({categories.length})</div>
        <div className="divide-y">
          {categories.map((cat) => (
            <div key={cat.id} className="flex items-center gap-4 px-4 py-3.5 hover:bg-slate-50 transition-colors">
              <div className="w-10 h-10 rounded-xl bg-[#3F63AD]/10 flex items-center justify-center flex-shrink-0">
                <Tag className="w-5 h-5 text-[#3F63AD]" />
              </div>
              <div className="flex-1">
                <p className="font-semibold text-foreground">{cat.name}</p>
                <p className="text-xs text-muted-foreground">{cat.description}</p>
              </div>
              <div className="text-sm text-muted-foreground">{cat.items} items</div>
              <Badge variant={cat.status === "active" ? "success" : "secondary"}>{cat.status === "active" ? "Active" : "Inactive"}</Badge>
              <div className="flex gap-1">
                <Button variant="ghost" size="sm" onClick={() => toast.success(`Editing ${cat.name}`)}>Edit</Button>
                <Button variant="ghost" size="sm" className="text-red-500 hover:text-red-600 hover:bg-red-50" onClick={() => { setCategories(c => c.filter(x => x.id !== cat.id)); toast.success("Category deleted"); }}>Delete</Button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </PageShell>
  );
}
