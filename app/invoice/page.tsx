"use client";

/**
 * VALUEPLUS ERP — GST Tax Invoice with Live Form Filler & Sidebar Logo
 */

import React, { useState, useMemo, useEffect } from "react";
import { 
  Printer, Download, Send, MessageSquare, Edit3, Plus, Trash2, CheckCircle2, 
  ArrowLeft, FileText, Building2, User, CreditCard, Layers, Sparkles
} from "lucide-react";
import { toast } from "sonner";
import Link from "next/link";

// ─── HELPERS ───────────────────────────────────────────────────
function formatCurrency(amount: number) {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 2,
  }).format(amount).replace("INR", "₹");
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

  return `Rupees ${str.trim()} Only`;
}

// ─── INITIAL INVOICE STATE ──────────────────────────────────────
interface InvoiceItem {
  id: string;
  name: string;
  hsn: string;
  qty: number;
  unit: string;
  rate: number;
  discount: number;
  gstRate: number;
}

const INITIAL_FORM = {
  // Company Info
  companyName: "VALUEPLUS",
  companyLegal: "Valueplus Technologies Pvt. Ltd.",
  companyAddress: "B-42, Sector 63, Noida, Uttar Pradesh – 201301, India",
  companyGstin: "09AAFCV1234M1ZQ",
  companyPan: "AAFCV1234M",
  companyPhone: "+91 120 456 7890",
  companyEmail: "billing@valueplus.in",
  companyWeb: "www.valueplus.in",

  // Invoice Meta
  invoiceNo: "INV-2026-0148",
  invoiceDate: "2026-08-03",
  dueDate: "2026-08-13",
  orderNo: "SO-2026-0231",
  ewayBillNo: "EWB-4102 8837 1190",
  placeOfSupply: "Uttar Pradesh (09)",
  invoiceType: "TAX INVOICE",

  // Bill To
  customerName: "ABC Traders",
  customerGstin: "09BPQPT5678K1Z2",
  customerPhone: "+91 98765 43210",
  customerEmail: "accounts@abctraders.in",
  customerAddress: "18, Nehru Market, Civil Lines, Prayagraj, Uttar Pradesh",
  customerState: "Uttar Pradesh (09)",
  customerPin: "211001",

  // Ship To
  shippingName: "ABC Traders — Warehouse",
  shippingAddress: "Plot 22, Naini Industrial Area, Prayagraj, Uttar Pradesh",
  shippingState: "Uttar Pradesh (09)",
  shippingPin: "211010",

  // Payment Status & Bank
  paymentStatus: "paid", // paid, pending, partial
  paymentMethod: "UPI",
  outstandingAmount: 0,
  shippingCharges: 200,

  bankName: "HDFC Bank, Sector 63 Branch, Noida",
  accountNo: "5020 0034 5678 90",
  ifscCode: "HDFC0001234",
  upiId: "valueplus@hdfcbank",

  // Items
  items: [
    { id: "1", name: "iPhone 15 Pro Max 256GB", hsn: "8517", qty: 2, unit: "PCS", rate: 53000, discount: 2120, gstRate: 18 },
    { id: "2", name: "Sony Bravia 55\" 4K Ultra HD Smart TV", hsn: "8528", qty: 2, unit: "PCS", rate: 8500, discount: 340, gstRate: 18 },
    { id: "3", name: "boAt Airdopes 141 TWS Earbuds", hsn: "8518", qty: 3, unit: "PR", rate: 1300, discount: 78, gstRate: 18 },
    { id: "4", name: "Logitech MX Master 3S Wireless Mouse", hsn: "8471", qty: 3, unit: "PCS", rate: 650, discount: 39, gstRate: 18 },
  ] as InvoiceItem[],
};

interface ValueplusInvoiceProps {
  invoiceData?: any;
  onBack?: () => void;
}

