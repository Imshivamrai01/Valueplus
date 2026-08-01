"use client";

import { useState } from "react";
import { PageShell } from "@/components/shared/page-shell";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Download, FileText, ArrowUpRight, ArrowDownRight, Calculator } from "lucide-react";
import { format } from "date-fns";

const DUMMY_GSTR1 = [
  { id: "INV-001", date: "2026-08-01", customer: "Rahul Sharma", gstin: "27AABCV1234A1Z5", amount: 45000, igst: 0, cgst: 4050, sgst: 4050, total_tax: 8100 },
  { id: "INV-002", date: "2026-08-02", customer: "TechVision Solutions", gstin: "29BBBCV9876B1Z2", amount: 120000, igst: 21600, cgst: 0, sgst: 0, total_tax: 21600 },
  { id: "INV-003", date: "2026-08-05", customer: "Amit Kumar", gstin: "", amount: 15000, igst: 0, cgst: 1350, sgst: 1350, total_tax: 2700 },
  { id: "INV-004", date: "2026-08-10", customer: "Global Enterprises", gstin: "07CCDCV4567C1Z3", amount: 250000, igst: 45000, cgst: 0, sgst: 0, total_tax: 45000 },
  { id: "INV-005", date: "2026-08-15", customer: "Sneha Patel", gstin: "27DDECV5555D1Z4", amount: 32000, igst: 0, cgst: 2880, sgst: 2880, total_tax: 5760 },
];

const DUMMY_GSTR2 = [
  { id: "PUR-101", date: "2026-08-03", supplier: "Samsung India", gstin: "27SAMCV9999S1Z9", amount: 300000, igst: 0, cgst: 27000, sgst: 27000, total_tax: 54000 },
  { id: "PUR-102", date: "2026-08-08", supplier: "Dell Distributors", gstin: "29DELCV8888D1Z8", amount: 150000, igst: 27000, cgst: 0, sgst: 0, total_tax: 27000 },
  { id: "PUR-103", date: "2026-08-12", supplier: "Apple India Pvt Ltd", gstin: "27APPCV7777A1Z7", amount: 500000, igst: 0, cgst: 45000, sgst: 45000, total_tax: 90000 },
];

