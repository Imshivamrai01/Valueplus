"use client";

import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { PageShell } from "@/components/shared/page-shell";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { 
  Search, Printer, Eye, Sparkles, FileText, CheckCircle2, Clock, Plus, 
  Building, User, CreditCard, Receipt, MessageCircle, X, ShieldCheck
} from "lucide-react";
import { FinanceDODocument } from "@/components/FinanceDODocument";
import { toast } from "sonner";
import { formatCurrency, formatDate } from "@/lib/utils";

const FINANCE_PROVIDERS = [
  "Bajaj Finance Limited",
  "HDB Financial Services",
  "IDFC FIRST Bank",
  "TVS Credit Services",
  "Kotak Mahindra Prime",
  "PineLabs Consumer Finance",
  "HDFC Consumer Durable",
  "Home Credit India",
];

const ASSET_CATEGORIES = [
  "LED TV",
  "Smartphones / Mobile",
  "Air Conditioners (AC)",
  "Refrigerator",
  "Washing Machine",
  "Laptop / IT",
  "Audio / Home Theatre",
  "Microwave / Oven",
];

export default function FinanceDOPage() {
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedDO, setSelectedDO] = useState<any | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const { data: financeRecords = [], isLoading } = useQuery({
    queryKey: ["financeRecords"],
    queryFn: async () => {
      const res = await fetch("/api/finance");
      const json = await res.json();
      return json.success ? json.data : [];
    },
  });

  const { data: customers = [] } = useQuery({
    queryKey: ["customers"],
    queryFn: async () => {
      const res = await fetch("/api/customers");
      const json = await res.json();
      return json.success ? json.data : [];
    },
  });

  const { data: invoices = [] } = useQuery({
    queryKey: ["invoices"],
    queryFn: async () => {
      const res = await fetch("/api/invoices");
      const json = await res.json();
      return json.success ? json.data : [];
    },
  });

  // New DO Form State
  const [form, setForm] = useState({
    financeProvider: "Bajaj Finance Limited",
    dealerName: "ASHOKA ENTERPRISES#GORAKHPUR UP#BPES CD#28900",
    customerId: `A${Math.floor(100000000 + Math.random() * 900000000)}`,
    atosDealId: `CS${Math.floor(100000000000 + Math.random() * 900000000000)}`,
    doId: `B${Math.floor(100000000 + Math.random() * 900000000)}`,
    date: new Date().toLocaleDateString("en-GB") + " " + new Date().toLocaleTimeString("en-US", { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
    invoiceNumber: "",
    
    customerName: "",
    customerMobile: "",
    deliveryAddress: "H. NO. 116, NEAR SHANTI MARRIAGE HOUSE DEORIA ROAD, KUNRAGHAT GORAKHPUR, 273008",
    
    assetCategory: "LED TV",
    oemCategory: "LLOYD - LED",
    manufacturer: "HAVELLS INDIA LTD(Lloyd)",
    model: "LLOYD - LED - GL40F5L2RC",
    schemeCode: "5089897 (8/0)",
    
    productPrice: 21800,
    grossLoanAmount: 21800,
    netLoanAmount: 21800,
    marginMoney: 0,
    advanceEmi: 0,
    dealerInterestSubsidy: 772,
    dealerSubsidyPercent: "3.54%",
    totalEmi: 2725,
    totalGst: 118,
    convenienceFee: 270,
    customerDownPayment: 270,
    totalDeductions: 1042,
    netDisbursement: 20758,
    
    approvalStatus: "Approved",
    signatoryName: "Aditya Saini (Finance Desk)",
  });

  // Calculate auto financials
  const updateFinancials = (price: number, dp: number, subsidy: number, fee: number) => {
    const grossLoan = price;
    const netLoan = Math.max(0, price - dp);
    const deductions = subsidy + fee;
    const netDisburse = Math.max(0, grossLoan - dp - subsidy);
    const totalEmiCalc = Math.round(netLoan / 8);

    setForm(prev => ({
      ...prev,
      productPrice: price,
      grossLoanAmount: grossLoan,
      netLoanAmount: netLoan,
      customerDownPayment: dp,
      dealerInterestSubsidy: subsidy,
      convenienceFee: fee,
      totalDeductions: deductions,
      netDisbursement: netDisburse,
      totalEmi: totalEmiCalc > 0 ? totalEmiCalc : prev.totalEmi,
    }));
  };

  const createDOMutation = useMutation({
    mutationFn: async (payload: any) => {
      const res = await fetch("/api/finance", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const json = await res.json();
      if (!json.success) throw new Error(json.error || "Failed to create Finance DO");
      return json.data;
    },
    onSuccess: (savedDO) => {
      toast.success(`Finance Delivery Order ${savedDO.doId} generated successfully!`);
      queryClient.invalidateQueries({ queryKey: ["financeRecords"] });
      setIsModalOpen(false);
      // Auto-open PDF preview
      setSelectedDO(savedDO);
    },
    onError: (err: any) => {
      toast.error(err.message || "Failed to save Finance DO");
    }
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.customerName.trim()) {
      toast.error("Customer Name is required");
      return;
    }
    if (!form.customerMobile || form.customerMobile.replace(/\D/g, '').length !== 10) {
      toast.error("10-digit Customer Mobile Number is required");
      return;
    }
    if (!form.model.trim()) {
      toast.error("Product Model Name is required");
      return;
    }

    createDOMutation.mutate(form);
  };

  const filtered = financeRecords.filter((rec: any) =>
    (rec.doId || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
    (rec.customerName || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
    (rec.invoiceNumber || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
    (rec.financeProvider || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
    (rec.model || "").toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (selectedDO) {
    return (
      <FinanceDODocument 
        data={selectedDO} 
        onBack={() => setSelectedDO(null)} 
      />
    );
  }

  return (
    <PageShell
      title="Finance Delivery Orders (DO)"
      description="Official consumer loan Delivery Orders, loan breakdowns, down payment receipts and disbursement tracking."
      actions={
        <Button onClick={() => setIsModalOpen(true)} className="bg-[#3F63AD] hover:bg-[#2E4F95] text-white text-xs font-bold gap-1.5 shadow-md">
          <Plus className="w-4 h-4" /> + New Finance DO
        </Button>
      }
    >
      <div className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3 bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
          <div className="relative flex-1 min-w-[260px] max-w-md">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <Input
              placeholder="Search DO ID, customer, invoice, product or provider..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9 bg-slate-50 border-slate-300 text-xs"
            />
          </div>

          <div className="flex items-center gap-2">
            <Badge variant="outline" className="font-bold text-[#3F63AD] bg-blue-50 border-blue-200">
              Total Records: {financeRecords.length}
            </Badge>
            <Button size="sm" onClick={() => setIsModalOpen(true)} className="bg-[#76C043] hover:bg-[#60a82c] text-white text-xs font-bold">
              + Add DO Record
            </Button>
          </div>
        </div>

        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
          <table className="w-full text-xs text-left">
            <thead className="bg-slate-50 border-b text-slate-700 uppercase font-bold">
              <tr>
                <th className="p-3">DO ID</th>
                <th className="p-3">Date</th>
                <th className="p-3">Customer</th>
                <th className="p-3">Product Model</th>
                <th className="p-3">Provider</th>
                <th className="p-3 text-right">Loan Amount</th>
                <th className="p-3 text-right">Down Payment</th>
                <th className="p-3 text-right">Net Disbursement</th>
                <th className="p-3 text-center">Status</th>
                <th className="p-3 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {isLoading ? (
                <tr>
                  <td colSpan={10} className="p-6 text-center text-slate-500 font-medium">
                    Loading Finance Delivery Orders...
                  </td>
                </tr>
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={10} className="p-8 text-center text-slate-500">
                    <p className="font-semibold text-sm text-slate-700">No finance delivery orders found.</p>
                    <p className="text-xs text-slate-400 mt-1">Click "+ New Finance DO" to add a record matching the official Bajaj/HDFC Delivery Order layout.</p>
                    <Button onClick={() => setIsModalOpen(true)} className="mt-3 bg-[#3F63AD] text-white text-xs font-bold">
                      + Create First DO
                    </Button>
                  </td>
                </tr>
              ) : (
                filtered.map((rec: any) => (
                  <tr key={rec._id || rec.doId} className="hover:bg-slate-50/80 transition-colors">
                    <td className="p-3 font-mono font-bold text-[#3F63AD] cursor-pointer" onClick={() => setSelectedDO(rec)}>
                      {rec.doId}
                    </td>
                    <td className="p-3 text-slate-600 whitespace-nowrap">{rec.date}</td>
                    <td className="p-3 font-bold text-slate-900">
                      {rec.customerName}
                      <span className="block text-[10px] text-slate-500 font-mono font-normal">{rec.customerMobile}</span>
                    </td>
                    <td className="p-3">
                      <p className="font-semibold text-slate-800">{rec.model || rec.productModel || "Electronics"}</p>
                      <span className="text-[10px] text-slate-400 font-mono">{rec.assetCategory}</span>
                    </td>
                    <td className="p-3">
                      <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold bg-blue-50 text-[#3F63AD] border border-blue-200">
                        {rec.financeProvider}
                      </span>
                    </td>
                    <td className="p-3 text-right font-mono font-bold">₹{Number(rec.grossLoanAmount || rec.productPrice || 0).toLocaleString("en-IN")}</td>
                    <td className="p-3 text-right font-mono text-emerald-700 font-bold">₹{Number(rec.customerDownPayment || 0).toLocaleString("en-IN")}</td>
                    <td className="p-3 text-right font-mono font-bold text-slate-900">₹{Number(rec.netDisbursement || 0).toLocaleString("en-IN")}</td>
                    <td className="p-3 text-center">
                      <Badge className={rec.approvalStatus === "Approved" ? "bg-emerald-100 text-emerald-800" : "bg-amber-100 text-amber-800"}>
                        {rec.approvalStatus || "Approved"}
                      </Badge>
                    </td>
                    <td className="p-3 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => setSelectedDO(rec)}
                          className="h-7 px-2 text-[11px] font-bold text-[#3F63AD] border-blue-200 hover:bg-blue-50"
                          title="View Official DO PDF Sheet"
                        >
                          <Eye className="w-3 h-3 mr-1" /> View DO PDF
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            const phone = (rec.customerMobile || "").replace(/\D/g, "");
                            const ph = phone.length === 10 ? `91${phone}` : phone;
                            const msg = encodeURIComponent(
                              `*VALUE PLUS / ASHOKA ENTERPRISES*\nFinance Delivery Order #${rec.doId}\nProvider: ${rec.financeProvider}\nCustomer: ${rec.customerName}\nProduct: ${rec.model || rec.productModel}\nLoan Amount: ₹${Number(rec.grossLoanAmount || 0).toLocaleString("en-IN")}\nDown Payment: ₹${Number(rec.customerDownPayment || 0).toLocaleString("en-IN")}\nNet Disbursement: ₹${Number(rec.netDisbursement || 0).toLocaleString("en-IN")}\nStatus: ${rec.approvalStatus || "Approved"}\n\nThank you for choosing Value Plus!`
                            );
                            window.open(ph ? `https://wa.me/${ph}?text=${msg}` : `https://wa.me/?text=${msg}`, "_blank");
                          }}
                          className="h-7 w-7 p-0 border-emerald-500 text-emerald-600 hover:bg-emerald-500 hover:text-white"
                          title="Share on WhatsApp"
                        >
                          <MessageCircle className="w-3.5 h-3.5" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ─── ADD NEW FINANCE DO MODAL (MATCHING OFFICIAL DELIVERY ORDER SPECIFICATION) ─── */}
      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="max-w-4xl max-h-[92vh] overflow-y-auto p-0 rounded-2xl shadow-2xl border-none">
          {/* Header */}
          <div className="bg-gradient-to-r from-[#1B2537] via-[#243753] to-[#1B2537] text-white p-6 rounded-t-2xl flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl bg-white/10 flex items-center justify-center backdrop-blur-md border border-white/20">
                <Sparkles className="w-6 h-6 text-[#76C043]" />
              </div>
              <div>
                <h3 className="text-xl font-bold tracking-tight flex items-center gap-2">
                  New Finance Delivery Order (DO)
                  <span className="text-xs px-2.5 py-0.5 rounded-full bg-[#76C043]/20 text-[#76C043] border border-[#76C043]/30 font-mono font-bold">
                    OFFICIAL DO SPECIFICATION
                  </span>
                </h3>
                <p className="text-xs text-slate-300 mt-0.5">
                  Record consumer finance authorization, loan breakdown & generate official delivery order document
                </p>
              </div>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="p-6 space-y-5 bg-slate-50/70">
            {/* 1. PROVIDER & IDENTIFIERS */}
            <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm space-y-4">
              <h4 className="text-xs font-extrabold uppercase tracking-wider text-[#3F63AD] flex items-center gap-2">
                <Building className="w-4 h-4" /> 1. Finance Institution & Authorization Codes
              </h4>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-1.5">
                  <Label className="text-xs font-bold text-slate-700">Finance Provider *</Label>
                  <Select value={form.financeProvider} onValueChange={(v) => setForm({ ...form, financeProvider: v })}>
                    <SelectTrigger className="bg-slate-50 border-slate-300 font-semibold"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {FINANCE_PROVIDERS.map(p => <SelectItem key={p} value={p}>{p}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs font-bold text-slate-700">DO ID / Approval ID *</Label>
                  <Input 
                    placeholder="e.g. B432262868"
                    value={form.doId}
                    onChange={(e) => setForm({ ...form, doId: e.target.value })}
                    className="bg-amber-50/60 border-amber-300 font-mono font-bold text-slate-900 text-xs"
                  />
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold text-slate-700">ATOS Deal ID</Label>
                  <Input 
                    placeholder="e.g. CS289666676227"
                    value={form.atosDealId}
                    onChange={(e) => setForm({ ...form, atosDealId: e.target.value })}
                    className="bg-slate-50 border-slate-300 font-mono text-xs"
                  />
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold text-slate-700">Scheme Code (GT/AE)</Label>
                  <Input 
                    placeholder="e.g. 5089897 (8/0)"
                    value={form.schemeCode}
                    onChange={(e) => setForm({ ...form, schemeCode: e.target.value })}
                    className="bg-slate-50 border-slate-300 font-mono text-xs font-bold"
                  />
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold text-slate-700">Customer ID (LAN/Ref)</Label>
                  <Input 
                    placeholder="e.g. A144658860"
                    value={form.customerId}
                    onChange={(e) => setForm({ ...form, customerId: e.target.value })}
                    className="bg-slate-50 border-slate-300 font-mono text-xs"
                  />
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold text-slate-700">Linked Invoice # (Optional)</Label>
                  <Input 
                    placeholder="e.g. INV-2026-0001"
                    value={form.invoiceNumber}
                    onChange={(e) => setForm({ ...form, invoiceNumber: e.target.value })}
                    className="bg-slate-50 border-slate-300 font-mono text-xs font-bold text-[#3F63AD]"
                  />
                </div>
              </div>
            </div>

            {/* 2. CUSTOMER DETAILS */}
            <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm space-y-4">
              <h4 className="text-xs font-extrabold uppercase tracking-wider text-[#3F63AD] flex items-center gap-2">
                <User className="w-4 h-4" /> 2. Customer Particulars & Delivery Address
              </h4>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-1.5 md:col-span-2">
                  <Label className="text-xs font-bold text-slate-700">Customer Full Name *</Label>
                  <Input 
                    placeholder="e.g. Mohd Dilshad / Ajay Tiwari"
                    value={form.customerName}
                    onChange={(e) => setForm({ ...form, customerName: e.target.value })}
                    className="bg-slate-50 border-slate-300 font-bold text-slate-900"
                  />
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs font-bold text-slate-700">Mobile Number *</Label>
                  <Input 
                    type="text"
                    maxLength={10}
                    placeholder="10-digit mobile"
                    value={form.customerMobile}
                    onChange={(e) => setForm({ ...form, customerMobile: e.target.value.replace(/\D/g, '') })}
                    className="bg-slate-50 border-slate-300 font-mono font-bold"
                  />
                </div>

                <div className="space-y-1.5 md:col-span-3">
                  <Label className="text-xs font-semibold text-slate-700">Delivery Address *</Label>
                  <Input 
                    placeholder="e.g. 920 TURKMANPUR GITA PRESS, GORAKHPUR UTTAR PRADESH – 273005"
                    value={form.deliveryAddress}
                    onChange={(e) => setForm({ ...form, deliveryAddress: e.target.value })}
                    className="bg-slate-50 border-slate-300"
                  />
                </div>
              </div>
            </div>

            {/* 3. ASSET & PRODUCT DETAILS */}
            <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm space-y-4">
              <h4 className="text-xs font-extrabold uppercase tracking-wider text-[#3F63AD] flex items-center gap-2">
                <Receipt className="w-4 h-4" /> 3. Financed Product / Asset Details
              </h4>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="space-y-1.5 md:col-span-2">
                  <Label className="text-xs font-bold text-slate-700">Product Model Name *</Label>
                  <Input 
                    placeholder="e.g. LLOYD - LED - GL40F5L2RC / iPhone 15 Pro"
                    value={form.model}
                    onChange={(e) => setForm({ ...form, model: e.target.value })}
                    className="bg-slate-50 border-slate-300 font-bold text-slate-900"
                  />
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold text-slate-700">Asset Category</Label>
                  <Select value={form.assetCategory} onValueChange={(v) => setForm({ ...form, assetCategory: v, oemCategory: `${form.manufacturer.split(' ')[0]} - ${v}` })}>
                    <SelectTrigger className="bg-slate-50 border-slate-300"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {ASSET_CATEGORIES.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold text-slate-700">Manufacturer / Brand</Label>
                  <Input 
                    placeholder="e.g. HAVELLS INDIA LTD(Lloyd)"
                    value={form.manufacturer}
                    onChange={(e) => setForm({ ...form, manufacturer: e.target.value })}
                    className="bg-slate-50 border-slate-300"
                  />
                </div>
              </div>
            </div>

            {/* 4. FINANCIAL BREAKDOWN (OFFICIAL DO ROWS A - AA) */}
            <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm space-y-4">
              <div className="flex items-center justify-between border-b pb-2">
                <h4 className="text-xs font-extrabold uppercase tracking-wider text-[#3F63AD] flex items-center gap-2">
                  <CreditCard className="w-4 h-4" /> 4. Financial Calculations & Disbursement Breakdown
                </h4>
                <Badge variant="outline" className="text-[10px] font-mono bg-emerald-50 text-emerald-700 border-emerald-300">
                  Auto-Calculated
                </Badge>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="space-y-1.5">
                  <Label className="text-xs font-bold text-slate-800">Product Price (A) *</Label>
                  <Input 
                    type="number"
                    value={form.productPrice}
                    onChange={(e) => updateFinancials(Number(e.target.value) || 0, form.customerDownPayment, form.dealerInterestSubsidy, form.convenienceFee)}
                    className="bg-slate-50 border-slate-300 font-mono font-bold text-base text-slate-900"
                  />
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs font-bold text-emerald-800">Down Payment from Customer (Y)</Label>
                  <Input 
                    type="number"
                    value={form.customerDownPayment}
                    onChange={(e) => updateFinancials(form.productPrice, Number(e.target.value) || 0, form.dealerInterestSubsidy, form.convenienceFee)}
                    className="bg-emerald-50/70 border-emerald-300 font-mono font-bold text-emerald-900"
                  />
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold text-slate-700">Dealer Subsidy / MBD (H)</Label>
                  <Input 
                    type="number"
                    value={form.dealerInterestSubsidy}
                    onChange={(e) => updateFinancials(form.productPrice, form.customerDownPayment, Number(e.target.value) || 0, form.convenienceFee)}
                    className="bg-slate-50 border-slate-300 font-mono"
                  />
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold text-slate-700">Convenience Fee (W)</Label>
                  <Input 
                    type="number"
                    value={form.convenienceFee}
                    onChange={(e) => updateFinancials(form.productPrice, form.customerDownPayment, form.dealerInterestSubsidy, Number(e.target.value) || 0)}
                    className="bg-slate-50 border-slate-300 font-mono"
                  />
                </div>
              </div>

              {/* LIVE DISBURSEMENT BANNER */}
              <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 text-white p-4 rounded-xl flex flex-wrap items-center justify-between gap-4 mt-3">
                <div>
                  <span className="text-[11px] text-slate-400 block uppercase font-bold">Gross Loan Amount (B)</span>
                  <span className="text-lg font-black font-mono text-white">₹{form.grossLoanAmount.toLocaleString("en-IN")}</span>
                </div>
                <div>
                  <span className="text-[11px] text-amber-300 block uppercase font-bold">Total Deductions (Z)</span>
                  <span className="text-lg font-black font-mono text-amber-200">₹{form.totalDeductions.toLocaleString("en-IN")}</span>
                </div>
                <div>
                  <span className="text-[11px] text-emerald-400 block uppercase font-bold">Expected Net Disbursement (AA)</span>
                  <span className="text-2xl font-black font-mono text-[#76C043]">₹{form.netDisbursement.toLocaleString("en-IN")}</span>
                </div>
                <div>
                  <span className="text-[11px] text-blue-300 block uppercase font-bold">Monthly EMI (P)</span>
                  <span className="text-lg font-black font-mono text-blue-200">₹{form.totalEmi.toLocaleString("en-IN")} / mo</span>
                </div>
              </div>
            </div>

            {/* 5. APPROVAL DETAILS */}
            <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm space-y-4">
              <h4 className="text-xs font-extrabold uppercase tracking-wider text-[#3F63AD] flex items-center gap-2">
                <ShieldCheck className="w-4 h-4" /> 5. Verification & Authorization Signatory
              </h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold text-slate-700">Approval Status</Label>
                  <Select value={form.approvalStatus} onValueChange={(v) => setForm({ ...form, approvalStatus: v })}>
                    <SelectTrigger className="bg-slate-50 border-slate-300 font-bold text-emerald-800"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Approved">Approved (Ready for Delivery)</SelectItem>
                      <SelectItem value="Pending">Pending Verification</SelectItem>
                      <SelectItem value="Disbursed">Disbursed (Settled by Bank)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold text-slate-700">Authorized Signatory Name</Label>
                  <Input 
                    placeholder="e.g. Aditya Saini (Finance Desk)"
                    value={form.signatoryName}
                    onChange={(e) => setForm({ ...form, signatoryName: e.target.value })}
                    className="bg-slate-50 border-slate-300 font-semibold"
                  />
                </div>
              </div>
            </div>

            <DialogFooter className="bg-slate-100 px-6 py-4 rounded-b-2xl border-t border-slate-200 flex items-center justify-between">
              <span className="text-xs text-slate-500 font-medium">
                * Generates official Delivery Order PDF sheet matching Bajaj / HDFC specification format
              </span>
              <div className="flex items-center gap-3">
                <Button type="button" variant="ghost" onClick={() => setIsModalOpen(false)} className="text-slate-600">
                  Cancel
                </Button>
                <Button type="submit" disabled={createDOMutation.isPending} className="bg-[#3F63AD] hover:bg-[#2E4F95] text-white font-bold px-6 shadow-lg">
                  <CheckCircle2 className="w-4 h-4 mr-2" />
                  {createDOMutation.isPending ? "Generating DO..." : "Save & View DO PDF"}
                </Button>
              </div>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </PageShell>
  );
}