export default function ValueplusInvoice({ invoiceData, onBack }: ValueplusInvoiceProps = {}) {
  const [formData, setFormData] = useState(INITIAL_FORM);
  const [isEditing, setIsEditing] = useState(false);

  useEffect(() => {
    if (invoiceData) {
      const mappedItems = (invoiceData.items && invoiceData.items.length > 0)
        ? invoiceData.items.map((it: any, index: number) => ({
            id: it.id || String(index + 1),
            name: it.itemName || it.name || "Product Item",
            hsn: it.hsnCode || it.hsn || "8471",
            serialImei: it.serialImei || it.serialNo || "",
            qty: Number(it.quantity || it.qty) || 1,
            unit: it.unit || "Pcs",
            rate: Number(it.rate) || 0,
            discount: Number(it.discount) || 0,
            gstRate: Number(it.gstRate) || 18,
          }))
        : INITIAL_FORM.items;

      setFormData((prev) => ({
        ...prev,
        invoiceType: invoiceData.estimateNumber || invoiceData.estimateNo ? "PROFORMA ESTIMATE" : "TAX INVOICE",
        invoiceNo: invoiceData.estimateNumber || invoiceData.estimateNo || invoiceData.invoiceNumber || invoiceData.invoiceNo || "",
        customerName: invoiceData.customerName || invoiceData.partyName || "",
        customerGstin: invoiceData.customerGST || invoiceData.gstNumber || invoiceData.customerGstin || invoiceData.gstinNumber || "URP (Unregistered Person)",
        customerPhone: invoiceData.customerPhone || invoiceData.partyPhone || invoiceData.phoneContact || "",
        customerEmail: invoiceData.customerEmail || invoiceData.emailContact || "",
        customerAddress: invoiceData.customerAddress || invoiceData.billingAddress || "",
        customerState: invoiceData.placeOfSupply || invoiceData.state || "",
        customerPin: invoiceData.customerPin || invoiceData.pin || "",
        shippingName: invoiceData.shippingName || invoiceData.customerName || invoiceData.partyName || "",
        shippingAddress: invoiceData.shippingAddress || invoiceData.customerAddress || invoiceData.billingAddress || "",
        shippingState: invoiceData.shippingState || invoiceData.placeOfSupply || invoiceData.state || "",
        shippingPin: invoiceData.shippingPin || invoiceData.customerPin || invoiceData.pin || "",
        placeOfSupply: invoiceData.placeOfSupply || "",
        salesExecutive: invoiceData.salesExecutive || "",
        invoiceDate: (invoiceData.date || invoiceData.invoiceDate || invoiceData.createdAt || "").split("T")[0],
        dueDate: (invoiceData.dueDate || "").split("T")[0],
        paymentStatus: invoiceData.status || invoiceData.paymentStatus || "pending",
        paymentMethod: invoiceData.paymentMode || invoiceData.paymentMethod || "Cash",
        financeCompany: invoiceData.financeCompany || "",
        financeApprovalNo: invoiceData.financeApprovalNo || "",
        downPayment: Number(invoiceData.downPayment) || 0,
        downPaymentMode: invoiceData.downPaymentMode || "Cash",
        shippingCharges: Number(invoiceData.shippingCharges) || Number(invoiceData.shipping) || 0,
        financeTenureMonths: Number(invoiceData.financeTenureMonths) || 0,
        financeSchemeType: invoiceData.financeSchemeType || "no_cost",
        financeInterestRate: Number(invoiceData.financeInterestRate) || 0,
        monthlyEMI: Number(invoiceData.monthlyEMI) || 0,
        totalInterest: Number(invoiceData.totalInterest) || 0,
        items: mappedItems,
      }));
    }
  }, [invoiceData]);

  // Calculations
  const calculatedItems = useMemo(() => {
    return formData.items.map((item) => {
      const taxableRate = item.rate - item.discount;
      const taxableAmount = item.qty * taxableRate;
      const gstAmount = taxableAmount * (item.gstRate / 100);
      const totalAmount = taxableAmount + gstAmount;
      return {
        ...item,
        taxableRate,
        taxableAmount,
        gstAmount,
        totalAmount,
      };
    });
  }, [formData.items]);

  const totals = useMemo(() => {
    const grossSubtotal = formData.items.reduce((sum, item) => sum + item.qty * item.rate, 0);
    const totalDiscount = formData.items.reduce((sum, item) => sum + item.qty * item.discount, 0);
    const taxableValue = grossSubtotal - totalDiscount;
    const totalGst = calculatedItems.reduce((sum, item) => sum + item.gstAmount, 0);
    
    // Check if intra-state (UP to UP) or inter-state
    const isIntraState = formData.placeOfSupply.includes("09") || formData.placeOfSupply.toLowerCase().includes("uttar pradesh");
    const cgst = isIntraState ? totalGst / 2 : 0;
    const sgst = isIntraState ? totalGst / 2 : 0;
    const igst = isIntraState ? 0 : totalGst;

    const shipping = Number(formData.shippingCharges) || 0;
    const exactTotal = taxableValue + totalGst + shipping;
    const grandTotal = Math.round(exactTotal);
    const roundOff = Number((grandTotal - exactTotal).toFixed(2));
    const amountInWords = numberToWordsIndian(grandTotal);

    return {
      grossSubtotal,
      totalDiscount,
      taxableValue,
      totalGst,
      cgst,
      sgst,
      igst,
      shipping,
      roundOff,
      grandTotal,
      amountInWords,
    };
  }, [calculatedItems, formData.shippingCharges, formData.placeOfSupply]);

  // Form Handlers
  const handleItemChange = (index: number, field: keyof InvoiceItem, value: any) => {
    setFormData((prev) => {
      const newItems = [...prev.items];
      newItems[index] = { ...newItems[index], [field]: value };
      return { ...prev, items: newItems };
    });
  };

  const addItem = () => {
    setFormData((prev) => ({
      ...prev,
      items: [
        ...prev.items,
        {
          id: String(Date.now()),
          name: "New Product",
          hsn: "8517",
          qty: 1,
          unit: "PCS",
          rate: 1000,
          discount: 0,
          gstRate: 18,
        },
      ],
    }));
  };

  const removeItem = (index: number) => {
    setFormData((prev) => ({
      ...prev,
      items: prev.items.filter((_, i) => i !== index),
    }));
  };

  return (
    <>
      <style>{`
  @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&family=JetBrains+Mono:wght@500;600&display=swap');

  :root{
    --vp-blue:#3F63AD;
    --vp-blue-dark:#2C4A85;
    --vp-blue-tint:#EEF2FA;
    --vp-green:#76C043;
    --vp-green-dark:#5A9A30;
    --vp-green-tint:#EEF8E6;
    --ink:#111827;
    --ink-soft:#4B5563;
    --ink-faint:#8A93A3;
    --line:#E4E8EF;
    --line-soft:#EEF1F5;
    --white:#FFFFFF;
    --paper-bg:#EEF1F6;
    --radius:14px;
  }
  *{ box-sizing:border-box; }
  html,body{ margin:0; padding:0; }
  body{
    font-family:'Inter',-apple-system,Segoe UI,Roboto,Arial,sans-serif;
    background:var(--paper-bg);
    color:var(--ink);
    -webkit-font-smoothing:antialiased;
  }
  .mono{ font-family:'JetBrains Mono', ui-monospace, monospace; }

  /* ============ SCREEN CHROME ============ */
  .toolbar{
    max-width:860px;
    margin:22px auto 14px auto;
    display:flex;
    align-items:center;
    justify-content:space-between;
    padding:0 4px;
  }
  .toolbar .brandmark{
    display:flex; align-items:center; gap:10px;
    font-size:13.5px; color:var(--ink-soft); font-weight:600;
  }
  .toolbar .brandmark .dot{ width:8px; height:8px; border-radius:50%; background:var(--vp-green); }
  .actions{ display:flex; gap:8px; flex-wrap:wrap; }
  .btn{
    display:inline-flex; align-items:center; gap:7px;
    font-family:inherit; font-size:12.5px; font-weight:600;
    padding:9px 14px; border-radius:9px; border:1px solid var(--line);
    background:var(--white); color:var(--ink); cursor:pointer;
    box-shadow:0 1px 2px rgba(16,24,40,0.04);
    transition:transform .12s ease, box-shadow .12s ease, background .12s ease;
  }
  .btn:hover{ transform:translateY(-1px); box-shadow:0 4px 10px rgba(16,24,40,0.08); }
  .btn:active{ transform:translateY(0); }
  .btn svg{ width:14px; height:14px; flex:none; }
  .btn.primary{ background:var(--vp-blue); border-color:var(--vp-blue); color:#fff; }
  .btn.primary:hover{ background:var(--vp-blue-dark); }
  .btn.ghost{ color:var(--ink-soft); }
  .btn.whatsapp{ background:#25D366; border-color:#25D366; color:#fff; }
  .btn.whatsapp:hover{ background:#1EBE59; }

  /* ============ THE INVOICE (screen = card, print = page) ============ */
  .sheet-wrap{
    max-width:860px;
    margin:0 auto 40px auto;
  }
  .sheet{
    background:var(--white);
    border-radius:var(--radius);
    box-shadow:0 1px 3px rgba(16,24,40,0.06), 0 18px 40px -14px rgba(31,48,92,0.18);
    overflow:hidden;
    position:relative;
    isolation:isolate;
  }

  /* ---- watermark ---- */
  .watermark{
    position:absolute; inset:0; z-index:0;
    display:flex; align-items:center; justify-content:center;
    pointer-events:none;
  }
  .watermark span{
    font-size:130px; font-weight:800; letter-spacing:10px;
    color:var(--vp-green); opacity:0.08;
    transform:rotate(-30deg);
    text-transform:uppercase;
    white-space:nowrap;
  }

  /* ---- header ---- */
  .inv-header{
    position:relative; z-index:1;
    display:flex; justify-content:space-between; gap:24px;
    padding:16px 40px 12px 40px;
    border-bottom:3px solid var(--vp-blue);
  }
  .co-block{ display:flex; gap:16px; align-items:center; }
  
  /* SIDEBAR LOGO EMBED */
  .co-sidebar-logo {
    background: var(--vp-blue);
    padding: 8px 14px;
    border-radius: 12px;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    box-shadow: 0 4px 12px rgba(63, 99, 173, 0.25);
    flex-shrink: 0;
    border: 1px solid rgba(255,255,255,0.15);
  }
  .co-sidebar-logo .brand-text {
    display: flex;
    align-items: center;
    font-size: 22px;
    font-weight: 900;
    letter-spacing: -0.5px;
    line-height: 1;
  }
  .co-sidebar-logo .val { color: #FFFFFF; }
  .co-sidebar-logo .plus { color: #76C043; }
  .co-sidebar-logo .tagline {
    display: flex;
    align-items: center;
    gap: 5px;
    margin-top: 4px;
    opacity: 0.9;
  }
  .co-sidebar-logo .tagline-line {
    height: 1px;
    width: 12px;
    background: rgba(255, 255, 255, 0.7);
  }
  .co-sidebar-logo .tagline-text {
    color: #FFFFFF;
    font-size: 9.5px;
    font-weight: 600;
    letter-spacing: 0.5px;
    white-space: nowrap;
  }

  .co-name-row{ display:flex; align-items:baseline; gap:8px; flex-wrap:wrap; }
  .co-wordmark{ font-size:19px; font-weight:800; color:var(--vp-blue); letter-spacing:0.2px; white-space:nowrap; }
  .co-legal{ font-size:11.5px; color:var(--ink-faint); font-weight:600; white-space:nowrap; }
  .co-details{ margin-top:4px; font-size:11px; color:var(--ink-soft); line-height:1.5; max-width:420px; }
  .co-details .row{ display:flex; flex-wrap:wrap; gap:5px; margin-bottom:1px; }
  .co-details b{ color:var(--ink); font-weight:600; }

  .inv-meta{ text-align:right; flex:none; }
  .inv-badge{
    display:inline-block; font-size:11px; font-weight:800; letter-spacing:1.6px;
    color:var(--white); background:var(--ink); padding:5px 12px; border-radius:5px;
    margin-bottom:10px;
  }
  .inv-meta table{ border-collapse:collapse; margin-left:auto; }
  .inv-meta td{ padding:2.5px 0; font-size:11.5px; text-align:right; white-space:nowrap; }
  .inv-meta td.k{ color:var(--ink-faint); padding-right:14px; }
  .inv-meta td.v{ color:var(--ink); font-weight:700; }

  /* ---- parties ---- */
  .parties{
    position:relative; z-index:1;
    display:flex;
    border-bottom:1px solid var(--line);
  }
  .party{
    flex:1; padding:10px 40px; font-size:11.5px; color:var(--ink-soft); line-height:1.45;
  }
  .party + .party{ border-left:1px solid var(--line); }
  .party .label{
    font-size:10px; font-weight:800; letter-spacing:1px; text-transform:uppercase;
    color:var(--vp-blue); margin-bottom:8px;
  }
  .party .cust-name{ font-size:13.5px; font-weight:700; color:var(--ink); margin-bottom:3px; }
  .party .kv{ display:flex; gap:5px; }
  .party .kv b{ color:var(--ink); font-weight:600; }

  /* ---- table ---- */
  .table-wrap{
    position:relative; z-index:1;
    padding:0 40px; margin-top:10px;
    max-height:520px; overflow:auto;
  }
  table.items{ width:100%; border-collapse:collapse; }
  table.items thead th{
    position:sticky; top:0; z-index:2;
    background:var(--vp-blue); color:#fff;
    font-size:10px; font-weight:700; text-transform:uppercase; letter-spacing:0.6px;
    padding:7px 10px; text-align:left; border:none;
  }
  table.items thead th:first-child{ border-top-left-radius:7px; }
  table.items thead th:last-child{ border-top-right-radius:7px; }
  table.items th.num, table.items td.num{ text-align:right; }
  table.items td{
    padding:6px 10px; font-size:11px; color:var(--ink-soft);
    border-bottom:1px solid var(--line-soft);
    page-break-inside:avoid; break-inside:avoid;
  }
  table.items tbody tr:nth-child(even){ background:#FAFBFD; }
  table.items tbody tr{ page-break-inside:avoid; break-inside:avoid; }
  .p-name{ font-weight:700; color:var(--ink); word-wrap:break-word; max-width: 200px; }
  .p-hsn{ font-size:9.5px; color:var(--ink-faint); margin-top:1px; word-wrap:break-word; word-break:break-all; max-width: 200px; }

  /* ---- summary + payment ---- */
  .lower{
    position:relative; z-index:1;
    display:flex; gap:18px;
    padding:12px 40px 6px 40px;
  }
  .lower-left{ flex:1.15; display:flex; flex-direction:column; gap:9px; }
  .lower-right{ flex:1; }

  .box{
    border:1px solid var(--line); border-radius:10px; padding:9px 14px;
  }
  .box .label{
    font-size:9.5px; font-weight:800; letter-spacing:0.8px; text-transform:uppercase;
    color:var(--ink-faint); margin-bottom:6px;
  }

  .payment-box{ display:flex; gap:22px; flex-wrap:wrap; }
  .pay-item{ font-size:12px; }
  .pay-item .k{ color:var(--ink-faint); font-size:10.5px; text-transform:uppercase; letter-spacing:0.4px; margin-bottom:4px; }
  .pay-item .v{ font-weight:700; color:var(--ink); }
  .status-pill{
    display:inline-flex; align-items:center; gap:6px;
    font-size:11px; font-weight:800; padding:4px 11px; border-radius:20px;
    background:var(--vp-green-tint); color:var(--vp-green-dark); text-transform:capitalize;
  }
  .status-pill .dot{ width:7px; height:7px; border-radius:50%; background:var(--vp-green-dark); }
  .status-pill.pending{ background:#FEF3C7; color:#B45309; }
  .status-pill.pending .dot{ background:#B45309; }

  .bank-grid{ display:flex; gap:18px; align-items:center; }
  .bank-info{ flex:1; font-size:11px; color:var(--ink-soft); line-height:1.55; }
  .bank-info b{ color:var(--ink); font-weight:600; }
  .qr-box{
    width:62px; height:62px; flex:none; border-radius:8px; border:1px solid var(--line);
    display:grid; grid-template-columns:repeat(7,1fr); grid-template-rows:repeat(7,1fr);
    padding:6px; gap:1.5px; background:#fff;
  }
  .qr-box i{ background:var(--ink); border-radius:1px; }
  .qr-caption{ font-size:9px; color:var(--ink-faint); text-align:center; margin-top:5px; letter-spacing:0.3px; }

  .totals .row{
    display:flex; justify-content:space-between; padding:3px 0; font-size:11px; color:var(--ink-soft);
  }
  .totals .row span:last-child{ font-weight:600; color:var(--ink); }
  .totals .row.grand{
    margin-top:6px; padding:8px 16px; border-radius:10px;
    background:linear-gradient(120deg,var(--vp-blue),var(--vp-blue-dark));
    color:#fff; font-size:15px; font-weight:800;
  }
  .totals .row.grand span:last-child{ color:#fff; font-size:19px; }
  .totals .words{
    font-size:9.5px; color:var(--ink-faint); margin-top:6px; line-height:1.4;
    border-top:1px dashed var(--line); padding-top:6px;
  }
  .totals .words b{ color:var(--ink-soft); }

  .barcode{ display:flex; gap:1.4px; align-items:flex-end; height:22px; margin-top:6px; }
  .barcode i{ width:2.2px; background:var(--ink); display:block; }

  /* ---- terms ---- */
  .terms{
    position:relative; z-index:1;
    padding:14px 40px 6px 40px; display:flex; gap:24px;
    border-top:1px solid var(--line-soft); margin-top:8px;
  }
  .terms .col{ flex:1; font-size:10px; color:var(--ink-soft); line-height:1.45; }
  .terms .label{
    font-size:10px; font-weight:800; letter-spacing:0.8px; text-transform:uppercase;
    color:var(--vp-blue); margin-bottom:6px;
  }
  .terms ul{ margin:0; padding:0; list-style:none; }
  .terms li{
    position:relative; padding-left:12px; margin-bottom:4px;
  }
  .terms li::before{
    content:"•"; position:absolute; left:0; top:0; color:var(--vp-blue); font-weight:bold; font-size:12px; line-height:1;
  }

  /* ---- signatures / footer ---- */
  .sign-row{
    position:relative; z-index:1;
    display:flex; justify-content:space-between; align-items:flex-end;
    padding:64px 40px 16px 40px;
  }
  .stamp{
    width:74px; height:74px; border-radius:50%; border:2px dashed #C9CFDB;
    display:flex; align-items:center; justify-content:center; text-align:center;
    color:#C3CAD7; font-size:8.5px; font-weight:800; letter-spacing:0.6px; text-transform:uppercase;
    transform:rotate(-8deg); line-height:1.3; flex:none;
  }
  .sign-block{ text-align:center; }
  .sign-line{
    min-width:180px; width:max-content; margin:0 auto; border-top:1px solid #9AA2B1; padding-top:7px; font-size:10.5px; color:var(--ink-faint); white-space:nowrap;
  }
  .footer-bar{
    position:relative; z-index:1;
    text-align:center; padding:8px 20px 10px 20px;
    border-top:1px solid var(--line);
    font-size:10px; color:var(--ink-faint);
  }
  .footer-bar b{ color:var(--vp-blue); }

  /* ============ FORM DRAWER / EDITOR ============ */
  .form-card {
    max-width: 860px;
    margin: 0 auto 24px auto;
    background: #FFFFFF;
    border-radius: var(--radius);
    padding: 24px;
    box-shadow: 0 4px 20px rgba(0,0,0,0.06);
    border: 1px solid var(--line);
  }
  .form-grid {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 14px;
  }
  .form-field {
    display: flex;
    flex-direction: column;
    gap: 5px;
  }
  .form-field label {
    font-size: 11px;
    font-weight: 700;
    color: var(--ink-soft);
    text-transform: uppercase;
    letter-spacing: 0.5px;
  }
  .form-field input, .form-field select {
    padding: 8px 12px;
    font-size: 13px;
    border-radius: 8px;
    border: 1px solid var(--line);
    outline: none;
    font-family: inherit;
    transition: border-color 0.15s;
  }
  .form-field input:focus, .form-field select:focus {
    border-color: var(--vp-blue);
    box-shadow: 0 0 0 3px rgba(63,99,173,0.1);
  }
  .items-edit-table {
    width: 100%;
    border-collapse: collapse;
    margin-top: 12px;
  }
  .items-edit-table th {
    font-size: 11px;
    font-weight: 700;
    text-transform: uppercase;
    color: var(--ink-soft);
    text-align: left;
    padding: 8px;
    background: var(--paper-bg);
  }
  .items-edit-table td {
    padding: 6px;
    border-bottom: 1px solid var(--line);
  }
  .items-edit-table input {
    width: 100%;
    padding: 6px 8px;
    border: 1px solid var(--line);
    border-radius: 6px;
    font-size: 12px;
  }

  /* ============ RESPONSIVE (screen only) ============ */
  @media (max-width:720px){
    .inv-header{ flex-direction:column; }
    .inv-meta{ text-align:left; }
    .inv-meta table{ margin-left:0; }
    .inv-meta td{ text-align:left; }
    .parties{ flex-direction:column; }
    .party + .party{ border-left:none; border-top:1px solid var(--line); }
    .lower{ flex-direction:column; }
    .terms{ flex-direction:column; gap:14px; }
    .sign-row{ flex-direction:column; gap:24px; align-items:center; }
    .form-grid{ grid-template-columns: 1fr; }
  }

  /* ============ PRINT ============ */
  @media print{
    @page{ size:A4; margin:10mm; }
    html,body{ background:#fff !important; }
    .toolbar, .no-print, .form-card{ display:none !important; }
    .sheet-wrap{ max-width:none; margin:0; }
    .sheet{
      box-shadow:none !important; border-radius:0 !important; margin:0 !important;
    }
    .table-wrap{ max-height:none !important; overflow:visible !important; }
    table.items thead th{ position:static !important; }
    table, tr, td, th{ page-break-inside:avoid; break-inside:avoid; }
    .box, .parties, .lower, .terms{ page-break-inside:avoid; break-inside:avoid; }
    a{ text-decoration:none; color:inherit; }
  }
      `}</style>

      {/* TOP TOOLBAR */}
      <div className="toolbar no-print">
        <div className="brandmark">
          {onBack ? (
            <button type="button" onClick={onBack} className="flex items-center gap-1.5 text-[#3F63AD] hover:underline mr-2">
              <ArrowLeft className="w-4 h-4" /> Back to Invoices
            </button>
          ) : (
            <Link href="/sales/invoices" className="flex items-center gap-1.5 text-[#3F63AD] hover:underline mr-2">
              <ArrowLeft className="w-4 h-4" /> Back to Invoices
            </Link>
          )}
          <span className="dot"></span> 
          <span>VALUEPLUS ERP — GST Invoice Builder</span>
        </div>
        <div className="actions">
          <button 
            className={`btn ${isEditing ? "primary" : "ghost"}`} 
            onClick={() => setIsEditing(!isEditing)}
          >
            <Edit3 className="w-4 h-4" />
            {isEditing ? "Preview Invoice" : "Fill / Edit Form"}
          </button>
          <button className="btn whatsapp" onClick={() => toast.success(`Sharing ${formData.invoiceNo} via WhatsApp...`)}>
            <MessageSquare className="w-4 h-4" />
            WhatsApp
          </button>
          <button className="btn ghost" onClick={() => window.print()}>
            <Printer className="w-4 h-4" />
            Print
          </button>
          <button className="btn primary" onClick={() => window.print()}>
            <Download className="w-4 h-4" />
            Download PDF
          </button>
        </div>
      </div>

      {/* INTERACTIVE FORM EDITING DRAWER / PANEL */}
      {isEditing && (
        <div className="form-card no-print">
          <div className="flex items-center justify-between border-b pb-3 mb-4">
            <div className="flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-[#3F63AD]" />
              <h3 className="font-bold text-lg">Edit Invoice Details</h3>
            </div>
            <button className="btn primary" onClick={() => setIsEditing(false)}>
              <CheckCircle2 className="w-4 h-4 mr-1" /> Done Editing
            </button>
          </div>

          <div className="space-y-6">
            {/* Header & Meta */}
            <div>
              <h4 className="text-xs font-bold uppercase tracking-wider text-[#3F63AD] mb-3 flex items-center gap-1.5">
                <FileText className="w-4 h-4" /> Invoice Details
              </h4>
              <div className="form-grid">
                <div className="form-field">
                  <label>Invoice Number</label>
                  <input value={formData.invoiceNo} onChange={(e) => setFormData({ ...formData, invoiceNo: e.target.value })} />
                </div>
                <div className="form-field">
                  <label>Invoice Date</label>
                  <input type="date" value={formData.invoiceDate} onChange={(e) => setFormData({ ...formData, invoiceDate: e.target.value })} />
                </div>
                <div className="form-field">
                  <label>Due Date</label>
                  <input type="date" value={formData.dueDate} onChange={(e) => setFormData({ ...formData, dueDate: e.target.value })} />
                </div>
                <div className="form-field">
                  <label>Order Number</label>
                  <input value={formData.orderNo} onChange={(e) => setFormData({ ...formData, orderNo: e.target.value })} />
                </div>
                <div className="form-field">
                  <label>E-Way Bill No.</label>
                  <input value={formData.ewayBillNo} onChange={(e) => setFormData({ ...formData, ewayBillNo: e.target.value })} />
                </div>
                <div className="form-field">
                  <label>Place of Supply</label>
                  <input value={formData.placeOfSupply} onChange={(e) => setFormData({ ...formData, placeOfSupply: e.target.value })} />
                </div>
              </div>
            </div>

            {/* Customer Details */}
            <div>
              <h4 className="text-xs font-bold uppercase tracking-wider text-[#3F63AD] mb-3 flex items-center gap-1.5">
                <User className="w-4 h-4" /> Customer & Shipping Info
              </h4>
              <div className="form-grid">
                <div className="form-field">
                  <label>Customer Name</label>
                  <input value={formData.customerName} onChange={(e) => setFormData({ ...formData, customerName: e.target.value })} />
                </div>
                <div className="form-field">
                  <label>Customer GSTIN</label>
                  <input value={formData.customerGstin} onChange={(e) => setFormData({ ...formData, customerGstin: e.target.value })} />
                </div>
                <div className="form-field">
                  <label>Customer Mobile Number</label>
                  <input value={formData.customerPhone} onChange={(e) => setFormData({ ...formData, customerPhone: e.target.value })} />
                </div>
                <div className="form-field col-span-2">
                  <label>Billing Address</label>
                  <input value={formData.customerAddress} onChange={(e) => setFormData({ ...formData, customerAddress: e.target.value })} />
                </div>
                <div className="form-field">
                  <label>State & PIN</label>
                  <input value={formData.customerPin} onChange={(e) => setFormData({ ...formData, customerPin: e.target.value })} />
                </div>
              </div>
            </div>

            {/* Line Items */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <h4 className="text-xs font-bold uppercase tracking-wider text-[#3F63AD] flex items-center gap-1.5">
                  <Layers className="w-4 h-4" /> Line Items ({formData.items.length})
                </h4>
                <button className="btn ghost" onClick={addItem}>
                  <Plus className="w-3.5 h-3.5 mr-1" /> Add Product Line
                </button>
              </div>

              <div className="overflow-x-auto">
                <table className="items-edit-table">
                  <thead>
                    <tr>
                      <th style={{ width: "30%" }}>Item Name</th>
                      <th style={{ width: "12%" }}>HSN</th>
                      <th style={{ width: "10%" }}>Qty</th>
                      <th style={{ width: "10%" }}>Unit</th>
                      <th style={{ width: "14%" }}>Rate (₹)</th>
                      <th style={{ width: "12%" }}>Disc (₹)</th>
                      <th style={{ width: "10%" }}>GST %</th>
                      <th style={{ width: "4%" }}></th>
                    </tr>
                  </thead>
                  <tbody>
                    {formData.items.map((item, idx) => (
                      <tr key={item.id}>
                        <td>
                          <input value={item.name} onChange={(e) => handleItemChange(idx, "name", e.target.value)} />
                        </td>
                        <td>
                          <input value={item.hsn} onChange={(e) => handleItemChange(idx, "hsn", e.target.value)} />
                        </td>
                        <td>
                          <input type="number" min="1" value={item.qty} onChange={(e) => handleItemChange(idx, "qty", Math.max(1, Number(e.target.value)))} />
                        </td>
                        <td>
                          <input value={item.unit} onChange={(e) => handleItemChange(idx, "unit", e.target.value)} />
                        </td>
                        <td>
                          <input type="number" min="0" value={item.rate} onChange={(e) => handleItemChange(idx, "rate", Math.max(0, Number(e.target.value)))} />
                        </td>
                        <td>
                          <input type="number" min="0" value={item.discount} onChange={(e) => handleItemChange(idx, "discount", Math.max(0, Number(e.target.value)))} />
                        </td>
                        <td>
                          <input type="number" min="0" value={item.gstRate} onChange={(e) => handleItemChange(idx, "gstRate", Math.max(0, Number(e.target.value)))} />
                        </td>
                        <td className="text-center">
                          <button onClick={() => removeItem(idx)} className="text-red-500 hover:text-red-700 p-1">
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Payment & Bank Details */}
            <div>
              <h4 className="text-xs font-bold uppercase tracking-wider text-[#3F63AD] mb-3 flex items-center gap-1.5">
                <CreditCard className="w-4 h-4" /> Payment & Bank Details
              </h4>
              <div className="form-grid">
                <div className="form-field">
                  <label>Payment Status</label>
                  <select value={formData.paymentStatus} onChange={(e) => setFormData({ ...formData, paymentStatus: e.target.value })}>
                    <option value="paid">Paid</option>
                    <option value="pending">Pending</option>
                    <option value="partial">Partial</option>
                  </select>
                </div>
                <div className="form-field">
                  <label>Payment Method</label>
                  <input value={formData.paymentMethod} onChange={(e) => setFormData({ ...formData, paymentMethod: e.target.value })} />
                </div>
                <div className="form-field">
                  <label>Shipping Charges (₹)</label>
                  <input type="number" min="0" value={formData.shippingCharges} onChange={(e) => setFormData({ ...formData, shippingCharges: Math.max(0, Number(e.target.value)) })} />
                </div>
                <div className="form-field">
                  <label>Bank Name</label>
                  <input value={formData.bankName} onChange={(e) => setFormData({ ...formData, bankName: e.target.value })} />
                </div>
                <div className="form-field">
                  <label>Account Number</label>
                  <input value={formData.accountNo} onChange={(e) => setFormData({ ...formData, accountNo: e.target.value })} />
                </div>
                <div className="form-field">
                  <label>IFSC Code</label>
                  <input value={formData.ifscCode} onChange={(e) => setFormData({ ...formData, ifscCode: e.target.value })} />
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* PRINTABLE INVOICE SHEET */}
      <div className="sheet-wrap">
        <div className="sheet" id="invoice-sheet">
          {/* Watermark */}
          <div className="watermark">
            <span>{formData.paymentStatus}</span>
          </div>

          {/* Header */}
          <div className="inv-header">
            <div className="co-block">
              {/* EXACT SIDEBAR BRAND LOGO EMBED */}
              <div className="co-sidebar-logo">
                <div className="brand-text">
                  <span className="val">VALUE</span>
                  <span className="plus">PLUS</span>
                </div>
                <div className="tagline">
                  <div className="tagline-line" />
                  <span className="tagline-text">रिश्ता विश्वास का</span>
                  <div className="tagline-line" />
                </div>
              </div>

              <div>
                <div className="co-name-row">
                  <span className="co-wordmark">{formData.companyName}</span>
                  <span className="co-legal">{formData.companyLegal}</span>
                </div>
                <div className="co-details">
                  <div className="row">{formData.companyAddress}</div>
                  <div className="row">
                    <b>GSTIN:</b>&nbsp;{formData.companyGstin} &nbsp;·&nbsp; <b>PAN:</b>&nbsp;{formData.companyPan}
                  </div>
                  <div className="row">
                    <b>Ph:</b>&nbsp;{formData.companyPhone} &nbsp;·&nbsp; <b>Email:</b>&nbsp;{formData.companyEmail}
                  </div>
                  <div className="row">
                    <b>Web:</b>&nbsp;{formData.companyWeb}
                  </div>
                </div>
              </div>
            </div>

            <div className="inv-meta">
              <div className="inv-badge">{formData.invoiceType}</div>
              <table>
                <tbody>
                  <tr><td className="k">Invoice No.</td><td className="v mono">{formData.invoiceNo}</td></tr>
                  <tr><td className="k">Invoice Date</td><td className="v">{formData.invoiceDate ? new Date(formData.invoiceDate).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : ''}</td></tr>
                  <tr><td className="k">Due Date</td><td className="v">{formData.dueDate ? new Date(formData.dueDate).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : ''}</td></tr>
                  <tr><td className="k">Order No.</td><td className="v mono">{formData.orderNo}</td></tr>
                  <tr><td className="k">E-Way Bill No.</td><td className="v mono">{formData.ewayBillNo}</td></tr>
                  <tr><td className="k">Place of Supply</td><td className="v">{formData.placeOfSupply}</td></tr>
                </tbody>
              </table>
            </div>
          </div>

          {/* Parties */}
          <div className="parties">
            <div className="party">
              <div className="label">Bill To</div>
              <div className="cust-name">{formData.customerName}</div>
              <div className="kv"><b>GSTIN:</b> {formData.customerGstin}</div>
              <div className="kv"><b>Phone:</b> {formData.customerPhone}</div>
              <div className="kv"><b>Email:</b> {formData.customerEmail}</div>
              <div style={{ marginTop: "6px" }}>{formData.customerAddress}</div>
              {(formData.customerState || (formData.customerPin && !/^0+$/.test(String(formData.customerPin)))) && (
                <div className="kv"><b>State/PIN:</b> {formData.customerState} {(!formData.customerPin || /^0+$/.test(String(formData.customerPin))) ? "" : `— ${formData.customerPin}`}</div>
              )}
            </div>
            <div className="party">
              <div className="label">Ship To</div>
              <div className="cust-name">{formData.shippingName || formData.customerName}</div>
              <div style={{ marginTop: "6px" }}>{formData.shippingAddress || formData.customerAddress}</div>
              {(formData.shippingState || (formData.shippingPin && !/^0+$/.test(String(formData.shippingPin)))) && (
                <div className="kv"><b>State/PIN:</b> {formData.shippingState} {(!formData.shippingPin || /^0+$/.test(String(formData.shippingPin))) ? "" : `— ${formData.shippingPin}`}</div>
              )}
              <div className="kv" style={{ marginTop: "10px" }}>
                <b>Delivery Address same as Shipping Address</b>
              </div>
            </div>
          </div>

          {/* Items Table */}
          <div className="table-wrap">
            <table className="items">
              <thead>
                <tr>
                  <th style={{ width: "28px" }}>#</th>
                  <th>Product</th>
                  <th>HSN</th>
                  <th className="num">Qty</th>
                  <th>Unit</th>
                  <th className="num">Rate</th>
                  <th className="num">Disc.</th>
                  <th className="num">GST%</th>
                  <th className="num">GST Amt</th>
                  <th className="num">Amount</th>
                </tr>
              </thead>
              <tbody>
                {calculatedItems.map((item, idx) => (
                  <tr key={item.id || idx}>
                    <td>{idx + 1}</td>
                    <td>
                      <div className="p-name">{item.name}</div>
                      {item.serialImei && <div className="p-hsn" style={{ color: "#3F63AD", fontWeight: 600 }}>IMEI/SN: {item.serialImei}</div>}
                      <div className="p-hsn">HSN {item.hsn}</div>
                    </td>
                    <td className="mono">{item.hsn}</td>
                    <td className="num">{item.qty}</td>
                    <td>{item.unit}</td>
                    <td className="num">{item.rate.toLocaleString("en-IN", { minimumFractionDigits: 2 })}</td>
                    <td className="num">{item.discount.toLocaleString("en-IN", { minimumFractionDigits: 2 })}</td>
                    <td className="num">{item.gstRate}%</td>
                    <td className="num">{item.gstAmount.toLocaleString("en-IN", { minimumFractionDigits: 2 })}</td>
                    <td className="num">{item.totalAmount.toLocaleString("en-IN", { minimumFractionDigits: 2 })}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Summary & Payment */}
          <div className="lower">
            <div className="lower-left">
              {formData.invoiceType !== "PROFORMA ESTIMATE" && (
                <div className="box">
                  <div className="label">Payment Status</div>
                  <div className="payment-box">
                    <div className="pay-item">
                      <div className="k">Status</div>
                      <span className={`status-pill ${formData.paymentStatus}`}>
                        <span className="dot"></span>
                        {formData.paymentStatus}
                      </span>
                    </div>
                    <div className="pay-item">
                      <div className="k">Method</div>
                      <div className="v font-semibold">{formData.paymentMethod}</div>
                    </div>
                    {(formData.paymentMethod?.includes("Finance") || formData.paymentMethod?.includes("EMI")) && formData.financeCompany && (
                      <>
                        <div className="pay-item">
                          <div className="k">Finance Provider</div>
                          <div className="v font-bold text-[#3F63AD]">{formData.financeCompany} {formData.financeApprovalNo ? `(#${formData.financeApprovalNo})` : ''}</div>
                        </div>
                        <div className="pay-item">
                          <div className="k">Down Payment Paid</div>
                          <div className="v font-bold text-emerald-700">₹ {formData.downPayment.toLocaleString("en-IN")} <span className="text-xs font-semibold text-slate-500">({formData.downPaymentMode || "Cash"})</span></div>
                        </div>
                        <div className="pay-item">
                          <div className="k">Financed Amount</div>
                          <div className="v font-bold text-purple-700">₹ {Math.max(0, totals.grandTotal - formData.downPayment).toLocaleString("en-IN")}</div>
                        </div>
                        <div className="pay-item">
                          <div className="k">EMI Scheme</div>
                          <div className="v font-bold text-blue-700">
                            {formData.financeSchemeType === "no_cost"
                              ? "No-Cost EMI (0% Interest Offer)"
                              : `Standard Interest EMI (${formData.financeInterestRate}% p.a.)`}
                          </div>
                        </div>
                        <div className="pay-item">
                          <div className="k">Monthly EMI</div>
                          <div className="v font-extrabold text-slate-900">
                            ₹ {(formData.monthlyEMI || Math.round(Math.max(0, totals.grandTotal - formData.downPayment) / (formData.financeTenureMonths || 6))).toLocaleString("en-IN")} / mo ({formData.financeTenureMonths || 6} Months)
                          </div>
                        </div>
                        {formData.financeSchemeType !== "no_cost" && formData.totalInterest > 0 && (
                          <div className="pay-item">
                            <div className="k">Total EMI Interest</div>
                            <div className="v font-bold text-amber-700">₹ {formData.totalInterest.toLocaleString("en-IN")}</div>
                          </div>
                        )}
                      </>
                    )}
                  </div>
                </div>
              )}
            </div>

            <div className="lower-right">
              <div className="box">
                <div className="label">Invoice Summary</div>
                <div className="totals">
                  <div className="row">
                    <span>Subtotal</span>
                    <span>{formatCurrency(totals.grossSubtotal)}</span>
                  </div>
                  <div className="row">
                    <span>Discount</span>
                    <span>– {formatCurrency(totals.totalDiscount)}</span>
                  </div>
                  <div className="row">
                    <span>Taxable Value</span>
                    <span>{formatCurrency(totals.taxableValue)}</span>
                  </div>
                  {totals.cgst > 0 ? (
                    <>
                      <div className="row">
                        <span>CGST @ 9%</span>
                        <span>{formatCurrency(totals.cgst)}</span>
                      </div>
                      <div className="row">
                        <span>SGST @ 9%</span>
                        <span>{formatCurrency(totals.sgst)}</span>
                      </div>
                    </>
                  ) : (
                    <div className="row">
                      <span>IGST @ 18%</span>
                      <span>{formatCurrency(totals.igst)}</span>
                    </div>
                  )}
                  {totals.shipping > 0 && (
                    <div className="row">
                      <span>Shipping Charges</span>
                      <span>{formatCurrency(totals.shipping)}</span>
                    </div>
                  )}
                  {totals.roundOff !== 0 && (
                    <div className="row">
                      <span>Round Off</span>
                      <span>{totals.roundOff > 0 ? `+ ₹ ${totals.roundOff}` : `– ₹ ${Math.abs(totals.roundOff)}`}</span>
                    </div>
                  )}
                  <div className="row grand">
                    <span>Grand Total</span>
                    <span>{formatCurrency(totals.grandTotal)}</span>
                  </div>
                  <div className="words">
                    <b>Amount in Words:</b> {totals.amountInWords}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Terms */}
          <div className="terms">
            <div className="col">
              <div className="label">Terms &amp; Conditions</div>
              <ul>
                <li>Goods once sold are not returnable after 7 days of delivery.</li>
                <li>All disputes are subject to Prayagraj jurisdiction only.</li>
              </ul>
            </div>
            <div className="col">
              <div className="label">Return Policy</div>
              <ul>
                <li>Defective items replaced within 7 days with original packaging.</li>
                <li>Return freight to be borne by the customer.</li>
              </ul>
            </div>
            <div className="col">
              <div className="label">Payment Terms</div>
              <ul>
                <li>Payment due within 10 days from the invoice date.</li>
                <li>Late payments attract 1.5% interest per month.</li>
              </ul>
            </div>
          </div>

          {/* Signatures */}
          <div className="sign-row">
            <div className="sign-block">
              <div className="sign-line">Customer Signature</div>
            </div>
            <div className="sign-block">
              <div className="sign-line">
                Authorized Signatory<br />
                <span style={{ fontWeight: "700", color: "var(--ink)" }}>for {formData.companyLegal}</span>
              </div>
            </div>
          </div>

          {/* Footer Bar */}
          <div className="footer-bar" style={{ fontSize: "12px", fontWeight: "700", color: "var(--vp-blue)" }}>
            Thanks for shopping with us! &nbsp;·&nbsp; <b>VALUEPLUS — रिश्ता विश्वास का</b>
          </div>
        </div>
      </div>
    </>
  );
}
