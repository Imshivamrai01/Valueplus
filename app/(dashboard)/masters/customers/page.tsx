"use client";
import { useState, useMemo } from "react";
import { PageShell } from "@/components/shared/page-shell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Plus, Search, MoreHorizontal, Edit, Eye, Trash2, Users, TrendingUp, IndianRupee } from "lucide-react";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { toast } from "sonner";
import { formatCurrency } from "@/lib/utils";

const STATES = ["Maharashtra","Gujarat","Delhi","Karnataka","Tamil Nadu","Rajasthan","Uttar Pradesh","West Bengal"];
const CUSTOMER_GROUPS = ["Retail","Wholesale","Distributor","Corporate","VIP"];
const CITIES = ["Mumbai","Pune","Ahmedabad","Delhi","Bengaluru","Chennai","Jaipur","Kolkata","Surat","Hyderabad"];

function generateCustomers() {
  const names = ["Sharma Enterprises","Patel Industries","Kapoor Tech","Gupta Electronics","Mehta Trading","Verma Exports","Singh & Sons","Kumar Distributors","Agarwal Holdings","Joshi Retailers","Rao Agencies","Iyer Technologies","Nair Solutions","Menon Brothers","Pillai Traders","Bhat Enterprises","Hegde Agencies","Gowda Industries","Sethi Group","Malhotra Ventures"];
  return names.map((name, i) => ({
    id: String(i + 1),
    code: `CUST-${String(i + 1).padStart(4,"0")}`,
    name: `${name} Pvt Ltd`,
    email: `billing@${name.split(" ")[0].toLowerCase()}.in`,
    phone: `98${String(Math.floor(10000000 + Math.random() * 89999999))}`,
    city: CITIES[i % CITIES.length],
    state: STATES[i % STATES.length],
    gst: `27AA${name.substring(0,4).toUpperCase()}1234A1Z${i%9}`,
    group: CUSTOMER_GROUPS[i % CUSTOMER_GROUPS.length],
    outstanding: Math.round(Math.random() * 200000),
    creditLimit: 100000 + Math.floor(Math.random() * 400000),
    status: i < 18 ? "active" : "inactive",
    invoices: Math.floor(3 + Math.random() * 30),
  }));
}

const ALL_CUSTOMERS = generateCustomers();

export default function CustomersPage() {
  const [customers, setCustomers] = useState(ALL_CUSTOMERS);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const PER_PAGE = 10;

  const filtered = useMemo(() => customers.filter(c =>
    !search || c.name.toLowerCase().includes(search.toLowerCase()) || c.code.toLowerCase().includes(search.toLowerCase()) || c.city.toLowerCase().includes(search.toLowerCase())
  ), [customers, search]);

  const paginated = filtered.slice((page-1)*PER_PAGE, page*PER_PAGE);
  const totalPages = Math.ceil(filtered.length / PER_PAGE);

  return (
    <PageShell title="Customers" subtitle={`${customers.length} customers`} breadcrumbs={[{ label: "Masters" }, { label: "Customers" }]}
      actions={<Button size="sm" onClick={() => toast.success("Opening customer form...")}><Plus className="w-4 h-4 mr-1.5" /> Add Customer</Button>}>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[{ label:"Total Customers", value:customers.length }, { label:"Active", value:customers.filter(c=>c.status==="active").length }, { label:"Total Outstanding", value:formatCurrency(customers.reduce((a,c)=>a+c.outstanding,0)) }, { label:"New This Month", value:8 }].map(s => (
          <div key={s.label} className="metric-card"><p className="text-2xl font-bold">{s.value}</p><p className="text-xs text-muted-foreground mt-1">{s.label}</p></div>
        ))}
      </div>

      <div className="data-table-container">
        <div className="flex items-center gap-3 p-4 border-b">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input placeholder="Search customers..." value={search} onChange={e => { setSearch(e.target.value); setPage(1); }} className="pl-9" />
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 border-b">
              <tr>{["Customer","Contact","Location","Group","Outstanding","Credit Limit","Status",""].map(h => <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wide">{h}</th>)}</tr>
            </thead>
            <tbody className="divide-y">
              {paginated.map(c => (
                <tr key={c.id} className="hover:bg-slate-50/70 transition-colors">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-xl bg-[#3F63AD]/10 flex items-center justify-center text-[#3F63AD] font-bold text-sm">{c.name.charAt(0)}</div>
                      <div>
                        <p className="font-medium text-foreground">{c.name}</p>
                        <p className="text-xs text-muted-foreground">{c.code}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3"><p className="text-sm">{c.email}</p><p className="text-xs text-muted-foreground">{c.phone}</p></td>
                  <td className="px-4 py-3 text-muted-foreground">{c.city}, {c.state}</td>
                  <td className="px-4 py-3"><Badge variant="info">{c.group}</Badge></td>
                  <td className="px-4 py-3 text-right font-medium text-amber-600">{formatCurrency(c.outstanding)}</td>
                  <td className="px-4 py-3 text-right text-muted-foreground">{formatCurrency(c.creditLimit)}</td>
                  <td className="px-4 py-3"><Badge variant={c.status === "active" ? "success" : "secondary"}>{c.status}</Badge></td>
                  <td className="px-4 py-3">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild><button className="p-1.5 rounded-lg hover:bg-slate-100"><MoreHorizontal className="w-4 h-4 text-muted-foreground" /></button></DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => toast.info(`Viewing ${c.name}`)}><Eye className="w-4 h-4 mr-2" />View</DropdownMenuItem>
                        <DropdownMenuItem onClick={() => toast.info(`Editing ${c.name}`)}><Edit className="w-4 h-4 mr-2" />Edit</DropdownMenuItem>
                        <DropdownMenuItem className="text-red-600" onClick={() => { setCustomers(x => x.filter(i => i.id !== c.id)); toast.success("Customer deleted"); }}><Trash2 className="w-4 h-4 mr-2" />Delete</DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="flex items-center justify-between px-4 py-3 border-t text-sm text-muted-foreground">
          <p>Showing {(page-1)*PER_PAGE+1}–{Math.min(page*PER_PAGE, filtered.length)} of {filtered.length}</p>
          <div className="flex gap-1">
            <button onClick={() => setPage(p => Math.max(1,p-1))} disabled={page===1} className="px-3 py-1.5 rounded-lg border hover:bg-slate-50 disabled:opacity-50">Prev</button>
            {Array.from({length:Math.min(5,totalPages)},(_,i)=>i+1).map(p => <button key={p} onClick={() => setPage(p)} className={`w-8 h-8 rounded-lg text-xs ${page===p?"bg-[#3F63AD] text-white":"hover:bg-slate-100"}`}>{p}</button>)}
            <button onClick={() => setPage(p => Math.min(totalPages,p+1))} disabled={page===totalPages} className="px-3 py-1.5 rounded-lg border hover:bg-slate-50 disabled:opacity-50">Next</button>
          </div>
        </div>
      </div>
    </PageShell>
  );
}
