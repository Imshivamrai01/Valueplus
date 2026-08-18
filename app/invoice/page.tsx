"use client";

import React, { useState, useMemo, useEffect, Suspense } from "react";
import { 
  Printer, Download, Send, MessageSquare, Edit3, Plus, Trash2, CheckCircle2, 
  ArrowLeft, FileText, Building2, User, CreditCard, Layers, Sparkles, Share2, Phone
} from "lucide-react";
import { toast } from "sonner";
import Link from "next/link";
import { useSearchParams } from "next/navigation";

// ─── HELPERS ───────────────────────────────────────────────────
function formatCurrency(amount: number) {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 2,
  }).format(amount || 0).replace("INR", "₹");
}

function numberToWordsIndian(num: number): string {
  const a = ['', 'One ', 'Two ', 'Three ', 'Four ', 'Five ', 'Six ', 'Seven ', 'Eight ', 'Nine ', 'Ten ', 'Eleven ', 'Twelve ', 'Thirteen ', 'Fourteen ', 'Fifteen ', 'Sixteen ', 'Seventeen ', 'Eighteen ', 'Nineteen '];
  const b = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];

  const inWords = (n: number): string => {
    if (n < 20) return a[n];
    const digit = n % 10;
    return b[Math.floor(n / 10)] + (digit ? ' ' + a[digit] : '');
  };

  if (num === 0) return 'Rupees Zero Only';

  let n = Math.floor(Math.abs(num));
  let str = '';

  if (Math.floor(n / 10000000) > 0) {
    str += inWords(Math.floor(n / 10000000)) + 'Crore ';
    n %= 10000000;
  }
  if (Math.floor(n / 100000) > 0) {
    str += inWords(Math.floor(n / 100000)) + 'Lakh ';
    n %= 100000;
  }
  if (Math.floor(n / 1000) > 0) {
    str += inWords(Math.floor(n / 1000)) + 'Thousand ';
    n %= 1000;
  }
  if (Math.floor(n / 100) > 0) {
    str += inWords(Math.floor(n / 100)) + 'Hundred ';
    n %= 100;
  }
  if (n > 0) {
    if (str !== '') str += 'and ';
    str += inWords(n);
  }

  return `${str.trim()} Rupees Only`;
}

interface ValueplusInvoiceProps {
  invoiceData?: any;
  onBack?: () => void;
}

