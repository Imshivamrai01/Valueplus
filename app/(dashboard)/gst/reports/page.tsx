"use client";

import { useMemo, useState } from "react";
import { PageShell } from "@/components/shared/page-shell";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { ArrowUpRight, ArrowDownRight, Calculator } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { TableShimmer } from "@/components/shared/shimmer-skeleton";
import { ExportMenu } from "@/components/shared/ExportMenu";

const MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

function monthLabel(date: Date): string {
  return `${MONTH_NAMES[date.getMonth()]} ${date.getFullYear()}`;
}

/**
 * GSTR-1 (Sales) and GSTR-2 (Purchases) below use the SAME column set the
 * admin's own Tally Sales Register export uses — same header text (including
 * its "IGST Outwad" typo) — so a row here drops straight into whatever
 * filing workflow that sheet already fits into, and the exported .xlsx keeps
 * every one of those columns rather than a trimmed-down summary. An HSN
 * Code column is added on top (not part of the original sheet) since a GST
 * return needs it per product and this ERP already knows each item's code.
 */

const money = (n: unknown) => `₹${(Number(n) || 0).toLocaleString("en-IN")}`;

export default function GSTReportsPage() {
  // Today's own month — always a valid, immediately-useful starting point
  // (the old hardcoded "August 2026" stayed stuck there forever, so every
  // invoice/bill raised in a later month never showed up until the admin
  // happened to notice the dropdown was out of date).
  const [period, setPeriod] = useState(() => monthLabel(new Date()));
  const [activeTab, setActiveTab] = useState<"gstr3b" | "gstr1" | "gstr2">("gstr3b");

  const { data: gstr1 = [], isLoading: loadingGstr1 } = useQuery({
    queryKey: ["gstr-reports", "GSTR1"],
    queryFn: async () => {
      const res = await fetch("/api/gstr-reports?type=GSTR1");
      const json = await res.json();
      return json.success ? json.data : [];
    }
  });

  const { data: gstr2 = [], isLoading: loadingGstr2 } = useQuery({
    queryKey: ["gstr-reports", "GSTR2"],
    queryFn: async () => {
      const res = await fetch("/api/gstr-reports?type=GSTR2");
      const json = await res.json();
      return json.success ? json.data : [];
    }
  });

  // Every month that actually has a Sales or Purchase record, newest first —
  // replaces the old fixed Aug/Jul/Jun list, which silently hid any period
  // outside those three (including whichever month it actually is today).
  // The current month is always present even with zero records yet, so
  // there's never a dropdown with nothing selectable.
  const availablePeriods = useMemo(() => {
    const months = new Set<string>([monthLabel(new Date())]);
    const addDate = (raw: string) => {
      const d = new Date(raw);
      if (!isNaN(d.getTime())) months.add(monthLabel(d));
    };
    gstr1.forEach((r: any) => r["Inv Date"] && addDate(r["Inv Date"]));
    gstr2.forEach((r: any) => r["Bill Date"] && addDate(r["Bill Date"]));
    return Array.from(months).sort((a, b) => {
      const da = new Date(`1 ${a}`).getTime();
      const db = new Date(`1 ${b}`).getTime();
      return db - da;
    });
  }, [gstr1, gstr2]);

  const parsePeriod = (p: string) => {
    const [month, year] = p.split(" ");
    const monthIndex = new Date(`${month} 1, 2000`).getMonth();
    return { month: monthIndex, year: parseInt(year) };
  };

  const selectedFilter = parsePeriod(period);

  const filterByPeriod = (data: any[], dateKey: string) => {
    return data.filter((row: any) => {
      const d = new Date(row[dateKey]);
      if (isNaN(d.getTime())) return false;
      return d.getMonth() === selectedFilter.month && d.getFullYear() === selectedFilter.year;
    });
  };

  const filteredGstr1 = filterByPeriod(gstr1, "Inv Date");
  const filteredGstr2 = filterByPeriod(gstr2, "Bill Date");

  // Calculations for GSTR-3B — each row's own CGST/SGST/IGST columns summed,
  // there's no longer a single pre-combined "totalTax" field on the row.
  const totalSalesAmount = filteredGstr1.reduce((acc: number, r: any) => acc + (Number(r.Gross) || 0), 0);
  const gstr1Cgst = filteredGstr1.reduce((a: number, r: any) => a + (Number(r["Output CGST @9%"]) || 0), 0);
  const gstr1Sgst = filteredGstr1.reduce((a: number, r: any) => a + (Number(r["Output SGST @9%"]) || 0), 0);
  const gstr1Igst = filteredGstr1.reduce((a: number, r: any) => a + (Number(r["Output IGST @18%"]) || 0), 0);
  const totalOutputTax = gstr1Cgst + gstr1Sgst + gstr1Igst;

  const totalPurchaseAmount = filteredGstr2.reduce((acc: number, r: any) => acc + (Number(r.Gross) || 0), 0);
  const gstr2Cgst = filteredGstr2.reduce((a: number, r: any) => a + (Number(r["Input CGST @9%"]) || 0), 0);
  const gstr2Sgst = filteredGstr2.reduce((a: number, r: any) => a + (Number(r["Input SGST @9%"]) || 0), 0);
  const gstr2Igst = filteredGstr2.reduce((a: number, r: any) => a + (Number(r["Input IGST @18%"]) || 0), 0);
  const totalInputTax = gstr2Cgst + gstr2Sgst + gstr2Igst;

  const netGstPayable = totalOutputTax - totalInputTax;

  // Export always reflects whichever tab is open, never a merged blob of
  // two differently-shaped registers — Sales and Purchases keep their own
  // column sets exactly as the reference sheet does.
  const exportConfig =
    activeTab === "gstr2"
      ? { data: filteredGstr2, filename: "gst_purchase_register", title: "GST Purchase Register (GSTR-2)" }
      : { data: filteredGstr1, filename: "gst_sales_register", title: "GST Sales Register (GSTR-1)" };

  return (
    <PageShell
      title="GST Reports"
      subtitle="GSTR-1, GSTR-2, and GSTR-3B filings"
      breadcrumbs={[{ label: "GST" }, { label: "Reports" }]}
      actions={
        <div className="flex items-center gap-3">
          <select
            value={period}
            onChange={(e) => setPeriod(e.target.value)}
            className="h-9 px-3 py-1 rounded-lg border border-border bg-white text-sm focus:outline-none focus:ring-2 focus:ring-[#3F63AD]"
          >
            {availablePeriods.map((p) => (
              <option key={p} value={p}>{p}</option>
            ))}
          </select>
          <ExportMenu
            size="sm"
            title={exportConfig.title}
            subtitle={`${period} · ${exportConfig.data.length} records`}
            data={exportConfig.data}
            filename={exportConfig.filename}
          />
        </div>
      }
    >
      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as typeof activeTab)} className="w-full">
        <TabsList className="grid w-full max-w-md grid-cols-3 mb-6 bg-slate-100 p-1">
          <TabsTrigger value="gstr3b" className="rounded-lg data-[state=active]:bg-white data-[state=active]:shadow-sm">GSTR-3B (Summary)</TabsTrigger>
          <TabsTrigger value="gstr1" className="rounded-lg data-[state=active]:bg-white data-[state=active]:shadow-sm">GSTR-1 (Sales)</TabsTrigger>
          <TabsTrigger value="gstr2" className="rounded-lg data-[state=active]:bg-white data-[state=active]:shadow-sm">GSTR-2 (Purchases)</TabsTrigger>
        </TabsList>

        <TabsContent value="gstr3b" className="space-y-6">
          <div className="grid lg:grid-cols-3 gap-6">
            <div className="bg-white rounded-2xl border p-6 flex flex-col justify-between">
              <div>
                <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center mb-4">
                  <ArrowUpRight className="w-5 h-5" />
                </div>
                <p className="text-sm font-medium text-muted-foreground">Output Tax (GSTR-1)</p>
                <h3 className="text-3xl font-bold mt-1">{money(totalOutputTax)}</h3>
              </div>
              <p className="text-xs text-muted-foreground mt-4 border-t pt-4">Total Tax Collected from Customers</p>
            </div>

            <div className="bg-white rounded-2xl border p-6 flex flex-col justify-between">
              <div>
                <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center mb-4">
                  <ArrowDownRight className="w-5 h-5" />
                </div>
                <p className="text-sm font-medium text-muted-foreground">Input Tax Credit (GSTR-2)</p>
                <h3 className="text-3xl font-bold mt-1">{money(totalInputTax)}</h3>
              </div>
              <p className="text-xs text-muted-foreground mt-4 border-t pt-4">Total Tax Paid to Suppliers (ITC)</p>
            </div>

            <div className={`bg-gradient-to-br ${netGstPayable > 0 ? 'from-[#3F63AD] to-[#2E4F95] text-white' : 'from-emerald-500 to-emerald-700 text-white'} rounded-2xl border border-transparent p-6 shadow-sm flex flex-col justify-between`}>
              <div>
                <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center mb-4">
                  <Calculator className="w-5 h-5 text-white" />
                </div>
                <p className="text-sm font-medium text-white/80">Net GST Payable</p>
                <h3 className="text-3xl font-bold mt-1">{money(Math.abs(netGstPayable))}</h3>
              </div>
              <p className="text-xs text-white/70 mt-4 border-t border-white/20 pt-4">
                {netGstPayable > 0 ? "Amount to be paid to Government" : "Excess ITC to be carried forward"}
              </p>
            </div>
          </div>

          <div className="bg-white border rounded-2xl overflow-hidden">
            <div className="p-5 border-b flex items-center justify-between">
              <h3 className="font-semibold text-lg">Tax Computation Summary</h3>
              <Button size="sm" className="bg-[#3F63AD] hover:bg-[#2E4F95]">File GSTR-3B</Button>
            </div>
            <div className="divide-y text-sm">
              <div className="flex justify-between p-4 bg-slate-50 font-medium text-muted-foreground">
                <span>Description</span>
                <span>Taxable Value</span>
                <span>IGST</span>
                <span>CGST</span>
                <span>SGST</span>
                <span>Total Tax</span>
              </div>
              <div className="flex justify-between p-4 hover:bg-slate-50 transition-colors">
                <span className="font-medium">3.1 Outward supplies (GSTR-1)</span>
                <span>{money(totalSalesAmount)}</span>
                <span>{money(gstr1Igst)}</span>
                <span>{money(gstr1Cgst)}</span>
                <span>{money(gstr1Sgst)}</span>
                <span className="font-semibold">{money(totalOutputTax)}</span>
              </div>
              <div className="flex justify-between p-4 hover:bg-slate-50 transition-colors">
                <span className="font-medium">4. Eligible ITC (GSTR-2)</span>
                <span>{money(totalPurchaseAmount)}</span>
                <span>{money(gstr2Igst)}</span>
                <span>{money(gstr2Cgst)}</span>
                <span>{money(gstr2Sgst)}</span>
                <span className="font-semibold text-emerald-600">{money(totalInputTax)}</span>
              </div>
              <div className="flex justify-between p-5 bg-slate-100/50 font-semibold text-base">
                <span>Net Tax Payable</span>
                <span>-</span>
                <span>-</span>
                <span>-</span>
                <span>-</span>
                <span className={netGstPayable > 0 ? "text-red-600" : "text-emerald-600"}>
                  {netGstPayable > 0 ? `Payable: ${money(netGstPayable)}` : `Refund/Carry: ${money(Math.abs(netGstPayable))}`}
                </span>
              </div>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="gstr1">
          <div className="bg-white border rounded-2xl overflow-hidden">
            <div className="p-4 border-b">
              <h3 className="font-semibold">GSTR-1 — Sales Register (Output Tax)</h3>
              <p className="text-xs text-muted-foreground mt-1">
                Same columns as the reference Sales Register export, plus an HSN Code column per product.
              </p>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left whitespace-nowrap">
                <thead className="text-[10px] text-muted-foreground bg-slate-50 border-b uppercase">
                  <tr>
                    <th className="px-3 py-2.5">Inv Date</th>
                    <th className="px-3 py-2.5">Inv No.</th>
                    <th className="px-3 py-2.5">Name</th>
                    <th className="px-3 py-2.5">GSTIN</th>
                    <th className="px-3 py-2.5">HSN Code</th>
                    <th className="px-3 py-2.5 text-right">Gross</th>
                    <th className="px-3 py-2.5 text-right">Net Amount</th>
                    <th className="px-3 py-2.5 text-right">Output CGST @9%</th>
                    <th className="px-3 py-2.5 text-right">Output SGST @9%</th>
                    <th className="px-3 py-2.5 text-right">Output IGST @18%</th>
                    <th className="px-3 py-2.5 text-right">Round Off</th>
                    <th className="px-3 py-2.5">EWB No</th>
                    <th className="px-3 py-2.5">EWB Date</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {loadingGstr1 ? (
                    <tr><td colSpan={13} className="p-0"><TableShimmer rows={6} cols={13} /></td></tr>
                  ) : filteredGstr1.length === 0 ? (
                    <tr><td colSpan={13} className="text-center p-8 text-muted-foreground">No GSTR-1 records found for this period</td></tr>
                  ) : (
                    filteredGstr1.map((row: any, i: number) => (
                      <tr key={row["Inv No."] || i} className="hover:bg-slate-50/50">
                        <td className="px-3 py-2.5">{row["Inv Date"]}</td>
                        <td className="px-3 py-2.5 font-medium text-blue-600">{row["Inv No."]}</td>
                        <td className="px-3 py-2.5">{row.Name}</td>
                        <td className="px-3 py-2.5 font-mono">{row.GSTIN}</td>
                        <td className="px-3 py-2.5 font-mono">{row["HSN Code"] || "—"}</td>
                        <td className="px-3 py-2.5 text-right font-medium">{money(row.Gross)}</td>
                        <td className="px-3 py-2.5 text-right">{money(row["Net Amount"])}</td>
                        <td className="px-3 py-2.5 text-right">{money(row["Output CGST @9%"])}</td>
                        <td className="px-3 py-2.5 text-right">{money(row["Output SGST @9%"])}</td>
                        <td className="px-3 py-2.5 text-right">{money(row["Output IGST @18%"])}</td>
                        <td className="px-3 py-2.5 text-right">{row["Round Off"]}</td>
                        <td className="px-3 py-2.5">{row["EWB No"] || "—"}</td>
                        <td className="px-3 py-2.5">{row["EWB Date"] || "—"}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
            <p className="text-[10px] text-muted-foreground p-3 border-t bg-slate-50/50">
              Export (top right) includes every column from the reference sheet — A/C Group, Original Bill No/Date,
              IRN No, Accode, Tin No are left blank where this ERP doesn't track them, rather than guessed at.
            </p>
          </div>
        </TabsContent>

        <TabsContent value="gstr2">
          <div className="bg-white border rounded-2xl overflow-hidden">
            <div className="p-4 border-b">
              <h3 className="font-semibold">GSTR-2 — Purchase Register (Input Tax Credit)</h3>
              <p className="text-xs text-muted-foreground mt-1">
                Same column style as the Sales Register, mirrored for inward supplies, plus HSN Code per product.
              </p>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left whitespace-nowrap">
                <thead className="text-[10px] text-muted-foreground bg-slate-50 border-b uppercase">
                  <tr>
                    <th className="px-3 py-2.5">Bill Date</th>
                    <th className="px-3 py-2.5">Bill No.</th>
                    <th className="px-3 py-2.5">Loc.</th>
                    <th className="px-3 py-2.5">Name</th>
                    <th className="px-3 py-2.5">GSTIN</th>
                    <th className="px-3 py-2.5">HSN Code</th>
                    <th className="px-3 py-2.5 text-right">Gross</th>
                    <th className="px-3 py-2.5 text-right">Net Amount</th>
                    <th className="px-3 py-2.5 text-right">Input CGST @9%</th>
                    <th className="px-3 py-2.5 text-right">Input SGST @9%</th>
                    <th className="px-3 py-2.5 text-right">Input IGST @18%</th>
                    <th className="px-3 py-2.5 text-right text-emerald-600">Round Off</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {loadingGstr2 ? (
                    <tr><td colSpan={12} className="p-0"><TableShimmer rows={6} cols={12} /></td></tr>
                  ) : filteredGstr2.length === 0 ? (
                    <tr><td colSpan={12} className="text-center p-8 text-muted-foreground">No GSTR-2 records found for this period</td></tr>
                  ) : (
                    filteredGstr2.map((row: any, i: number) => (
                      <tr key={row["Bill No."] || i} className="hover:bg-slate-50/50">
                        <td className="px-3 py-2.5">{row["Bill Date"]}</td>
                        <td className="px-3 py-2.5 font-medium">{row["Bill No."]}</td>
                        <td className="px-3 py-2.5">{row["Loc."] || "—"}</td>
                        <td className="px-3 py-2.5">{row.Name}</td>
                        <td className="px-3 py-2.5 font-mono">{row.GSTIN}</td>
                        <td className="px-3 py-2.5 font-mono">{row["HSN Code"] || "—"}</td>
                        <td className="px-3 py-2.5 text-right font-medium">{money(row.Gross)}</td>
                        <td className="px-3 py-2.5 text-right">{money(row["Net Amount"])}</td>
                        <td className="px-3 py-2.5 text-right">{money(row["Input CGST @9%"])}</td>
                        <td className="px-3 py-2.5 text-right">{money(row["Input SGST @9%"])}</td>
                        <td className="px-3 py-2.5 text-right">{money(row["Input IGST @18%"])}</td>
                        <td className="px-3 py-2.5 text-right font-semibold text-emerald-600">{row["Round Off"]}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
            <p className="text-[10px] text-muted-foreground p-3 border-t bg-slate-50/50">
              Export (top right) includes every column from the reference sheet — A/C Group, EWB No/Date, IRN No,
              Accode, Tin No, Original Bill No/Date are left blank where this ERP doesn't track them for purchases.
            </p>
          </div>
        </TabsContent>
      </Tabs>
    </PageShell>
  );
}
