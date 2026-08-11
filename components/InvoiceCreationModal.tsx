import React, { useState, useMemo, useEffect } from "react";
import { Dialog, DialogContent, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Receipt, Users, CreditCard, Sparkles, ShoppingCart, Plus, Trash2, Printer, XCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

function formatCurrency(val: number) {
  return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 2 }).format(val);
}

export function InvoiceCreationModal({ isOpen, onClose, onSuccess, mode = "invoice" }: { isOpen: boolean; onClose: () => void; onSuccess?: () => void; mode?: "invoice" | "estimate" | "sales-order" | "credit-note" }) {
  const queryClient = useQueryClient();

  const { data: customers = [] } = useQuery({
    queryKey: ["customers"],
    queryFn: async () => {
      const res = await fetch("/api/customers");
      const json = await res.json();
      return json.success ? json.data : [];
    }
  });

  const { data: catalogItems = [] } = useQuery({
    queryKey: ["items"],
    queryFn: async () => {
      const res = await fetch("/api/items");
      const json = await res.json();
      return json.success ? json.data : [];
    }
  });

  const { data: invoices = [] } = useQuery({
    queryKey: ["invoices"],
    queryFn: async () => {
      const res = await fetch("/api/invoices");
      const json = await res.json();
      return json.success ? json.data : [];
    }
  });

  const { data: estimatesList = [] } = useQuery({
    queryKey: ["estimates"],
    queryFn: async () => {
      const res = await fetch("/api/estimates");
      const json = await res.json();
      return json.success ? json.data : [];
    }
  });

  const { data: ordersList = [] } = useQuery({
    queryKey: ["orders"],
    queryFn: async () => {
      const res = await fetch("/api/orders");
      const json = await res.json();
      return json.success ? json.data : [];
    }
  });

  const INITIAL_BILLING_FORM = {
    invoiceNo: "",
    invoiceDate: new Date().toISOString().split("T")[0],
    dueDate: new Date(Date.now() + 15 * 86400000).toISOString().split("T")[0],
    customerId: "",
    customerName: "",
    customerPhone: "",
    customerEmail: "",
    customerGstin: "",
    customerAddress: "",
    customerCity: "",
    customerPin: "",
    placeOfSupply: "Uttar Pradesh (09)",
    paymentMode: "Cash Counter",
    paymentStatus: "Paid",
    financeCompany: "Bajaj Finserv",
    financeApprovalNo: "",
    downPayment: 0,
    downPaymentMode: "Cash",
    shippingCharges: 0,
    financeTenureMonths: 6,
    financeSchemeType: "no_cost",
    financeInterestRate: 14,
    salesExecutive: "Rohan Verma (Emp #104)",
    advanceAmount: 0,
    linkedEstimateNumber: "",
    lineItems: [] as any[],
  };

  const [billingForm, setBillingForm] = useState(INITIAL_BILLING_FORM);

  useEffect(() => {
    if (!isOpen) {
      setBillingForm(INITIAL_BILLING_FORM);
    }
  }, [isOpen]);

  useEffect(() => {
    if (isOpen && !billingForm.invoiceNo) {
      setBillingForm(prev => {
        let newNo = "";
        const randomSuffix = Math.floor(1000 + Math.random() * 9000);
        if (mode === "estimate") {
          newNo = `EST-2026-${String(estimatesList.length + 1).padStart(4, "0")}-${randomSuffix}`;
        } else if (mode === "sales-order") {
          newNo = `SO-2026-${String(ordersList.length + 1).padStart(4, "0")}-${randomSuffix}`;
        } else if (mode === "credit-note") {
          newNo = `CN-2026-${String(invoices.filter((i:any) => i.type === "credit-note").length + 1).padStart(4, "0")}-${randomSuffix}`;
        } else {
          newNo = `INV-2026-${String(invoices.filter((i:any) => i.type !== "credit-note").length + 1).padStart(4, "0")}-${randomSuffix}`;
        }
        return { ...prev, invoiceNo: newNo };
      });
    }
  }, [invoices.length, estimatesList.length, ordersList.length, isOpen, billingForm.invoiceNo, mode]);

  const [activeSuggestRow, setActiveSuggestRow] = useState<number | null>(null);

  const billCalculations = useMemo(() => {
    let subtotal = 0;
    let totalTaxable = 0;
    let totalGst = 0;

    billingForm.lineItems.forEach((item) => {
      const lineTaxable = ((item.rate || 0) - (item.discount || 0)) * (item.qty || 1);
      const lineGst = lineTaxable * ((item.gstRate || 0) / 100);
      subtotal += (item.rate || 0) * (item.qty || 1);
      totalTaxable += lineTaxable;
      totalGst += lineGst;
    });

    const isIntraState = billingForm.placeOfSupply.includes("09") || billingForm.placeOfSupply.toLowerCase().includes("uttar pradesh");
    const cgst = isIntraState ? totalGst / 2 : 0;
    const sgst = isIntraState ? totalGst / 2 : 0;
    const igst = isIntraState ? 0 : totalGst;
    const grandTotal = Math.round(totalTaxable + totalGst + Number(billingForm.shippingCharges || 0));

    return { subtotal, totalTaxable, totalGst, cgst, sgst, igst, grandTotal };
  }, [billingForm]);

  const emiBreakdown = useMemo(() => {
    const grandTotal = billCalculations.grandTotal;
    const dp = Number(billingForm.downPayment) || 0;
    const financedPrincipal = Math.max(0, grandTotal - dp);
    const tenure = Number(billingForm.financeTenureMonths) || 6;
    const isNoCost = billingForm.financeSchemeType === "no_cost";
    const annualRate = Number(billingForm.financeInterestRate) || 12;

    if (financedPrincipal === 0 || tenure <= 0) {
      return { financedPrincipal: 0, monthlyEMI: 0, totalInterest: 0, totalPayable: dp, isNoCost: true };
    }

    if (isNoCost) {
      const monthlyEMI = Math.round(financedPrincipal / tenure);
      return { financedPrincipal, monthlyEMI, totalInterest: 0, totalPayable: dp + financedPrincipal, isNoCost: true };
    } else {
      const r = (annualRate / 12) / 100;
      const emiFactor = Math.pow(1 + r, tenure);
      const monthlyEMI = Math.round((financedPrincipal * r * emiFactor) / (emiFactor - 1));
      const totalLoanPayable = monthlyEMI * tenure;
      const totalInterest = Math.max(0, totalLoanPayable - financedPrincipal);
      return { financedPrincipal, monthlyEMI, totalInterest, totalPayable: dp + totalLoanPayable, isNoCost: false };
    }
  }, [billCalculations.grandTotal, billingForm.downPayment, billingForm.financeSchemeType, billingForm.financeInterestRate, billingForm.financeTenureMonths]);

  const handleSelectCustomer = (custId: string) => {
    if (custId === "new") {
      setBillingForm((prev) => ({
        ...prev,
        customerId: "new", customerName: "", customerPhone: "", customerEmail: "", customerGstin: "", customerAddress: "", customerCity: "", customerPin: ""
      }));
      return;
    }
    const found = customers.find((c: any) => c._id === custId);
    if (found) {
      setBillingForm((prev) => ({
        ...prev,
        customerId: found._id,
        customerName: found.name,
        customerPhone: found.phone || "",
        customerEmail: found.email || "",
        customerGstin: found.gstNumber || found.gst || "",
        placeOfSupply: found.billingAddress?.state || found.state || "",
        customerCity: found.billingAddress?.city || found.city || "",
        customerPin: found.billingAddress?.pincode || found.pin || found.pincode || "",
        customerAddress: found.billingAddress?.line1 ? `${found.billingAddress.line1}` : found.address || "",
      }));
    }
  };

  const handleLoadEstimate = (estNumber: string) => {
    const est = estimatesList.find((e: any) => e.estimateNumber === estNumber || e.estimateNo === estNumber);
    if (!est) return;
    
    let matchedCust = null;
    if (est.customerId && est.customerId !== "new") {
      matchedCust = customers.find((c: any) => c._id === est.customerId);
    } else {
      matchedCust = customers.find((c: any) => c.name === est.customerName);
    }
    
    if (matchedCust) {
      handleSelectCustomer(matchedCust._id);
    } else {
      setBillingForm(prev => ({
        ...prev, customerName: est.customerName, customerId: "new"
      }));
    }

    setBillingForm(prev => ({
      ...prev,
      linkedEstimateNumber: estNumber,
      salesExecutive: est.salesPerson || (est.notes?.includes("Estimate generated by ") ? est.notes.split("Estimate generated by ")[1] : prev.salesExecutive),
      lineItems: (est.items || []).map((item: any, idx: number) => ({
        id: String(Date.now() + idx),
        itemId: item.itemId || "",
        itemCode: item.itemCode || "",
        name: item.name || item.itemName || "",
        serialImei: "",
        qty: item.quantity || item.qty || 1,
        rate: item.rate || 0,
        discount: item.discount || 0,
        gstRate: item.tax || item.gstRate || 0,
      }))
    }));
    toast.success(`Loaded Estimate ${estNumber}`);
  };

  const addLineItem = () => {
    setBillingForm((prev) => ({
      ...prev,
      lineItems: [
        ...prev.lineItems,
        { id: String(Date.now()), name: "", serialImei: "", qty: 1, rate: 0, discount: 0, gstRate: 18 },
      ],
    }));
  };

  const removeLineItem = (idx: number) => {
    setBillingForm((prev) => ({
      ...prev,
      lineItems: prev.lineItems.filter((_, i) => i !== idx),
    }));
  };

  const handleLineItemChange = (idx: number, field: string, value: any) => {
    const updated = [...billingForm.lineItems];
    if (field === "qty" && mode === "tax-invoice") {
      const maxStock = updated[idx].maxStock !== undefined ? updated[idx].maxStock : Infinity;
      if (value > maxStock) {
        toast.error(`Only ${maxStock} units in stock!`);
        value = maxStock;
      }
    }
    updated[idx] = { ...updated[idx], [field]: value };
    setBillingForm((prev) => ({ ...prev, lineItems: updated }));
  };

  const selectProductSuggestion = (idx: number, prod: any) => {
    if (mode === "tax-invoice" && (prod.currentStock || 0) <= 0) {
      toast.error(`${prod.name} is out of stock and cannot be invoiced!`);
      setActiveSuggestRow(null);
      return;
    }
    const updated = [...billingForm.lineItems];
    updated[idx] = {
      ...updated[idx],
      name: prod.name,
      rate: prod.sellingPrice || prod.rate || 0,
      gstRate: prod.gstRate || 18,
      itemCode: prod.code,
      itemId: prod._id,
      maxStock: prod.currentStock || Infinity
    };
    setBillingForm((prev) => ({ ...prev, lineItems: updated }));
    setActiveSuggestRow(null);
  };

  const createInvoiceMutation = useMutation({
    mutationFn: async (payload: any) => {
      const res = await fetch("/api/invoices", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });
      const json = await res.json();
      if (!json.success) throw new Error(json.error || "Failed to generate invoice");
      return json.data;
    },
    onSuccess: () => {
      toast.success("Invoice generated successfully");
      queryClient.invalidateQueries({ queryKey: ["invoices"] });
      onSuccess && onSuccess();
      onClose();
    },
    onError: (error: any) => {
      toast.error(error.message || "Failed to generate invoice");
    }
  });

  const handleFinalSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!billingForm.customerName || billingForm.lineItems.length === 0) {
      toast.error("Customer Name and at least 1 item are required.");
      return;
    }
    const formattedItems = billingForm.lineItems.map(item => {
      const lineTaxable = ((item.rate || 0) - (item.discount || 0)) * (item.qty || 1);
      const lineGst = lineTaxable * ((item.gstRate || 0) / 100);
      const isIntraState = billingForm.placeOfSupply.includes("09") || billingForm.placeOfSupply.toLowerCase().includes("uttar pradesh");
      return {
        itemId: item.itemId || `ITEM-${Date.now()}`,
        itemName: item.name,
        itemCode: item.itemCode || "GEN",
        description: item.serialImei ? `IMEI: ${item.serialImei}` : "",
        quantity: item.qty,
        unit: "PCS",
        rate: item.rate,
        discount: item.discount,
        discountType: "amount",
        taxableAmount: lineTaxable,
        gstRate: item.gstRate,
        cgst: isIntraState ? lineGst / 2 : 0,
        sgst: isIntraState ? lineGst / 2 : 0,
        igst: isIntraState ? 0 : lineGst,
        amount: lineTaxable + lineGst
      };
    });

    if (mode === "estimate") {
      const estimateItems = formattedItems.map(fi => ({
        itemCode: fi.itemCode,
        name: fi.itemName,
        quantity: fi.quantity,
        rate: fi.rate,
        tax: fi.gstRate,
        amount: fi.amount
      }));

      const estimatePayload = {
        estimateNumber: billingForm.invoiceNo,
        customerName: billingForm.customerName || "Cash Customer",
        customerId: billingForm.customerId === "new" ? "new" : (billingForm.customerId || null),
        date: billingForm.invoiceDate,
        expiryDate: billingForm.dueDate,
        status: "Sent",
        items: estimateItems,
        subTotal: billCalculations.subtotal,
        taxTotal: billCalculations.totalGst,
        total: billCalculations.grandTotal,
        notes: "Estimate generated by " + billingForm.salesExecutive,
        salesPerson: billingForm.salesExecutive
      };

      try {
        const res = await fetch("/api/estimates", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(estimatePayload)
        });
        const json = await res.json();
        if (json.success) {
          toast.success(`Estimate ${json.data.estimateNumber} generated!`);
          onSuccess?.();
          onClose();
        } else {
          toast.error(json.error || "Failed to create estimate");
        }
      } catch (err) {
        toast.error("Failed to connect to server");
      }
      return;
    }

    createInvoiceMutation.mutate({
      ...billingForm,
      invoiceNumber: billingForm.invoiceNo,
      type: mode === "credit-note" ? "credit-note" : (mode === "sales-order" ? "sales-order" : "tax-invoice"),
      date: billingForm.invoiceDate,
      customerName: billingForm.customerName,
      customer: billingForm.customerName,
      
      items: formattedItems,
      subtotal: billCalculations.subtotal,
      taxableAmount: billCalculations.totalTaxable,
      totalGST: billCalculations.totalGst,
      cgst: billCalculations.cgst,
      sgst: billCalculations.sgst,
      igst: billCalculations.igst,
      total: billCalculations.grandTotal,
      
      paidAmount: mode === "credit-note" ? (billingForm.advanceAmount || 0) : (billingForm.paymentMode.includes("Finance") ? billingForm.downPayment : (mode === "sales-order" ? (billingForm.advanceAmount || 0) : billCalculations.grandTotal)),
      balanceAmount: mode === "credit-note" ? Math.max(0, billCalculations.grandTotal - (billingForm.advanceAmount || 0)) : (billCalculations.grandTotal - (billingForm.paymentMode.includes("Finance") ? billingForm.downPayment : (mode === "sales-order" ? (billingForm.advanceAmount || 0) : billCalculations.grandTotal))),
      status: (mode === "sales-order" ? ((billingForm.advanceAmount || 0) > 0 ? "partial" : "pending") : (mode === "credit-note" ? ((billingForm.advanceAmount || 0) >= billCalculations.grandTotal ? "paid" : "pending") : "paid")),
      monthlyEMI: emiBreakdown.monthlyEMI,
      totalInterest: emiBreakdown.totalInterest,
      linkedEstimateNumber: billingForm.linkedEstimateNumber,
    });
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-5xl max-h-[92vh] overflow-y-auto p-0 rounded-2xl border-none shadow-2xl">
        {/* Header */}
        <div className="bg-gradient-to-r from-[#1B2537] via-[#2C3E5A] to-[#1B2537] text-white p-6 rounded-t-2xl flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-white/10 flex items-center justify-center backdrop-blur-md border border-white/20">
              <Receipt className="w-6 h-6 text-[#76C043]" />
            </div>
            <div>
              <h3 className="text-xl font-bold tracking-tight flex items-center gap-2">
                {mode === "estimate" ? "Create Estimate / Quotation" : mode === "sales-order" ? "Record Sales Order" : mode === "credit-note" ? "Issue Credit Note" : "Generate Tax Invoice"}
                <span className="text-xs px-2 py-0.5 rounded-full bg-[#76C043]/20 text-[#76C043] border border-[#76C043]/30 font-mono">
                  {mode === "estimate" ? "PROFORMA" : mode === "sales-order" ? "ORDER" : mode === "credit-note" ? "CREDIT NOTE" : "B2C / B2B POS"}
                </span>
              </h3>
              <p className="text-xs text-slate-300 mt-0.5">
                {mode === "estimate" 
                  ? "Provide price estimates and commercial quotes to customers without affecting inventory"
                  : mode === "sales-order"
                  ? "Book confirmed customer order with delivery schedules and payment terms"
                  : mode === "credit-note"
                  ? "Issue credit note to customer for sales returns, generating an inventory rollback and ledger adjustment"
                  : "Finalize sale, generate GST tax invoice and process payment receipts"}
              </p>
            </div>
          </div>
        </div>

        <form onSubmit={handleFinalSubmit} className="p-6 space-y-6 bg-slate-50/50">
          {/* CUSTOMER PARTICULARS & INVOICE DETAILS */}
          <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm space-y-4">
            <div className="flex items-center justify-between border-b pb-3">
              <h4 className="text-xs font-extrabold uppercase tracking-wider text-[#3F63AD] flex items-center gap-2">
                <Users className="w-4 h-4 text-[#3F63AD]" /> 1. CUSTOMER PARTICULARS & INVOICE DETAILS
              </h4>
              {mode === "sales-order" && (
                <div className="flex items-center gap-2">
                  <span className="text-xs font-semibold text-slate-500">Import from Estimate:</span>
                  <Select onValueChange={handleLoadEstimate}>
                    <SelectTrigger className="h-8 w-[200px] text-xs bg-blue-50 border-blue-200 font-semibold text-[#3F63AD]">
                      <SelectValue placeholder="Select Estimate..." />
                    </SelectTrigger>
                    <SelectContent>
                      {estimatesList.map((est: any) => (
                        <SelectItem key={est._id} value={est.estimateNumber || est.estimateNo}>
                          {est.estimateNumber || est.estimateNo} - {est.customerName}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-1.5 md:col-span-2">
                <Label className="text-xs font-semibold text-slate-700">Customer / Business Name *</Label>
                {billingForm.customerId === "new" ? (
                  <div className="flex items-center gap-2">
                    <Input placeholder="Enter New Customer Name" value={billingForm.customerName} onChange={(e) => setBillingForm({ ...billingForm, customerName: e.target.value })} className="bg-slate-50 border-slate-300" autoFocus />
                    <Button type="button" variant="ghost" size="icon" className="shrink-0 h-9 w-9" onClick={() => setBillingForm({ ...billingForm, customerId: "", customerName: "" })}><XCircle className="w-4 h-4" /></Button>
                  </div>
                ) : (
                  <Select value={billingForm.customerId} onValueChange={handleSelectCustomer}>
                    <SelectTrigger className="bg-slate-50 border-slate-300">
                      <SelectValue placeholder="Search customer or walk-in..." />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="new" className="font-bold text-[#3F63AD] bg-blue-50/50 mb-1">+ Create New Walk-in Customer...</SelectItem>
                      {customers.map((c: any) => (
                        <SelectItem key={c._id} value={c._id}>{c.name} ({c.phone || c.billingAddress?.city || ""})</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              </div>

                <div className="space-y-1">
                  <Label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">{mode === "estimate" ? "Estimate No." : mode === "sales-order" ? "Order No." : "Invoice No."}</Label>
                  <Input value={billingForm.invoiceNo} onChange={e => setBillingForm({ ...billingForm, invoiceNo: e.target.value })} className="h-8 font-mono text-xs font-bold text-[#3F63AD] bg-blue-50 border-blue-200" />
                </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-slate-700">Phone Contact</Label>
                <Input 
                  type="text"
                  maxLength={10}
                  value={billingForm.customerPhone} 
                  onChange={(e) => {
                    const val = e.target.value.replace(/\D/g, '');
                    if (val.length <= 10) {
                      setBillingForm({ ...billingForm, customerPhone: val });
                    }
                  }} 
                  className="bg-slate-50 border-slate-300 font-mono" 
                />
              </div>

                <div className="space-y-1">
                  <Label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">{mode === "estimate" ? "Valid Until" : "Due Date"}</Label>
                  <Input type="date" min={new Date().toISOString().split('T')[0]} value={billingForm.dueDate} onChange={e => setBillingForm({ ...billingForm, dueDate: e.target.value })} className="h-8 text-xs bg-slate-50 border-slate-300" />
                </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-slate-700">Customer Email ID</Label>
                <Input type="email" value={billingForm.customerEmail} onChange={(e) => setBillingForm({ ...billingForm, customerEmail: e.target.value })} className="bg-slate-50 border-slate-300" />
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-slate-700">GSTIN Number</Label>
                <Input value={billingForm.customerGstin} onChange={(e) => setBillingForm({ ...billingForm, customerGstin: e.target.value })} className="font-mono bg-slate-50 border-slate-300" />
              </div>

              {/* SALES EXECUTIVE ASSIGNMENT */}
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-slate-700">Sales Representative / Executive *</Label>
                <Select value={billingForm.salesExecutive} onValueChange={(v) => setBillingForm({ ...billingForm, salesExecutive: v })}>
                  <SelectTrigger className="bg-blue-50/50 border-blue-200 font-bold text-[#3F63AD]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Rohan Verma (Emp #104)">Rohan Verma (Emp #104)</SelectItem>
                    <SelectItem value="Priya Singh (Emp #108)">Priya Singh (Emp #108)</SelectItem>
                    <SelectItem value="Amit Kumar (Emp #112)">Amit Kumar (Emp #112)</SelectItem>
                    <SelectItem value="Neha Gupta (Emp #115)">Neha Gupta (Emp #115)</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5 md:col-span-1">
                <Label className="text-xs font-semibold text-slate-700">Place of Supply (State)</Label>
                <Select value={billingForm.placeOfSupply} onValueChange={(v) => setBillingForm({ ...billingForm, placeOfSupply: v })}>
                  <SelectTrigger className="bg-slate-50 border-slate-300"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Uttar Pradesh (09)">Uttar Pradesh (09) — Intra-state</SelectItem>
                    <SelectItem value="Maharashtra (27)">Maharashtra (27) — Inter-state</SelectItem>
                    <SelectItem value="Delhi (07)">Delhi (07) — Inter-state</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5 md:col-span-1">
                <Label className="text-xs font-semibold text-slate-700">City</Label>
                <Input value={billingForm.customerCity} onChange={(e) => setBillingForm({ ...billingForm, customerCity: e.target.value })} className="bg-slate-50 border-slate-300" />
              </div>

              <div className="space-y-1.5 md:col-span-1">
                <Label className="text-xs font-semibold text-slate-700">PIN Code</Label>
                <Input value={billingForm.customerPin} onChange={(e) => setBillingForm({ ...billingForm, customerPin: e.target.value })} className="bg-slate-50 border-slate-300" />
              </div>

              <div className="space-y-1.5 md:col-span-4">
                <Label className="text-xs font-semibold text-slate-700">Customer Address</Label>
                <Input value={billingForm.customerAddress} onChange={(e) => setBillingForm({ ...billingForm, customerAddress: e.target.value })} className="bg-slate-50 border-slate-300" />
              </div>
            </div>
          </div>

          {/* ITEMS PARTICULARS SECTION */}
          <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm space-y-4">
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-extrabold uppercase tracking-wider text-[#3F63AD] flex items-center gap-2">
                <ShoppingCart className="w-4 h-4 text-[#3F63AD]" /> 2. ITEMS & SERIAL / IMEI PARTICULARS
              </h4>
              <Button type="button" size="sm" onClick={addLineItem} variant="outline" className="text-xs gap-1 border-[#3F63AD] text-[#3F63AD] font-bold">
                <Plus className="w-3.5 h-3.5" /> Add Product Row
              </Button>
            </div>

            <div className="overflow-visible min-h-[240px]">
              <table className="w-full text-xs text-left">
                <thead className="bg-slate-100 border-b text-slate-700 uppercase font-bold">
                  <tr>
                    <th className="p-2 text-left w-64">ITEM DESCRIPTION</th>
                    <th className="p-2 text-left w-48">SERIAL / IMEI NO.</th>
                    <th className="p-2 text-center w-16">QTY</th>
                    <th className="p-2 text-right w-28">RATE (₹)</th>
                    <th className="p-2 text-right w-24">DISC (₹)</th>
                    <th className="p-2 text-center w-20">GST %</th>
                    <th className="p-2 text-right w-28">LINE TOTAL (₹)</th>
                    <th className="p-2 text-center w-10"></th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {billingForm.lineItems.map((item, idx) => {
                    const lineTaxable = ((item.rate || 0) - (item.discount || 0)) * (item.qty || 1);
                    const lineGst = lineTaxable * ((item.gstRate || 0) / 100);
                    const lineTotal = lineTaxable + lineGst;

                    const query = (item.name || "").toLowerCase().trim();
                    const suggestions = query === ""
                      ? catalogItems
                      : catalogItems.filter(
                          (p: any) => p.name.toLowerCase().includes(query) || (p.code || "").toLowerCase().includes(query)
                        );

                    return (
                      <tr key={item.id} className={cn("transition-colors", activeSuggestRow === idx ? "relative z-50 bg-blue-50/20" : "relative z-10 hover:bg-slate-50")}>
                        <td className="p-2 relative z-50">
                          <Input
                            placeholder="Search catalog products..."
                            value={item.name}
                            onChange={(e) => { handleLineItemChange(idx, "name", e.target.value); setActiveSuggestRow(idx); }}
                            onFocus={() => setActiveSuggestRow(idx)}
                            onBlur={() => setTimeout(() => setActiveSuggestRow(null), 250)}
                            className="h-8 text-xs bg-slate-50 border-slate-300 font-semibold"
                          />
                          {activeSuggestRow === idx && suggestions.length > 0 && (
                            <div className="absolute left-0 top-10 w-[420px] bg-white border-2 border-[#3F63AD] shadow-2xl rounded-xl z-[9999] max-h-64 overflow-y-auto divide-y divide-slate-100 p-1 font-sans">
                              <div className="px-3 py-1.5 bg-slate-100 text-[10px] font-bold text-slate-600 uppercase tracking-wider flex justify-between">
                                <span>Catalog Match ({suggestions.length} items)</span>
                                <span>Click to select</span>
                              </div>
                              {suggestions.map((prod: any, pIdx: number) => (
                                <div key={pIdx} onMouseDown={(e) => { e.preventDefault(); selectProductSuggestion(idx, prod); }} className="p-2.5 hover:bg-blue-50 cursor-pointer flex items-center justify-between transition-colors rounded-lg group">
                                  <div className="flex-1 min-w-0 pr-2">
                                    <div className="flex items-center gap-2 mb-0.5">
                                      <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-blue-100 text-[#3F63AD]">{prod.category || "General"}</span>
                                      <span className="text-[10px] font-mono font-bold text-slate-600">CODE: {prod.code}</span>
                                    </div>
                                    <p className="font-bold text-slate-900 text-xs truncate group-hover:text-[#3F63AD]">{prod.name}</p>
                                    <p className="text-[10px] text-slate-500">GST Slab: <span className="font-semibold text-slate-700">{prod.gstRate}%</span></p>
                                  </div>
                                  <div className="text-right flex-none">
                                    <span className="font-black text-[#76C043] text-xs block">{formatCurrency(prod.sellingPrice || prod.rate || 0)}</span>
                                  </div>
                                </div>
                              ))}
                            </div>
                          )}
                        </td>
                        <td className="p-2"><Input placeholder="IMEI 3591820..." value={item.serialImei} onChange={(e) => handleLineItemChange(idx, "serialImei", e.target.value)} className="h-8 text-xs bg-slate-50 border-slate-300 font-mono px-2" /></td>
                        <td className="p-2"><Input type="number" min="1" value={item.qty} onKeyDown={(e) => ["-", "+", "e", "E"].includes(e.key) && e.preventDefault()} onChange={(e) => handleLineItemChange(idx, "qty", Math.max(1, Number(e.target.value)))} className="h-8 text-xs bg-slate-50 border-slate-300 text-center font-bold px-1" /></td>
                        <td className="p-2"><Input type="number" min="0" value={item.rate === 0 ? "" : item.rate} onKeyDown={(e) => ["-", "+", "e", "E"].includes(e.key) && e.preventDefault()} onChange={(e) => handleLineItemChange(idx, "rate", Math.max(0, Number(e.target.value)))} className="h-8 text-xs bg-slate-50 border-slate-300 text-right font-semibold px-2" /></td>
                        <td className="p-2"><Input type="number" min="0" value={item.discount === 0 ? "" : item.discount} onKeyDown={(e) => ["-", "+", "e", "E"].includes(e.key) && e.preventDefault()} onChange={(e) => handleLineItemChange(idx, "discount", Math.max(0, Number(e.target.value)))} className="h-8 text-xs bg-slate-50 border-slate-300 text-right text-emerald-600 font-semibold px-2" /></td>
                        <td className="p-2">
                          <select value={item.gstRate} onChange={(e) => handleLineItemChange(idx, "gstRate", Number(e.target.value))} className="w-full h-8 rounded-md border border-slate-300 bg-slate-50 text-xs text-center">
                            <option value="0">0%</option><option value="5">5%</option><option value="12">12%</option><option value="18">18%</option><option value="28">28%</option>
                          </select>
                        </td>
                        <td className="p-2 text-right font-bold text-slate-900">{formatCurrency(lineTotal)}</td>
                        <td className="p-2 text-center">
                          <button type="button" onClick={() => removeLineItem(idx)} className="text-red-500 hover:text-red-700 p-1"><Trash2 className="w-4 h-4" /></button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* PAYMENT MODE & FINANCE SPLIT */}
          {mode !== "estimate" && mode !== "credit-note" && (
            <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm space-y-4">
              <div className="space-y-1.5 pt-2">
                <Label className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
                  <CreditCard className="w-3.5 h-3.5 text-[#3F63AD]" /> Payment Mode & Finance Split
                </Label>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  <Select value={billingForm.paymentMode} onValueChange={(v) => setBillingForm({ ...billingForm, paymentMode: v })}>
                    <SelectTrigger className="bg-slate-50 border-slate-300 font-semibold"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Cash Counter">Cash Counter</SelectItem>
                      <SelectItem value="UPI / Card / NetBanking">UPI / Card / NetBanking</SelectItem>
                      <SelectItem value="Finance / Consumer EMI">Finance / Consumer EMI (Bajaj, HDB, TVS)</SelectItem>
                    </SelectContent>
                  </Select>

                  {!billingForm.paymentMode.includes("Finance") && mode === "sales-order" && (
                    <div className="md:col-span-2 flex flex-col justify-end">
                       <Label className="text-xs font-semibold text-slate-700 mb-1.5">Advance Amount Received (₹)</Label>
                       <Input 
                         type="number" min="0"
                         onKeyDown={(e) => ["-", "+", "e", "E"].includes(e.key) && e.preventDefault()}
                         value={billingForm.advanceAmount || ""} 
                         onChange={(e) => setBillingForm({ ...billingForm, advanceAmount: Math.max(0, Number(e.target.value)) })}
                         className="bg-slate-50 border-slate-300 font-semibold"
                         placeholder="e.g. 5000"
                       />
                    </div>
                  )}

                  {billingForm.paymentMode.includes("Finance") && (
                    <>
                      <Select value={billingForm.financeCompany} onValueChange={(v) => setBillingForm({ ...billingForm, financeCompany: v })}>
                        <SelectTrigger className="bg-amber-50 border-amber-300 font-bold text-amber-900"><SelectValue placeholder="Select Finance Provider" /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Bajaj Finserv">Bajaj Finserv</SelectItem><SelectItem value="HDB Financial Services">HDB Financial Services</SelectItem><SelectItem value="TVS Credit">TVS Credit</SelectItem>
                        </SelectContent>
                      </Select>
                      <Input placeholder="Loan / Approval #" value={billingForm.financeApprovalNo} onChange={(e) => setBillingForm({ ...billingForm, financeApprovalNo: e.target.value })} className="bg-amber-50 border-amber-300 font-mono text-xs" />
                    </>
                  )}
                </div>

                {billingForm.paymentMode.includes("Finance") && (
                  <div className="mt-3 p-4 bg-gradient-to-br from-amber-50 to-orange-50/50 rounded-xl border border-amber-200/80 space-y-3">
                    <div className="flex items-center justify-between border-b border-amber-200/60 pb-2">
                      <span className="text-xs font-black text-amber-900 uppercase tracking-wider flex items-center gap-1.5">
                        <Sparkles className="w-3.5 h-3.5 text-amber-600" /> Consumer Finance & EMI Breakdown
                      </span>
                      <div className="flex items-center bg-white/80 p-0.5 rounded-lg border border-amber-200">
                        <button type="button" onClick={() => setBillingForm((prev) => ({ ...prev, financeSchemeType: "no_cost" }))} className={cn("px-2.5 py-0.5 rounded-md text-[11px] font-bold transition-all", billingForm.financeSchemeType === "no_cost" ? "bg-amber-600 text-white shadow-sm" : "text-amber-900 hover:bg-amber-100")}>No-Cost EMI (0%)</button>
                        <button type="button" onClick={() => setBillingForm((prev) => ({ ...prev, financeSchemeType: "standard_interest" }))} className={cn("px-2.5 py-0.5 rounded-md text-[11px] font-bold transition-all", billingForm.financeSchemeType === "standard_interest" ? "bg-amber-600 text-white shadow-sm" : "text-amber-900 hover:bg-amber-100")}>Standard Interest</button>
                      </div>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-5 gap-3 text-xs">
                      <div><Label className="text-[11px] font-extrabold text-amber-950">Down Payment (₹)</Label><Input type="number" min="0" onKeyDown={(e) => ["-", "+", "e", "E"].includes(e.key) && e.preventDefault()} value={billingForm.downPayment} onChange={(e) => setBillingForm({ ...billingForm, downPayment: Math.max(0, Number(e.target.value)) })} className="h-8 bg-white border-amber-300 font-black text-emerald-700 mt-1 shadow-sm" /></div>
                      <div>
                        <Label className="text-[11px] font-bold text-amber-900">Down Payment Mode</Label>
                        <Select value={billingForm.downPaymentMode} onValueChange={(v) => setBillingForm({ ...billingForm, downPaymentMode: v })}><SelectTrigger className="h-8 bg-white border-amber-300 mt-1 font-bold text-slate-800"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="Cash">Cash</SelectItem><SelectItem value="UPI / PhonePe / GPay">UPI / PhonePe / GPay</SelectItem></SelectContent></Select>
                      </div>
                      <div><Label className="text-[11px] font-bold text-amber-900">Financed Amount (₹)</Label><Input readOnly value={formatCurrency(emiBreakdown.financedPrincipal)} className="h-8 bg-amber-100/60 border-amber-300 font-black text-purple-900 mt-1" /></div>
                      {billingForm.financeSchemeType === "standard_interest" ? (
                        <div><Label className="text-[11px] font-bold text-amber-900">Interest Rate (% p.a.)</Label><Select value={String(billingForm.financeInterestRate)} onValueChange={(v) => setBillingForm({ ...billingForm, financeInterestRate: Number(v) })}><SelectTrigger className="h-8 bg-white border-amber-300 mt-1 font-bold text-slate-800"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="10">10%</SelectItem><SelectItem value="12">12%</SelectItem><SelectItem value="14">14%</SelectItem><SelectItem value="16">16%</SelectItem><SelectItem value="18">18%</SelectItem><SelectItem value="24">24%</SelectItem></SelectContent></Select></div>
                      ) : (
                        <div><Label className="text-[11px] font-bold text-amber-900">Interest Rate</Label><div className="h-8 bg-emerald-100/70 border border-emerald-300 rounded-md mt-1 flex items-center px-2 font-bold text-emerald-800 text-[11px]">0% (No-Cost Offer)</div></div>
                      )}
                      <div>
                        <Label className="text-[11px] font-bold text-amber-900">EMI Tenure (Months)</Label>
                        <Select value={String(billingForm.financeTenureMonths)} onValueChange={(v) => setBillingForm({ ...billingForm, financeTenureMonths: Number(v) })}><SelectTrigger className="h-8 bg-white border-amber-300 mt-1 font-bold text-slate-800"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="3">3 Months</SelectItem><SelectItem value="6">6 Months</SelectItem><SelectItem value="9">9 Months</SelectItem><SelectItem value="12">12 Months</SelectItem><SelectItem value="18">18 Months</SelectItem><SelectItem value="24">24 Months</SelectItem></SelectContent></Select>
                      </div>
                    </div>
                    <div className="bg-white/90 p-3 rounded-lg border border-amber-200 flex flex-wrap items-center justify-between gap-2">
                      <div className="text-xs"><span className="text-muted-foreground font-medium">Monthly Installment: </span><span className="text-base font-black text-slate-900 ml-1">{formatCurrency(emiBreakdown.monthlyEMI)} <span className="text-xs font-normal text-slate-500">/ month</span></span></div>
                      <div className="text-xs text-right">
                        {billingForm.financeSchemeType === "no_cost" ? (
                          <Badge variant="outline" className="font-bold text-emerald-700 bg-emerald-50 border-emerald-300">No-Cost EMI (0% Interest Offer)</Badge>
                        ) : (
                          <span className="font-bold text-amber-900">Total Interest Charge: <span className="text-red-600">{formatCurrency(emiBreakdown.totalInterest)}</span></span>
                        )}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* REFUND MODE FOR CREDIT NOTES */}
          {mode === "credit-note" && (
            <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm space-y-4">
              <div className="space-y-1.5 pt-2">
                <Label className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
                  <CreditCard className="w-3.5 h-3.5 text-[#3F63AD]" /> Refund / Settlement Details
                </Label>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  <Select value={billingForm.paymentMode} onValueChange={(v) => setBillingForm({ ...billingForm, paymentMode: v })}>
                    <SelectTrigger className="bg-slate-50 border-slate-300 font-semibold"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Cash Counter">Cash Counter</SelectItem>
                      <SelectItem value="UPI / Card / NetBanking">UPI / Card / NetBanking</SelectItem>
                    </SelectContent>
                  </Select>

                  <div className="md:col-span-2 flex flex-col justify-end">
                     <Label className="text-xs font-semibold text-slate-700 mb-1.5">Amount Refunded / Paid (₹)</Label>
                     <Input 
                       type="number" min="0"
                       onKeyDown={(e) => ["-", "+", "e", "E"].includes(e.key) && e.preventDefault()}
                       value={billingForm.advanceAmount || ""} 
                       onChange={(e) => setBillingForm({ ...billingForm, advanceAmount: Math.max(0, Number(e.target.value)) })}
                       className="bg-slate-50 border-slate-300 font-semibold"
                       placeholder="e.g. 5000"
                     />
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TOTALS */}
          <div className="bg-[#1B2537] text-white p-5 rounded-xl border border-slate-800 shadow-md flex flex-wrap items-center justify-between gap-4">
            <div className="space-y-1 text-xs">
              <p className="text-slate-300">Total Items Count: <span className="font-bold text-white">{billingForm.lineItems.length} Products</span></p>
              <p className="text-slate-300">Taxable Subtotal: <span className="font-bold text-white">{formatCurrency(billCalculations.subtotal)}</span></p>
              <p className="text-slate-300">Total GST Tax: <span className="font-bold text-[#76C043]">{formatCurrency(billCalculations.totalGst)}</span></p>
            </div>
            <div className="text-right">
              <p className="text-xs uppercase text-slate-400 font-semibold">Grand Total Payable</p>
              <p className="text-2xl font-black text-[#76C043]">{formatCurrency(billCalculations.grandTotal)}</p>
            </div>
          </div>

          <DialogFooter className="bg-slate-100 px-6 py-4 rounded-b-2xl border-t border-slate-200 flex items-center justify-between">
            <span className="text-xs text-slate-500 font-medium">* Generates official GST Tax Invoice with VALUEPLUS brand & printable layout</span>
            <div className="flex justify-end gap-3">
              <Button type="button" variant="ghost" onClick={onClose} className="text-slate-600">Cancel</Button>
              <Button type="submit" disabled={createInvoiceMutation.isPending} className="bg-[#3F63AD] hover:bg-[#2E4F95] shadow-lg shadow-blue-900/20">
                <Receipt className="w-4 h-4 mr-2" />
                {mode === "estimate" ? "Generate Estimate" : mode === "credit-note" ? "Issue Credit Note" : "Generate Invoice"}
              </Button>
            </div>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