function ValueplusInvoiceContent({ invoiceData: propInvoiceData, onBack }: ValueplusInvoiceProps = {}) {
  const searchParams = useSearchParams();
  const billIdFromUrl = searchParams?.get("billid") || searchParams?.get("id") || searchParams?.get("invoiceNumber");


  const [invoice, setInvoice] = useState<any>(propInvoiceData || null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (propInvoiceData) {
      setInvoice(propInvoiceData);
    } else if (billIdFromUrl) {
      setLoading(true);
      fetch(`/api/invoices`)
        .then((res) => res.json())
        .then((json) => {
          if (json.success && json.data) {
            const found = json.data.find((inv: any) => 
              inv.invoiceNumber === billIdFromUrl || 
              inv._id === billIdFromUrl || 
              inv.invoiceNumber.includes(billIdFromUrl)
            );
            if (found) {
              setInvoice(found);
            }
          }
        })
        .catch((err) => console.error(err))
        .finally(() => setLoading(false));
    }
  }, [propInvoiceData, billIdFromUrl]);

  // Default fallback data matching the VP.pdf reference invoice
  const activeData = useMemo(() => {
    if (invoice) {
      const isEst = Boolean(
        invoice.type === "estimate" ||
        invoice.type === "proforma" ||
        invoice.isEstimate ||
        invoice.estimateNumber ||
        (invoice.invoiceNumber && invoice.invoiceNumber.startsWith("EST-")) ||
        (invoice.docNo && invoice.docNo.startsWith("EST-"))
      );

      return {
        isEstimate: isEst,
        companyName: "M/S ASHOKA ENTERPRISES",
        companyAddress: "H. NO. 116, NEAR SHANTI MARRIAGE HOUSE DEORIA ROAD, KUNRAGHAT GORAKHPUR",
        companyPhone: "9140860604",
        companyWeb: "www.valueplus.in",
        companyGstin: "09ANHPJ7242D1Z2",
        companyPan: "ANHPJ7242D",
        companyState: "Uttar Pradesh(09)",
        salesExec: invoice.salesperson || invoice.salesExecutive || invoice.salespersonName || invoice.createdBy || "AMIT SINGH",
        
        docNo: invoice.estimateNumber || invoice.invoiceNumber || invoice.docNo || "EST-2026-0001",
        dated: invoice.date ? (typeof invoice.date === 'string' && invoice.date.includes('T') ? invoice.date.split('T')[0] : invoice.date) : "15/08/2026",
        
        customerName: invoice.customerName || "Cash Customer",
        customerPhone: invoice.customerPhone || "7985803562",
        customerGstin: invoice.customerGST || invoice.customerGstin || "",
        customerPan: invoice.customerPAN || invoice.customerPan || "",
        customerState: invoice.customerState || invoice.placeOfSupply || "Uttar Pradesh(09)",
        shippingAddress: invoice.shippingAddress || invoice.customerAddress || "c31 divya nagar, gorakhpur, Uttar Pradesh(09)",
        
        items: (invoice.items || []).map((it: any, idx: number) => {
          const qty = Number(it.quantity || it.qty || 1);
          const rate = Number(it.rate || 0);
          const discount = Number(it.discount || 0);
          const taxable = it.taxableAmount || (rate - discount) * qty;
          const gstRate = Number(it.gstRate || 18);
          const isIntra = !invoice.placeOfSupply || invoice.placeOfSupply.includes("09") || invoice.placeOfSupply.includes("Uttar Pradesh");
          const halfRate = gstRate / 2;
          const halfGst = (taxable * (halfRate / 100));

          return {
            sno: idx + 1,
            name: it.itemName || it.name || "Product Item",
            vpCode: it.vpCode || it.itemCode || "",
            batchNo: it.batchNumber || it.batchNo || (idx === 0 ? "605PLTV314681" : ""),
            serialNo: it.serialNumber || it.serialImei || "",
            extendedWarranty: it.extendedWarrantyPlan || "",
            extendedWarrantyAmount: it.extendedWarrantyAmount || 0,
            hsn: it.hsn || it.hsnCode || "85287217",
            uom: it.unit || "Pcs",
            qty,
            rate,
            amount: taxable,
            disc: discount,
            taxableValue: taxable,
            sgstRate: isIntra ? halfRate : 0,
            sgstAmount: isIntra ? (it.sgst || halfGst) : 0,
            cgstRate: isIntra ? halfRate : 0,
            cgstAmount: isIntra ? (it.cgst || halfGst) : 0,
            igstRate: isIntra ? 0 : gstRate,
            igstAmount: isIntra ? 0 : (it.igst || (taxable * (gstRate / 100))),
            total: it.amount || (taxable + (taxable * (gstRate / 100)) + (it.extendedWarrantyAmount || 0)),
          };
        }),
        
        subtotal: invoice.subtotal || invoice.taxableAmount || 21610.17,
        totalGst: invoice.totalGST || 3889.84,
        cgst: invoice.cgst || 1944.92,
        sgst: invoice.sgst || 1944.92,
        igst: invoice.igst || 0,
        roundOff: invoice.roundOff || 0.01,
        netAmount: invoice.total || 25500.00,
        extendedWarrantyTotal: invoice.extendedWarrantyTotal || 0,
        
        paymentMode: invoice.paymentMode || "Cash",
        paidAmount: invoice.paidAmount || invoice.total || 25500.00,
        balanceAmount: invoice.balanceAmount || 0,
        vehicleNumber: invoice.vehicleNumber || "",
        financeDoId: invoice.financeDoId || "",
        deliveryChallanNo: invoice.deliveryChallanNo || "",
        reprintCount: invoice.reprintCount || 0,
        lastPrintedAt: invoice.lastPrintedAt || "",
      };
    }

    // Default reference specimen matching VP.pdf
    return {
      companyName: "M/S ASHOKA ENTERPRISES",
      companyAddress: "H. NO. 116, NEAR SHANTI MARRIAGE HOUSE DEORIA ROAD, KUNRAGHAT GORAKHPUR",
      companyPhone: "9140860604",
      companyWeb: "www.valueplus.in",
      companyGstin: "09ANHPJ7242D1Z2",
      companyPan: "ANHPJ7242D",
      companyState: "Uttar Pradesh(09)",
      salesExec: "AMIT SINGH",
      
      docNo: "SVAK2026RI00602",
      dated: "15/08/2026",
      
      customerName: "AJAY TIWARI",
      customerPhone: "7985803562",
      customerGstin: "",
      customerPan: "",
      customerState: "Uttar Pradesh(09)",
      shippingAddress: "c31 divya nagar, gorakhpur, Uttar Pradesh(09)",
      
      items: [
        {
          sno: 1,
          name: "43LR56006LC.ATR- LG (43LR56006LC.ATR- LG)",
          vpCode: "VP-LED-001",
          batchNo: "605PLTV314681",
          serialNo: "SN43LG881923",
          extendedWarranty: "1 Year Extended Warranty",
          extendedWarrantyAmount: 0,
          hsn: "85287217",
          uom: "Pcs",
          qty: 1,
          rate: 21610.1695,
          amount: 21610.17,
          disc: 0.00,
          taxableValue: 21610.17,
          sgstRate: 9.00,
          sgstAmount: 1944.92,
          cgstRate: 9.00,
          cgstAmount: 1944.92,
          igstRate: 0,
          igstAmount: 0,
          total: 25500.00,
        }
      ],
      
      subtotal: 21610.17,
      totalGst: 3889.84,
      cgst: 1944.92,
      sgst: 1944.92,
      igst: 0,
      roundOff: 0.01,
      netAmount: 25500.00,
      extendedWarrantyTotal: 0,
      
      paymentMode: "Cash",
      paidAmount: 25500.00,
      balanceAmount: 0,
      vehicleNumber: "",
      financeDoId: "",
      deliveryChallanNo: "",
      reprintCount: 0,
      lastPrintedAt: "",
    };
  }, [invoice]);

  const handlePrint = async () => {
    try {
      if (!activeData.isEstimate && activeData.docNo) {
        const res = await fetch("/api/invoices/print", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ invoiceNumber: activeData.docNo })
        });
        const json = await res.json();
        if (json.success && json.reprintCount) {
          setInvoice((prev: any) => prev ? { ...prev, reprintCount: json.reprintCount, lastPrintedAt: json.lastPrintedAt } : prev);
        }
      }
    } catch (e) {
      console.error("Error logging reprint count:", e);
    }
    window.print();
  };

  const handleWhatsApp = () => {
    const phone = (activeData.customerPhone || "").replace(/\D/g, "");
    if (!phone) {
      toast.error("Customer phone number not available for WhatsApp");
      return;
    }
    const cleanPhone = phone.length === 10 ? `91${phone}` : phone;
    const msg = encodeURIComponent(
      activeData.isEstimate
        ? `*VALUE PLUS / ASHOKA ENTERPRISES*\nCommercial Price Estimate #${activeData.docNo}\nDate: ${activeData.dated}\nCustomer: ${activeData.customerName}\nSalesperson: ${activeData.salesExec}\nTotal Estimated Amount: ₹${activeData.netAmount.toLocaleString("en-IN")}\nValidity: 15 Days\n\nThank you for choosing Value Plus! For queries call 9140860604.`
        : `*VALUE PLUS / ASHOKA ENTERPRISES*\nTax Invoice #${activeData.docNo}\nDate: ${activeData.dated}\nCustomer: ${activeData.customerName}\nSalesperson: ${activeData.salesExec}\nTotal Amount: ₹${activeData.netAmount.toLocaleString("en-IN")}\nStatus: Paid\n\nThank you for choosing Value Plus! For assistance call 9140860604.`
    );
    window.open(`https://wa.me/${cleanPhone}?text=${msg}`, "_blank");
  };

  const handleEmail = () => {
    const docTitle = activeData.isEstimate ? "Commercial Estimate" : "Tax Invoice";
    const subject = encodeURIComponent(`${docTitle} #${activeData.docNo} - Value Plus`);
    const body = encodeURIComponent(`Dear ${activeData.customerName},\n\nPlease find the ${docTitle} #${activeData.docNo} for ₹${activeData.netAmount}.\nSalesperson: ${activeData.salesExec}\n\nValue Plus / Ashoka Enterprises\nGorakhpur`);
    window.open(`mailto:?subject=${subject}&body=${body}`, "_blank");
  };

  const handleDownload = async () => {
    toast.info(`Preparing ${activeData.isEstimate ? "Estimate" : "Tax Invoice"} print/PDF rendering...`);
    await handlePrint();
  };

  return (
    <div className="min-h-screen bg-slate-100 p-4 md:p-8 print:p-0 print:bg-white text-slate-900 font-sans">
      {/* ─── ACTION BAR (HIDDEN IN PRINT) ────────────────────────── */}
      <div className="max-w-[860px] mx-auto mb-6 bg-white p-4 rounded-xl shadow-sm border border-slate-200 flex flex-wrap items-center justify-between gap-3 print:hidden">
        <div className="flex items-center gap-2">
          {onBack ? (
            <button onClick={onBack} className="px-3 py-1.5 rounded-lg border text-xs font-semibold hover:bg-slate-50 flex items-center gap-1.5">
              <ArrowLeft className="w-3.5 h-3.5" /> Back
            </button>
          ) : (
            <Link href={activeData.isEstimate ? "/sales/estimates" : "/sales/invoices"} className="px-3 py-1.5 rounded-lg border text-xs font-semibold hover:bg-slate-50 flex items-center gap-1.5">
              <ArrowLeft className="w-3.5 h-3.5" /> {activeData.isEstimate ? "Estimates List" : "Invoices List"}
            </Link>
          )}
          <span className="text-xs font-mono font-bold text-slate-600 bg-slate-100 px-2.5 py-1 rounded-md">
            {activeData.isEstimate ? "Estimate No: " : "Doc.No: "} {activeData.docNo}
          </span>
          {!activeData.isEstimate && (
            <span className={`text-[11px] font-mono font-bold px-2 py-0.5 rounded-md border ${
              (activeData.reprintCount || 0) > 0 
                ? "bg-amber-50 text-amber-800 border-amber-300" 
                : "bg-slate-100 text-slate-700 border-slate-200"
            }`}>
              🖨️ Reprints: {activeData.reprintCount || 0}
            </span>
          )}
          {activeData.isEstimate && (
            <span className="text-[11px] font-bold text-blue-700 bg-blue-50 border border-blue-200 px-2 py-0.5 rounded-md">
              Salesperson: {activeData.salesExec}
            </span>
          )}
        </div>

        <div className="flex items-center gap-2">
          <button onClick={handleDownload} className="px-3 py-1.5 rounded-lg border border-slate-300 hover:bg-slate-50 text-slate-800 text-xs font-bold flex items-center gap-1.5 shadow-sm">
            <Download className="w-3.5 h-3.5" /> Download PDF
          </button>
          <button onClick={handlePrint} className="px-4 py-1.5 rounded-lg bg-[#30539C] hover:bg-[#203a70] text-white text-xs font-bold flex items-center gap-1.5 shadow-sm">
            <Printer className="w-3.5 h-3.5" /> {activeData.isEstimate ? "Print Estimate" : "Print Invoice"}
          </button>
        </div>
      </div>

      {/* ─── OFFICIAL VALUE PLUS TAX INVOICE / ESTIMATE SPECIFICATION CONTAINER ─── */}
      <div className="max-w-[860px] mx-auto bg-white border border-slate-400 p-8 shadow-xl print:border-none print:shadow-none print:p-0 print:m-0 text-[11px] leading-tight">
        
        {/* TOP HEADER: BRAND LOGO */}
        <div className="flex flex-col items-center justify-center pb-2 border-b border-slate-300">
          <div className="flex items-center text-3xl font-black tracking-tight">
            <span className="text-[#30539C]">VALUE</span>
            <span className="text-[#76C043]">PLUS</span>
          </div>
          <p className="text-[10px] text-slate-500 tracking-wider mt-0.5">plug into great experience |</p>
          <div className="flex items-center gap-2 mt-1">
            <span className="h-[1px] w-6 bg-slate-400" />
            <span className="text-xs font-bold text-slate-800 tracking-wider font-hindi">— रिश्ता विश्वास का —</span>
            <span className="h-[1px] w-6 bg-slate-400" />
          </div>
        </div>

        {/* INVOICE / ESTIMATE TITLE & META ROW */}
        <div className="flex items-center justify-between py-2 border-b border-slate-400 font-bold">
          {activeData.isEstimate ? (
            <span className="text-xs text-[#30539C] font-black uppercase tracking-wide">
              COMMERCIAL ESTIMATE / QUOTATION <span className="font-normal text-[10px] text-slate-600">(Price Estimate · Not a Tax Invoice)</span>
            </span>
          ) : (
            <span className="text-xs flex items-center gap-1.5">
              TAX INVOICE 
              <span className={`font-bold text-[10px] ${
                (activeData.reprintCount || 0) > 0 
                  ? "text-amber-700 bg-amber-50 px-1.5 py-0.2 rounded border border-amber-300 font-mono font-black" 
                  : "text-slate-600 font-normal"
              }`}>
                {(activeData.reprintCount || 0) > 0 
                  ? `(DUPLICATE / REPRINT #${activeData.reprintCount})` 
                  : "(Original for Recipient)"}
              </span>
            </span>
          )}
          <span className="text-xs font-mono">
            {activeData.isEstimate ? "Estimate No : " : "Doc.No : "}
            <span className="text-black font-black">{activeData.docNo}</span>
          </span>
          <span className="text-xs">Dated : <span className="font-mono">{activeData.dated}</span></span>
        </div>

        {/* COMPANY & SALES EXECUTIVE / SALESPERSON DETAILS */}
        <div className="grid grid-cols-12 border-b border-slate-400 py-2 gap-2">
          <div className="col-span-5 pr-2">
            <p className="font-black text-xs text-slate-900">{activeData.companyName}</p>
            <p className="text-[10px] text-slate-700 uppercase mt-0.5">{activeData.companyAddress}</p>
            <p className="text-[10px] text-slate-800 mt-1">
              Ph:<span className="font-mono font-bold">{activeData.companyPhone}</span> Web: <span className="font-mono">{activeData.companyWeb}</span>
            </p>
          </div>

          <div className="col-span-4 pl-2 border-l border-slate-300 text-[10px] space-y-0.5">
            <p><span className="font-semibold">GSTIN :</span> <span className="font-mono font-bold">{activeData.companyGstin}</span></p>
            <p><span className="font-semibold">State :</span> {activeData.companyState}</p>
            <p><span className="font-semibold">PAN :</span> <span className="font-mono font-bold">{activeData.companyPan}</span></p>
          </div>

          <div className="col-span-3 text-right text-[10px]">
            <p className="font-bold text-slate-900">
              {activeData.isEstimate ? "Salesperson : " : "Sales Exec. : "}
              <span className="uppercase font-black text-[#30539C]">{activeData.salesExec}</span>
            </p>
          </div>
        </div>

        {/* BILL TO / TAX DETAILS / SHIPPING DETAILS (3 COLUMNS) */}
        <div className="grid grid-cols-12 border-b border-slate-400 text-[10px] divide-x divide-slate-400">
          {/* Col 1: Bill To */}
          <div className="col-span-4 p-2 space-y-1">
            <p className="font-bold border-b pb-0.5 uppercase text-slate-800">Bill to: Customer</p>
            <p className="font-black text-xs text-slate-900">{activeData.customerName}</p>
            <p className="text-slate-700">Ph./Mobile No.: <span className="font-mono font-bold">{activeData.customerPhone}</span></p>
          </div>

          {/* Col 2: Tax Details */}
          <div className="col-span-4 p-2 space-y-1">
            <p className="font-bold border-b pb-0.5 uppercase text-slate-800">TAX Details</p>
            <p>GSTIN : <span className="font-mono font-bold">{activeData.customerGstin || "Unregistered"}</span></p>
            <p>State : {activeData.customerState}</p>
            <p>PAN : <span className="font-mono font-bold">{activeData.customerPan || "N/A"}</span></p>
          </div>

          {/* Col 3: Shipping Details */}
          <div className="col-span-4 p-2 space-y-1">
            <p className="font-bold border-b pb-0.5 uppercase text-slate-800">Shipping Details</p>
            <p className="font-black text-slate-900 uppercase">{activeData.customerName}</p>
            <p className="text-slate-700 capitalize">{activeData.shippingAddress}</p>
            <p className="text-slate-700">Ph:/Mobile:/<span className="font-mono font-bold">{activeData.customerPhone}</span></p>
            {activeData.customerGstin && <p>GSTNO: <span className="font-mono font-bold">{activeData.customerGstin}</span></p>}
          </div>
        </div>

        {/* ─── PRODUCT / SERVICES TABLE (OFFICIAL FORMAT) ─────────── */}
        <div className="border-b border-slate-400">
          <table className="w-full text-left text-[10px] border-collapse">
            <thead>
              <tr className="border-b border-slate-400 font-bold bg-slate-50 text-slate-800">
                <th className="p-1 border-r border-slate-400 w-8 text-center">S.no</th>
                <th className="p-1 border-r border-slate-400">Name of Product /Service</th>
                <th className="p-1 border-r border-slate-400 text-center w-16">HSN SAC</th>
                <th className="p-1 border-r border-slate-400 text-center w-10">UOM</th>
                <th className="p-1 border-r border-slate-400 text-center w-8">Qty</th>
                <th className="p-1 border-r border-slate-400 text-right w-16">Rate</th>
                <th className="p-1 border-r border-slate-400 text-right w-16">Amount</th>
                <th className="p-1 border-r border-slate-400 text-right w-12">Disc.</th>
                <th className="p-1 border-r border-slate-400 text-right w-16">Taxable Value</th>
                <th className="p-1 border-r border-slate-400 text-right w-14">SGST Rate / Amt</th>
                <th className="p-1 border-r border-slate-400 text-right w-14">CGST Rate / Amt</th>
                <th className="p-1 text-right w-16">Total</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-300">
              {activeData.items.map((it: any) => (
                <tr key={it.sno} className="align-top">
                  <td className="p-1 border-r border-slate-400 text-center font-bold">{it.sno}</td>
                  <td className="p-1 border-r border-slate-400 font-medium">
                    <div className="font-bold text-slate-900">{it.name}</div>
                    {it.vpCode && <div className="text-[9px] font-mono text-slate-500">VP Code: {it.vpCode}</div>}
                    {it.serialNo && (
                      <div className="text-[9px] font-mono text-slate-700">
                        1 No. : Serial No: <strong>{it.serialNo}</strong>
                      </div>
                    )}
                    {it.batchNo && (
                      <div className="text-[9px] font-mono text-slate-700">
                        1 No. : Batchno: <strong>{it.batchNo}</strong>
                      </div>
                    )}
                    {it.extendedWarranty && (
                      <div className="text-[9px] font-semibold text-purple-700">
                        • {it.extendedWarranty} {it.extendedWarrantyAmount > 0 ? `(₹${it.extendedWarrantyAmount})` : ""}
                      </div>
                    )}
                  </td>
                  <td className="p-1 border-r border-slate-400 text-center font-mono">{it.hsn}</td>
                  <td className="p-1 border-r border-slate-400 text-center">{it.uom}</td>
                  <td className="p-1 border-r border-slate-400 text-center font-bold">{it.qty}</td>
                  <td className="p-1 border-r border-slate-400 text-right font-mono">{it.rate?.toFixed(2)}</td>
                  <td className="p-1 border-r border-slate-400 text-right font-mono">{it.amount?.toFixed(2)}</td>
                  <td className="p-1 border-r border-slate-400 text-right font-mono">{it.disc?.toFixed(2)}</td>
                  <td className="p-1 border-r border-slate-400 text-right font-mono font-bold">{it.taxableValue?.toFixed(2)}</td>
                  <td className="p-1 border-r border-slate-400 text-right font-mono">
                    <span className="text-[9px] block text-slate-500">{it.sgstRate?.toFixed(2)}%</span>
                    {it.sgstAmount?.toFixed(2)}
                  </td>
                  <td className="p-1 border-r border-slate-400 text-right font-mono">
                    <span className="text-[9px] block text-slate-500">{it.cgstRate?.toFixed(2)}%</span>
                    {it.cgstAmount?.toFixed(2)}
                  </td>
                  <td className="p-1 text-right font-mono font-bold text-slate-900">{it.total?.toFixed(2)}</td>
                </tr>
              ))}

              {/* EMPTY ROWS TO PRESERVE OFFICIAL DENSITY */}
              {activeData.items.length < 3 && Array.from({ length: 3 - activeData.items.length }).map((_, i) => (
                <tr key={`empty-${i}`} className="h-6">
                  <td className="border-r border-slate-400"></td>
                  <td className="border-r border-slate-400"></td>
                  <td className="border-r border-slate-400"></td>
                  <td className="border-r border-slate-400"></td>
                  <td className="border-r border-slate-400"></td>
                  <td className="border-r border-slate-400"></td>
                  <td className="border-r border-slate-400"></td>
                  <td className="border-r border-slate-400"></td>
                  <td className="border-r border-slate-400"></td>
                  <td className="border-r border-slate-400"></td>
                  <td className="border-r border-slate-400"></td>
                  <td></td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="border-t-2 border-slate-400 font-bold bg-slate-50">
                <td colSpan={4} className="p-1 text-right border-r border-slate-400">Total</td>
                <td className="p-1 text-center border-r border-slate-400">{activeData.items.reduce((s: number, it: any) => s + it.qty, 0)}</td>
                <td className="p-1 border-r border-slate-400"></td>
                <td className="p-1 text-right border-r border-slate-400 font-mono">{activeData.subtotal.toFixed(2)}</td>
                <td className="p-1 text-right border-r border-slate-400 font-mono">0.00</td>
                <td className="p-1 text-right border-r border-slate-400 font-mono">{activeData.subtotal.toFixed(2)}</td>
                <td className="p-1 text-right border-r border-slate-400 font-mono">{activeData.sgst.toFixed(2)}</td>
                <td className="p-1 text-right border-r border-slate-400 font-mono">{activeData.cgst.toFixed(2)}</td>
                <td className="p-1 text-right font-mono text-slate-900">{activeData.netAmount.toFixed(2)}</td>
              </tr>
            </tfoot>
          </table>
        </div>

        {/* ─── AMOUNT IN WORDS, ROUND OFF, NET AMOUNT ────────────── */}
        <div className="grid grid-cols-12 border-b border-slate-400 text-[10px]">
          <div className="col-span-8 p-2 border-r border-slate-400 space-y-1">
            <p className="text-slate-600 font-medium">Total Invoice Amount in words:</p>
            <p className="font-bold text-slate-900 text-xs tracking-wide">
              {numberToWordsIndian(activeData.netAmount)}
            </p>
          </div>
          <div className="col-span-4 divide-y divide-slate-300">
            <div className="flex justify-between p-1.5">
              <span className="font-semibold">Round Off</span>
              <span className="font-mono font-bold">{activeData.roundOff?.toFixed(2)}</span>
            </div>
            <div className="flex justify-between p-1.5 font-bold bg-slate-50 text-xs">
              <span>Net Amount</span>
              <span className="font-mono text-black font-black">{activeData.netAmount?.toFixed(2)}</span>
            </div>
            <div className="flex justify-between p-1.5 text-[9px]">
              <span>GST Payable on Reverse Charge</span>
              <span>Yes[] No[X]</span>
            </div>
          </div>
        </div>

        {/* ─── BANK DETAILS & JURISDICTION ───────────────────────── */}
        <div className="grid grid-cols-12 border-b border-slate-400 text-[10px]">
          <div className="col-span-8 p-2 border-r border-slate-400 space-y-1">
            <p className="font-bold border-b border-slate-300 pb-0.5 text-slate-800">Our Bank Detail for RTGS / NEFT</p>
            <div className="grid grid-cols-2 gap-x-2 gap-y-0.5 text-[10px]">
              <div><span className="font-semibold">Account No. :</span> <span className="font-mono font-bold">50200044746701</span></div>
              <div><span className="font-semibold">Bank :</span> <span className="font-bold">HDFC BANK LTD</span></div>
              <div><span className="font-semibold">Branch :</span> <span className="font-bold">MOHADDIPUR, GORAKHPUR</span></div>
              <div><span className="font-semibold">IFSC Code :</span> <span className="font-mono font-bold">HDFC0000284</span></div>
            </div>
          </div>
          <div className="col-span-4 p-2 flex flex-col justify-end text-right">
            <p className="font-bold text-slate-900">For: {activeData.companyName}</p>
          </div>
        </div>

        {/* ─── DECLARATION & AUTHORISED SIGNATORY ────────────────── */}
        <div className="grid grid-cols-12 border-b border-slate-400 text-[9px] p-2 gap-2">
          <div className="col-span-8 space-y-1">
            <p className="font-semibold text-slate-700 italic">E.& O.E. (Subject to Gorakhpur jurisdiction)</p>
            <p className="font-bold text-slate-800 uppercase">Declaration :</p>
            <p className="text-slate-600 leading-normal text-[8.5px]">
              We Declare that this invoice shows the actual price of the goods described and that all particulars are true and correct. Goods once sold will not be taken back or exchanged. All after sale services will be provided only by the concerned company's Service Centre and the firm shall not be responsible under any circumstances.
            </p>
          </div>
          <div className="col-span-4 flex flex-col justify-between items-end text-right pt-6">
            <div className="h-8" />
            <p className="font-bold text-slate-800 uppercase border-t border-slate-300 pt-1 w-36 text-center">
              Authorised Signatory
            </p>
          </div>
        </div>

        {/* ─── REMARKS & PAYMENT SUMMARY ─────────────────────────── */}
        <div className="py-2 border-b border-slate-400 text-[10px] space-y-1">
          <p><span className="font-bold">Remarks:</span> Mode: <span className="font-bold uppercase">{activeData.paymentMode}</span> {activeData.financeDoId ? `• Finance DO: ${activeData.financeDoId}` : ""} {activeData.vehicleNumber ? `• Vehicle No: ${activeData.vehicleNumber}` : ""}</p>
          <p><span className="font-bold">Payment Details:</span> Paid: <span className="font-mono font-bold">₹{activeData.paidAmount?.toFixed(2)}</span> {activeData.balanceAmount > 0 ? `• Balance Due: ₹${activeData.balanceAmount?.toFixed(2)}` : "• Full Settlement Received"}</p>
        </div>

        {/* ─── FOOTER & DISPATCH INFORMATION ──────────────────────── */}
        <div className="pt-2 flex items-center justify-between text-[8.5px] text-slate-500 font-mono">
          <span>Page: 1 of 1</span>
          <span>Despatched from: {activeData.companyAddress}</span>
          <span>{new Date().toLocaleTimeString("en-IN")}</span>
        </div>
      </div>
    </div>
  );
}


export default function ValueplusInvoice(props: any) {
  return (
    <Suspense fallback={<div className="p-8 text-center text-xs font-bold text-slate-500">Loading Value Plus Tax Invoice...</div>}>
      <ValueplusInvoiceContent {...props} />
    </Suspense>
  );
}


