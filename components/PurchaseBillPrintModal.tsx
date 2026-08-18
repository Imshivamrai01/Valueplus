"use client";

import React, { useRef } from "react";
import { 
  Printer, 
  Download, 
  Share2, 
  MessageSquare, 
  Building2, 
  Truck, 
  FileText, 
  Calendar, 
  CheckCircle2, 
  X,
  CreditCard
} from "lucide-react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { formatCurrency, formatDate } from "@/lib/utils";

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

interface PurchaseBillPrintModalProps {
  isOpen: boolean;
  onClose: () => void;
  billData: any;
}

export function PurchaseBillPrintModal({ isOpen, onClose, billData }: PurchaseBillPrintModalProps) {
  const printRef = useRef<HTMLDivElement>(null);

  if (!billData) return null;

  const subtotal = Number(billData.subtotal || billData.amount || 0);
  const gst = Number(billData.gst || billData.totalTax || 0);
  const total = Number(billData.total || billData.totalAmount || (subtotal + gst));
  const paid = Number(billData.paid || 0);
  const balance = Number(billData.balance ?? (total - paid));

  const items = Array.isArray(billData.items) && billData.items.length > 0
    ? billData.items
    : [
        {
          name: billData.itemName || "Inward Goods / Electronic Appliance Supplies",
          quantity: billData.quantity || 1,
          rate: subtotal || total,
          gstRate: 18,
          hsnCode: "8528",
        }
      ];

  const handlePrint = () => {
    window.print();
  };

  const handleWhatsAppShare = () => {
    const text = `*PURCHASE INWARD BILL - VALUE PLUS*\nBill No: ${billData.billNo || billData.billNumber}\nSupplier: ${billData.supplierName}\nDate: ${billData.billDate || billData.date || "Today"}\nTotal Amount: ${formatCurrency(total)}\nStatus: ${billData.status || "Paid"}\nThank you!`;
    window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, "_blank");
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[95vh] p-0 overflow-y-auto border-none shadow-2xl rounded-2xl print:m-0 print:p-0 print:max-w-none print:shadow-none">
        {/* Top Floating Action Bar (Hidden during Print) */}
        <div className="sticky top-0 z-50 bg-slate-900 text-white px-6 py-3.5 flex items-center justify-between shadow-md print:hidden">
          <div className="flex items-center gap-2">
            <span className="font-mono font-bold text-xs bg-[#76C043] text-white px-2 py-0.5 rounded">
              {billData.billNo || billData.billNumber || "BILL-001"}
            </span>
            <span className="text-sm font-semibold text-slate-200">
              Supplier Purchase Invoice Voucher
            </span>
          </div>

          <div className="flex items-center gap-2">
            <Button
              size="sm"
              onClick={handlePrint}
              className="bg-[#76C043] hover:bg-[#62a634] text-white font-bold h-8 text-xs px-3 shadow-md"
            >
              <Printer className="w-3.5 h-3.5 mr-1.5" />
              Print / Save PDF
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={handleWhatsAppShare}
              className="bg-white/10 hover:bg-white/20 text-white border-white/20 h-8 text-xs px-3"
            >
              <Share2 className="w-3.5 h-3.5 mr-1.5" />
              WhatsApp
            </Button>
            <Button
              size="icon"
              variant="ghost"
              onClick={onClose}
              className="h-8 w-8 text-slate-400 hover:text-white hover:bg-white/10"
            >
              <X className="w-4 h-4" />
            </Button>
          </div>
        </div>

        {/* ─── PRINTABLE BILL CONTAINER ──────────────────────────────── */}
        <div 
          ref={printRef}
          className="p-8 bg-white text-slate-900 font-sans text-xs leading-relaxed space-y-6 print:p-6"
        >
          {/* Header Brand & Company Info */}
          <div className="border-b-2 border-slate-900 pb-5">
            <div className="flex justify-between items-start">
              <div>
                <div className="flex items-center gap-2">
                  <h1 className="text-2xl font-black tracking-tight text-slate-900">
                    M/S ASHOKA ENTERPRISES
                  </h1>
                  <span className="bg-[#3F63AD] text-white text-[11px] font-black px-2 py-0.5 rounded tracking-wide">
                    VALUE PLUS
                  </span>
                </div>
                <p className="text-xs text-slate-600 font-medium mt-1">
                  Authorised Multi-Brand Electronics, Appliances & Mobile Distributor
                </p>
                <p className="text-[11px] text-slate-500 mt-0.5">
                  H. No. 116, Near Shanti Marriage House, Deoria Road, Kunraghat, Gorakhpur, UP – 273008
                </p>
                <div className="flex flex-wrap items-center gap-4 text-[11px] text-slate-700 font-semibold mt-1.5">
                  <span>GSTIN: <b className="font-mono text-slate-900">09ANHPJ7242D1Z2</b></span>
                  <span>•</span>
                  <span>PAN: <b className="font-mono text-slate-900">ANHPJ7242D</b></span>
                  <span>•</span>
                  <span>Phone: <b className="text-slate-900">9140860604</b></span>
                </div>
              </div>

              <div className="text-right">
                <div className="inline-block bg-slate-100 border border-slate-300 rounded-lg p-3 text-right">
                  <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">
                    DOCUMENT TYPE
                  </span>
                  <span className="text-sm font-black text-slate-900 block">
                    PURCHASE INWARD BILL
                  </span>
                  <span className="text-xs font-mono font-bold text-[#3F63AD] block mt-0.5">
                    {billData.billNo || billData.billNumber}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Supplier & Bill Metadata Strip */}
          <div className="grid grid-cols-2 gap-6 bg-slate-50/80 p-4 rounded-xl border border-slate-200">
            {/* Left: Supplier Details */}
            <div className="space-y-1">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                SUPPLIER (BILL FROM)
              </span>
              <h3 className="text-sm font-bold text-slate-900">
                {billData.supplierName || "Authorised Supplier Partner"}
              </h3>
              {billData.supplierPhone && (
                <p className="text-slate-600 text-xs">
                  Mobile / Phone: <span className="font-mono font-semibold">{billData.supplierPhone}</span>
                </p>
              )}
              <p className="text-slate-500 text-[11px]">
                Inward Store Location: <span className="font-semibold text-slate-800">Main Store / Gorakhpur Central Hub</span>
              </p>
            </div>

            {/* Right: Bill Dates & Linked References */}
            <div className="space-y-1 text-right">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                INVOICE & DATES
              </span>
              <p className="text-xs text-slate-700">
                Bill Date: <b className="text-slate-900">{formatDate(billData.billDate || billData.date || new Date())}</b>
              </p>
              {billData.dueDate && (
                <p className="text-xs text-slate-700">
                  Payment Due Date: <b className="text-slate-900">{formatDate(billData.dueDate)}</b>
                </p>
              )}
              {billData.linkedPoNo && (
                <p className="text-xs text-slate-700">
                  Linked PO #: <b className="font-mono text-amber-700">{billData.linkedPoNo}</b>
                </p>
              )}
              <p className="text-xs text-slate-700">
                Payment Status:{" "}
                <span className={`inline-block px-2 py-0.2 rounded font-bold uppercase text-[10px] ${
                  billData.status === "paid" 
                    ? "bg-emerald-100 text-emerald-800 border border-emerald-300"
                    : "bg-amber-100 text-amber-800 border border-amber-300"
                }`}>
                  {billData.status || "Pending"}
                </span>
              </p>
            </div>
          </div>

          {/* Items Table */}
          <div className="border border-slate-300 rounded-lg overflow-hidden">
            <table className="w-full text-xs">
              <thead className="bg-slate-100 text-slate-700 font-bold uppercase text-[10px] border-b border-slate-300">
                <tr>
                  <th className="px-3 py-2.5 text-center w-10">#</th>
                  <th className="px-3 py-2.5 text-left">Item Description & Specifications</th>
                  <th className="px-2 py-2.5 text-center w-20">HSN</th>
                  <th className="px-2 py-2.5 text-center w-16">Qty</th>
                  <th className="px-3 py-2.5 text-right w-24">Purchase Rate</th>
                  <th className="px-2 py-2.5 text-center w-16">GST %</th>
                  <th className="px-3 py-2.5 text-right w-28">Total (₹)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {items.map((line: any, idx: number) => {
                  const qty = Number(line.quantity || 1);
                  const rate = Number(line.rate || 0);
                  const gstPercent = Number(line.gstRate || 18);
                  const lineTaxable = qty * rate;
                  const lineTotal = lineTaxable + (lineTaxable * gstPercent) / 100;

                  return (
                    <tr key={idx} className="hover:bg-slate-50">
                      <td className="px-3 py-2.5 text-center font-mono font-semibold text-slate-500">
                        {idx + 1}
                      </td>
                      <td className="px-3 py-2.5">
                        <p className="font-bold text-slate-900 text-xs">{line.name || line.itemName}</p>
                        {Array.isArray(line.serialNumbers) && line.serialNumbers.length > 0 && (
                          <p className="text-[10px] font-mono text-slate-500 mt-0.5">
                            Serials: {line.serialNumbers.join(", ")}
                          </p>
                        )}
                      </td>
                      <td className="px-2 py-2.5 text-center font-mono text-slate-600">
                        {line.hsnCode || line.hsn || "8528"}
                      </td>
                      <td className="px-2 py-2.5 text-center font-bold text-slate-900 font-mono">
                        {qty} {line.unit || "Pcs"}
                      </td>
                      <td className="px-3 py-2.5 text-right font-mono text-slate-800">
                        {formatCurrency(rate)}
                      </td>
                      <td className="px-2 py-2.5 text-center font-mono text-slate-600">
                        {gstPercent}%
                      </td>
                      <td className="px-3 py-2.5 text-right font-bold font-mono text-slate-900">
                        {formatCurrency(lineTotal)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Amount In Words & Financial Summary */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-2">
            {/* Left: Amount in Words & Terms */}
            <div className="space-y-3">
              <div className="bg-slate-50 p-3.5 rounded-lg border border-slate-200">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                  TOTAL AMOUNT IN WORDS
                </span>
                <p className="text-xs font-bold text-slate-800 italic mt-0.5">
                  {numberToWordsIndian(total)}
                </p>
              </div>

              <div className="text-[10.5px] text-slate-500 space-y-1">
                <p className="font-semibold text-slate-700">Verification & Inward Notes:</p>
                <p>1. All products received in good physical condition and verified with serial numbers.</p>
                <p>2. Stock successfully credited to Value Plus ERP Inventory Master.</p>
              </div>
            </div>

            {/* Right: Calculations */}
            <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-2">
              <div className="flex justify-between text-slate-600">
                <span>Taxable Subtotal:</span>
                <span className="font-mono font-bold text-slate-800">{formatCurrency(subtotal)}</span>
              </div>
              <div className="flex justify-between text-slate-600">
                <span>Total GST Input Tax:</span>
                <span className="font-mono font-bold text-slate-800">{formatCurrency(gst)}</span>
              </div>
              <div className="border-t border-slate-300 pt-2 flex justify-between text-sm font-black text-slate-900">
                <span>Grand Total:</span>
                <span className="font-mono text-[#3F63AD] text-base">{formatCurrency(total)}</span>
              </div>
              {paid > 0 && (
                <div className="flex justify-between text-xs text-emerald-700 pt-1">
                  <span>Amount Paid:</span>
                  <span className="font-mono font-bold">{formatCurrency(paid)}</span>
                </div>
              )}
              {balance > 0 && (
                <div className="flex justify-between text-xs text-amber-700">
                  <span>Payable Balance:</span>
                  <span className="font-mono font-bold">{formatCurrency(balance)}</span>
                </div>
              )}
            </div>
          </div>

          {/* Signatures */}
          <div className="grid grid-cols-2 gap-8 pt-8 border-t border-slate-300 text-center">
            <div>
              <div className="h-12"></div>
              <p className="border-t border-slate-400 pt-1 text-xs font-semibold text-slate-700">
                Received & Verified By (Store Manager)
              </p>
            </div>
            <div>
              <div className="h-12"></div>
              <p className="border-t border-slate-400 pt-1 text-xs font-semibold text-slate-700">
                For M/S ASHOKA ENTERPRISES (Authorised Signatory)
              </p>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
