"use client";
import { useState, useMemo } from "react";
import { PageShell } from "@/components/shared/page-shell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Plus, Search, MoreHorizontal, Edit, Eye, Trash2 } from "lucide-react";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { toast } from "sonner";
import { formatCurrency } from "@/lib/utils";

const SUPPLIER_NAMES = ["Rahul Electronics","Techno Traders","National Components","Global Supplies","Prime Distributors","Alpha Electronics","Beta Tech","Gamma Imports","Delta Wholesale","Epsilon Goods","Sigma Supply","Omega Traders","Apex Merchants","Zenith Corporation","Summit Distributors"];

function generateSuppliers() {
  return SUPPLIER_NAMES.map((name, i) => ({
    id: String(i + 1),
    code: `SUPP-${String(i + 1).padStart(4,"0")}`,
    name: `${name} Pvt Ltd`,
    email: `purchase@${name.split(" ")[0].toLowerCase()}.com`,
    phone: `98${String(Math.floor(10000000 + Math.random() * 89999999))}`,
    city: ["Mumbai","Pune","Delhi","Chennai","Bengaluru","Hyderabad"][i%6],
    state: ["Maharashtra","Maharashtra","Delhi","Tamil Nadu","Karnataka","Telangana"][i%6],
    gst: `27AABS${String(i).padStart(4,"0")}1Z5`,
    outstanding: Math.round(Math.random() * 500000),
    creditLimit: 200000 + Math.floor(Math.random() * 800000),
    status: i < 13 ? "active" : "inactive",
    bills: Math.floor(2 + Math.random() * 25),
  }));
}

const ALL_SUPPLIERS = generateSuppliers();

export default function SuppliersPage() {
  const [suppliers, setSuppliers] = useState(ALL_SUPPLIERS);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const PER_PAGE = 10;
  const filtered = useMemo(() => suppliers.filter(s => !search || s.name.toLowerCase().includes(search.toLowerCase()) || s.code.toLowerCase().includes(search.toLowerCase())), [suppliers, search]);
  const paginated = filtered.slice((page-1)*PER_PAGE, page*PER_PAGE);
  const totalPages = Math.ceil(filtered.length / PER_PAGE);

  return (
    <PageShell title="Suppliers" subtitle={`${suppliers.length} suppliers`} breadcrumbs={[{ label: "Masters" }, { label: "Suppliers" }]}
      actions={<Button size="sm" onClick={() => toast.success("Opening supplier form...")}><Plus className="w-4 h-4 mr-1.5" /> Add Supplier</Button>}>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[{label:"Total Suppliers",value:suppliers.length},{label:"Active",value:suppliers.filter(s=>s.status==="active").length},{label:"Total Payables",value:formatCurrency(suppliers.reduce((a,s)=>a+s.outstanding,0))},{label:"Overdue Bills",value:4}].map(s=>(
          <div key={s.label} className="metric-card"><p className="text-2xl font-bold">{s.value}</p><p className="text-xs text-muted-foreground mt-1">{s.label}</p></div>
        ))}
      </div>
      <div className="data-table-container">
        <div className="flex items-center gap-3 p-4 border-b">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input placeholder="Search suppliers..." value={search} onChange={e=>{setSearch(e.target.value);setPage(1);}} className="pl-9" />
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 border-b">
              <tr>{["Supplier","Contact","Location","Outstanding","Credit Limit","Status",""].map(h=><th key={h} className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase">{h}</th>)}</tr>
            </thead>
            <tbody className="divide-y">
              {paginated.map(s=>(
                <tr key={s.id} className="hover:bg-slate-50/70 transition-colors">
                  <td className="px-4 py-3"><div className="flex items-center gap-3"><div className="w-9 h-9 rounded-xl bg-[#3F63AD]/10 flex items-center justify-center font-bold text-[#3F63AD]">{s.name.charAt(0)}</div><div><p className="font-medium">{s.name}</p><p className="text-xs text-muted-foreground">{s.code}</p></div></div></td>
                  <td className="px-4 py-3"><p>{s.email}</p><p className="text-xs text-muted-foreground">{s.phone}</p></td>
                  <td className="px-4 py-3 text-muted-foreground">{s.city}, {s.state}</td>
                  <td className="px-4 py-3 text-right font-medium text-amber-600">{formatCurrency(s.outstanding)}</td>
                  <td className="px-4 py-3 text-right text-muted-foreground">{formatCurrency(s.creditLimit)}</td>
                  <td className="px-4 py-3"><Badge variant={s.status==="active"?"success":"secondary"}>{s.status}</Badge></td>
                  <td className="px-4 py-3">
                    <DropdownMenu><DropdownMenuTrigger asChild><button className="p-1.5 rounded-lg hover:bg-slate-100"><MoreHorizontal className="w-4 h-4 text-muted-foreground" /></button></DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={()=>toast.info(`Viewing ${s.name}`)}><Eye className="w-4 h-4 mr-2"/>View</DropdownMenuItem>
                        <DropdownMenuItem onClick={()=>toast.info(`Editing ${s.name}`)}><Edit className="w-4 h-4 mr-2"/>Edit</DropdownMenuItem>
                        <DropdownMenuItem className="text-red-600" onClick={()=>{setSuppliers(x=>x.filter(i=>i.id!==s.id));toast.success("Supplier deleted");}}><Trash2 className="w-4 h-4 mr-2"/>Delete</DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="flex items-center justify-between px-4 py-3 border-t text-sm text-muted-foreground">
          <p>Showing {(page-1)*PER_PAGE+1}–{Math.min(page*PER_PAGE,filtered.length)} of {filtered.length}</p>
          <div className="flex gap-1">
            <button onClick={()=>setPage(p=>Math.max(1,p-1))} disabled={page===1} className="px-3 py-1.5 rounded-lg border hover:bg-slate-50 disabled:opacity-50">Prev</button>
            {Array.from({length:Math.min(5,totalPages)},(_,i)=>i+1).map(p=><button key={p} onClick={()=>setPage(p)} className={`w-8 h-8 rounded-lg text-xs ${page===p?"bg-[#3F63AD] text-white":"hover:bg-slate-100"}`}>{p}</button>)}
            <button onClick={()=>setPage(p=>Math.min(totalPages,p+1))} disabled={page===totalPages} className="px-3 py-1.5 rounded-lg border hover:bg-slate-50 disabled:opacity-50">Next</button>
          </div>
        </div>
      </div>
    </PageShell>
  );
}