export default function GSTReportsPage() {
  const [period, setPeriod] = useState("August 2026");

  // Calculations for GSTR-3B
  const totalSalesAmount = DUMMY_GSTR1.reduce((acc, curr) => acc + curr.amount, 0);
  const totalOutputTax = DUMMY_GSTR1.reduce((acc, curr) => acc + curr.total_tax, 0);
  
  const totalPurchaseAmount = DUMMY_GSTR2.reduce((acc, curr) => acc + curr.amount, 0);
  const totalInputTax = DUMMY_GSTR2.reduce((acc, curr) => acc + curr.total_tax, 0);

  const netGstPayable = totalOutputTax - totalInputTax;

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
            <option>August 2026</option>
            <option>July 2026</option>
            <option>June 2026</option>
          </select>
          <Button size="sm" variant="outline">
            <Download className="w-4 h-4 mr-2" />
            Export JSON
          </Button>
        </div>
      }
    >
      <Tabs defaultValue="gstr3b" className="w-full">
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
                <h3 className="text-3xl font-bold mt-1">₹{totalOutputTax.toLocaleString('en-IN')}</h3>
              </div>
              <p className="text-xs text-muted-foreground mt-4 border-t pt-4">Total Tax Collected from Customers</p>
            </div>

            <div className="bg-white rounded-2xl border p-6 flex flex-col justify-between">
              <div>
                <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center mb-4">
                  <ArrowDownRight className="w-5 h-5" />
                </div>
                <p className="text-sm font-medium text-muted-foreground">Input Tax Credit (GSTR-2)</p>
                <h3 className="text-3xl font-bold mt-1">₹{totalInputTax.toLocaleString('en-IN')}</h3>
              </div>
              <p className="text-xs text-muted-foreground mt-4 border-t pt-4">Total Tax Paid to Suppliers (ITC)</p>
            </div>

            <div className={`bg-gradient-to-br ${netGstPayable > 0 ? 'from-[#3F63AD] to-[#2E4F95] text-white' : 'from-emerald-500 to-emerald-700 text-white'} rounded-2xl border border-transparent p-6 shadow-sm flex flex-col justify-between`}>
              <div>
                <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center mb-4">
                  <Calculator className="w-5 h-5 text-white" />
                </div>
                <p className="text-sm font-medium text-white/80">Net GST Payable</p>
                <h3 className="text-3xl font-bold mt-1">₹{Math.abs(netGstPayable).toLocaleString('en-IN')}</h3>
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
                <span>₹{totalSalesAmount.toLocaleString('en-IN')}</span>
                <span>₹{DUMMY_GSTR1.reduce((a, c) => a + c.igst, 0).toLocaleString('en-IN')}</span>
                <span>₹{DUMMY_GSTR1.reduce((a, c) => a + c.cgst, 0).toLocaleString('en-IN')}</span>
                <span>₹{DUMMY_GSTR1.reduce((a, c) => a + c.sgst, 0).toLocaleString('en-IN')}</span>
                <span className="font-semibold">₹{totalOutputTax.toLocaleString('en-IN')}</span>
              </div>
              <div className="flex justify-between p-4 hover:bg-slate-50 transition-colors">
                <span className="font-medium">4. Eligible ITC (GSTR-2)</span>
                <span>₹{totalPurchaseAmount.toLocaleString('en-IN')}</span>
                <span>₹{DUMMY_GSTR2.reduce((a, c) => a + c.igst, 0).toLocaleString('en-IN')}</span>
                <span>₹{DUMMY_GSTR2.reduce((a, c) => a + c.cgst, 0).toLocaleString('en-IN')}</span>
                <span>₹{DUMMY_GSTR2.reduce((a, c) => a + c.sgst, 0).toLocaleString('en-IN')}</span>
                <span className="font-semibold text-emerald-600">₹{totalInputTax.toLocaleString('en-IN')}</span>
              </div>
              <div className="flex justify-between p-5 bg-slate-100/50 font-semibold text-base">
                <span>Net Tax Payable</span>
                <span>-</span>
                <span>-</span>
                <span>-</span>
                <span>-</span>
                <span className={netGstPayable > 0 ? "text-red-600" : "text-emerald-600"}>
                  {netGstPayable > 0 ? `Payable: ₹${netGstPayable.toLocaleString('en-IN')}` : `Refund/Carry: ₹${Math.abs(netGstPayable).toLocaleString('en-IN')}`}
                </span>
              </div>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="gstr1">
          <div className="bg-white border rounded-2xl overflow-hidden">
            <div className="p-4 border-b">
              <h3 className="font-semibold">GSTR-1 (Sales / Output Tax)</h3>
              <p className="text-xs text-muted-foreground mt-1">Tax collected from customers on outward supplies.</p>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left">
                <thead className="text-xs text-muted-foreground bg-slate-50 border-b uppercase">
                  <tr>
                    <th className="px-4 py-3">Invoice No</th>
                    <th className="px-4 py-3">Date</th>
                    <th className="px-4 py-3">Customer</th>
                    <th className="px-4 py-3">GSTIN</th>
                    <th className="px-4 py-3 text-right">Taxable Amt</th>
                    <th className="px-4 py-3 text-right">CGST</th>
                    <th className="px-4 py-3 text-right">SGST</th>
                    <th className="px-4 py-3 text-right">IGST</th>
                    <th className="px-4 py-3 text-right">Total Tax</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {DUMMY_GSTR1.map((row) => (
                    <tr key={row.id} className="hover:bg-slate-50/50">
                      <td className="px-4 py-3 font-medium text-blue-600">{row.id}</td>
                      <td className="px-4 py-3">{format(new Date(row.date), "dd MMM, yyyy")}</td>
                      <td className="px-4 py-3">{row.customer}</td>
                      <td className="px-4 py-3 text-xs">{row.gstin || "URD"}</td>
                      <td className="px-4 py-3 text-right font-medium">₹{row.amount.toLocaleString()}</td>
                      <td className="px-4 py-3 text-right">₹{row.cgst.toLocaleString()}</td>
                      <td className="px-4 py-3 text-right">₹{row.sgst.toLocaleString()}</td>
                      <td className="px-4 py-3 text-right">₹{row.igst.toLocaleString()}</td>
                      <td className="px-4 py-3 text-right font-semibold">₹{row.total_tax.toLocaleString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="gstr2">
          <div className="bg-white border rounded-2xl overflow-hidden">
            <div className="p-4 border-b">
              <h3 className="font-semibold">GSTR-2 (Purchases / Input Tax Credit)</h3>
              <p className="text-xs text-muted-foreground mt-1">Tax paid to suppliers on inward supplies (Eligible ITC).</p>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left">
                <thead className="text-xs text-muted-foreground bg-slate-50 border-b uppercase">
                  <tr>
                    <th className="px-4 py-3">Bill No</th>
                    <th className="px-4 py-3">Date</th>
                    <th className="px-4 py-3">Supplier</th>
                    <th className="px-4 py-3">GSTIN</th>
                    <th className="px-4 py-3 text-right">Taxable Amt</th>
                    <th className="px-4 py-3 text-right">CGST</th>
                    <th className="px-4 py-3 text-right">SGST</th>
                    <th className="px-4 py-3 text-right">IGST</th>
                    <th className="px-4 py-3 text-right text-emerald-600">ITC Claimed</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {DUMMY_GSTR2.map((row) => (
                    <tr key={row.id} className="hover:bg-slate-50/50">
                      <td className="px-4 py-3 font-medium">{row.id}</td>
                      <td className="px-4 py-3">{format(new Date(row.date), "dd MMM, yyyy")}</td>
                      <td className="px-4 py-3">{row.supplier}</td>
                      <td className="px-4 py-3 text-xs">{row.gstin}</td>
                      <td className="px-4 py-3 text-right font-medium">₹{row.amount.toLocaleString()}</td>
                      <td className="px-4 py-3 text-right">₹{row.cgst.toLocaleString()}</td>
                      <td className="px-4 py-3 text-right">₹{row.sgst.toLocaleString()}</td>
                      <td className="px-4 py-3 text-right">₹{row.igst.toLocaleString()}</td>
                      <td className="px-4 py-3 text-right font-semibold text-emerald-600">₹{row.total_tax.toLocaleString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </TabsContent>
      </Tabs>
    </PageShell>
  );
}
