"use client";

import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { PageShell } from "@/components/shared/page-shell";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Search, Download, Printer, Filter, Receipt, FileText, ArrowUpDown } from "lucide-react";
import Link from "next/link";

function formatCurrency(val: number) {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 2,
  }).format(val || 0);
}

export default function SalesOutReportPage() {
  const [searchTerm, setSearchTerm] = useState("");
  const [paymentModeFilter, setPaymentModeFilter] = useState("all");
  const [dueOnlyFilter, setDueOnlyFilter] = useState("all");
  const [staffFilter, setStaffFilter] = useState("all");

  const { data: reportResponse, isLoading } = useQuery({
    queryKey: ["salesOutReport", paymentModeFilter, dueOnlyFilter, staffFilter],
    queryFn: async () => {
      let url = "/api/reports/sales-out?";
      if (paymentModeFilter !== "all") url += `paymentMode=${paymentModeFilter}&`;
      if (dueOnlyFilter === "due") url += `dueOnly=true&`;
      if (staffFilter !== "all") url += `staff=${encodeURIComponent(staffFilter)}&`;
      const res = await fetch(url);
      return res.json();
    },
  });

  const reportData = reportResponse?.data || [];
  const summary = reportResponse?.summary || { totalInvoices: 0, totalAmount: 0, totalPaid: 0, totalDue: 0 };

  const filtered = reportData.filter((item: any) =>
    (item.customerName || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
    (item.billNumber || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
    (item.customerPhone || "").includes(searchTerm) ||
    (item.staff || "").toLowerCase().includes(searchTerm.toLowerCase())
  );

  const downloadCSV = () => {
    if (filtered.length === 0) return;
    const headers = ["Due", "Date", "Amount", "Bill Number", "Customer Name", "Mobile", "Staff", "Payment Mode", "Paid Amount", "Due Amount", "Invoice Status", "Finance Status"];
    const rows = filtered.map((i: any) => [
      i.due,
      i.date,
      i.amount,
      i.billNumber,
      `"${i.customerName}"`,
      i.customerPhone,
      `"${i.staff}"`,
      i.paymentMode,
      i.paidAmount,
      i.dueAmount,
      i.invoiceStatus,
      i.financeStatus,
    ]);
    const csvContent = "data:text/csv;charset=utf-8," + [headers.join(","), ...rows.map((e: any) => e.join(","))].join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `ValuePlus_Sales_Out_Report_${new Date().toISOString().split("T")[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <PageShell
      title="Sales Out Report"
      description="Commercial sales register showing due receivables, bill numbers, customer particulars, payment modes, and finance status."
    >
      <div className="space-y-4">
        {/* SUMMARY CARDS */}
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
            <span className="text-xs font-semibold text-slate-500 uppercase">Total Bills</span>
            <p className="text-2xl font-black text-slate-900 mt-1">{summary.totalInvoices}</p>
          </div>
          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
            <span className="text-xs font-semibold text-slate-500 uppercase">Total Sales Invoiced</span>
            <p className="text-2xl font-black text-[#3F63AD] mt-1">{formatCurrency(summary.totalAmount)}</p>
          </div>
          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
            <span className="text-xs font-semibold text-slate-500 uppercase">Total Collections Received</span>
            <p className="text-2xl font-black text-emerald-700 mt-1">{formatCurrency(summary.totalPaid)}</p>
          </div>
          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
            <span className="text-xs font-semibold text-slate-500 uppercase">Total Outstanding Due</span>
            <p className="text-2xl font-black text-red-600 mt-1">{formatCurrency(summary.totalDue)}</p>
          </div>
        </div>

        {/* FILTERS & SEARCH */}
        <div className="flex flex-wrap items-center justify-between gap-3 bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
          <div className="relative flex-1 min-w-[260px] max-w-md">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <Input
              placeholder="Search bill number, customer, phone or staff..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9 bg-slate-50 border-slate-300 text-xs"
            />
          </div>

          <div className="flex items-center gap-2">
            <Select value={paymentModeFilter} onValueChange={setPaymentModeFilter}>
              <SelectTrigger className="w-[140px] text-xs bg-slate-50 border-slate-300 font-semibold">
                <SelectValue placeholder="Payment Mode" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Modes</SelectItem>
                <SelectItem value="Cash">Cash</SelectItem>
                <SelectItem value="UPI">UPI</SelectItem>
                <SelectItem value="Online">Online</SelectItem>
                <SelectItem value="Card">Card</SelectItem>
                <SelectItem value="Finance">Finance</SelectItem>
              </SelectContent>
            </Select>

            <Select value={dueOnlyFilter} onValueChange={setDueOnlyFilter}>
              <SelectTrigger className="w-[130px] text-xs bg-slate-50 border-slate-300 font-semibold">
                <SelectValue placeholder="Due Filter" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Bills</SelectItem>
                <SelectItem value="due">Due Only</SelectItem>
              </SelectContent>
            </Select>

            <Button onClick={downloadCSV} variant="outline" size="sm" className="text-xs font-bold gap-1">
              <Download className="w-3.5 h-3.5" /> Export CSV
            </Button>
            <Button onClick={() => window.print()} variant="outline" size="sm" className="text-xs font-bold gap-1">
              <Printer className="w-3.5 h-3.5" /> Print
            </Button>
          </div>
        </div>

        {/* PRIMARY SALES OUT TABLE (REQ 39 EXACT SPECIFICATION) */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
          <table className="w-full text-xs text-left">
            <thead className="bg-slate-50 border-b text-slate-700 uppercase font-bold">
              <tr>
                {/* 5 MANDATORY COLUMNS: Due, Date, Amount, Bill Number, Customer Name */}
                <th className="p-3 text-right">Due (₹)</th>
                <th className="p-3">Date</th>
                <th className="p-3 text-right">Amount (₹)</th>
                <th className="p-3">Bill Number</th>
                <th className="p-3">Customer Name</th>
                {/* ENHANCED COLUMNS */}
                <th className="p-3">Mobile</th>
                <th className="p-3">Staff</th>
                <th className="p-3">Payment Mode</th>
                <th className="p-3 text-right">Paid (₹)</th>
                <th className="p-3 text-center">Finance Status</th>
                <th className="p-3 text-center">Invoice Status</th>
                <th className="p-3 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-sans">
              {isLoading ? (
                <tr><td colSpan={12} className="p-6 text-center text-slate-500">Loading Sales Out Report...</td></tr>
              ) : filtered.length === 0 ? (
                <tr><td colSpan={12} className="p-6 text-center text-slate-500">No sales transactions match the criteria.</td></tr>
              ) : (
                filtered.map((r: any, idx: number) => (
                  <tr key={idx} className="hover:bg-slate-50 transition-colors">
                    {/* Due */}
                    <td className="p-3 text-right font-mono font-bold">
                      {r.due > 0 ? (
                        <span className="text-red-600 font-black">₹{r.due?.toLocaleString("en-IN")}</span>
                      ) : (
                        <span className="text-emerald-700">₹0</span>
                      )}
                    </td>
                    {/* Date */}
                    <td className="p-3 font-mono text-slate-600">{r.date}</td>
                    {/* Amount */}
                    <td className="p-3 text-right font-mono font-black text-slate-900">
                      ₹{r.amount?.toLocaleString("en-IN")}
                    </td>
                    {/* Bill Number */}
                    <td className="p-3 font-mono font-bold text-[#3F63AD]">
                      <Link href={`/invoice?billid=${encodeURIComponent(r.billNumber)}`} className="hover:underline">
                        {r.billNumber}
                      </Link>
                    </td>
                    {/* Customer Name */}
                    <td className="p-3 font-bold text-slate-900">{r.customerName}</td>
                    {/* Mobile */}
                    <td className="p-3 font-mono text-slate-600">{r.customerPhone}</td>
                    {/* Staff */}
                    <td className="p-3 text-slate-700">{r.staff}</td>
                    {/* Payment Mode */}
                    <td className="p-3">
                      <Badge variant="outline" className="font-bold text-slate-800 uppercase text-[10px]">
                        {r.paymentMode}
                      </Badge>
                    </td>
                    {/* Paid Amount */}
                    <td className="p-3 text-right font-mono text-emerald-800 font-bold">
                      ₹{r.paidAmount?.toLocaleString("en-IN")}
                    </td>
                    {/* Finance Status */}
                    <td className="p-3 text-center">
                      <Badge className={
                        r.financeStatus === "Approved" ? "bg-emerald-100 text-emerald-800 text-[10px]" :
                        r.financeStatus === "Pending" ? "bg-amber-100 text-amber-800 text-[10px]" :
                        "bg-slate-100 text-slate-600 text-[10px]"
                      }>
                        {r.financeStatus}
                      </Badge>
                    </td>
                    {/* Invoice Status */}
                    <td className="p-3 text-center">
                      <Badge className={r.invoiceStatus === "paid" ? "bg-emerald-100 text-emerald-800" : "bg-blue-100 text-blue-800"}>
                        {r.invoiceStatus}
                      </Badge>
                    </td>
                    {/* Action */}
                    <td className="p-3 text-right">
                      <Link
                        href={`/invoice?billid=${encodeURIComponent(r.billNumber)}`}
                        className="text-xs font-bold text-[#3F63AD] hover:underline"
                      >
                        View Bill
                      </Link>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </PageShell>
  );
}
