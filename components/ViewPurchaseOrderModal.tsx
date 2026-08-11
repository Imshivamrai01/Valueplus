import React from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { formatCurrency, formatDate } from "@/lib/utils";
import { ShoppingBag, X } from "lucide-react";
import { Badge } from "@/components/ui/badge";

interface ViewPurchaseOrderModalProps {
  isOpen: boolean;
  onClose: () => void;
  purchaseOrder: any;
}

export function ViewPurchaseOrderModal({ isOpen, onClose, purchaseOrder }: ViewPurchaseOrderModalProps) {
  if (!purchaseOrder) return null;

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-3xl p-0 overflow-hidden bg-white">
        <div className="bg-gradient-to-r from-amber-900 via-amber-800 to-amber-900 text-white p-6 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-white/10 flex items-center justify-center backdrop-blur-md border border-white/20">
              <ShoppingBag className="w-6 h-6 text-amber-400" />
            </div>
            <div>
              <DialogTitle className="text-xl font-bold tracking-tight">Purchase Order Details</DialogTitle>
              <DialogDescription className="text-amber-200 text-xs mt-0.5">
                {purchaseOrder.poNo}
              </DialogDescription>
            </div>
          </div>
          <Button variant="ghost" size="icon" onClick={onClose} className="text-white hover:bg-white/20">
            <X className="w-5 h-5" />
          </Button>
        </div>

        <div className="p-6 space-y-6">
          {/* Header Info */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 bg-slate-50 p-4 rounded-xl border border-slate-100">
            <div>
              <p className="text-xs text-slate-500 font-medium">Supplier</p>
              <p className="font-semibold text-slate-900">{purchaseOrder.supplierName}</p>
            </div>
            <div>
              <p className="text-xs text-slate-500 font-medium">Order Date</p>
              <p className="font-semibold text-slate-900">{formatDate(purchaseOrder.date)}</p>
            </div>
            <div>
              <p className="text-xs text-slate-500 font-medium">Expected Date</p>
              <p className="font-semibold text-slate-900">{formatDate(purchaseOrder.expectedDate)}</p>
            </div>
            <div>
              <p className="text-xs text-slate-500 font-medium">Status</p>
              <Badge variant={purchaseOrder.status === "received" ? "success" : purchaseOrder.status === "partial" ? "info" : "warning"} className="mt-1">
                {purchaseOrder.status}
              </Badge>
            </div>
          </div>

          {/* Items */}
          <div>
            <h4 className="font-semibold text-slate-800 mb-3">Order Items</h4>
            <div className="border rounded-xl overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-slate-50 border-b">
                  <tr>
                    <th className="px-4 py-3 text-left font-semibold text-slate-600">Product</th>
                    <th className="px-4 py-3 text-right font-semibold text-slate-600">Qty</th>
                    <th className="px-4 py-3 text-right font-semibold text-slate-600">Rate</th>
                    <th className="px-4 py-3 text-right font-semibold text-slate-600">GST %</th>
                    <th className="px-4 py-3 text-right font-semibold text-slate-600">Amount</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {purchaseOrder.items?.map((item: any, idx: number) => {
                    const amount = item.quantity * item.rate;
                    return (
                      <tr key={idx} className="hover:bg-slate-50">
                        <td className="px-4 py-3 font-medium text-slate-800">{item.name}</td>
                        <td className="px-4 py-3 text-right">{item.quantity}</td>
                        <td className="px-4 py-3 text-right">{formatCurrency(item.rate)}</td>
                        <td className="px-4 py-3 text-right text-slate-500">{item.gstRate}%</td>
                        <td className="px-4 py-3 text-right font-medium">{formatCurrency(amount)}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* Totals */}
          <div className="flex justify-end">
            <div className="w-full max-w-sm space-y-3 bg-slate-50 p-4 rounded-xl border border-slate-100">
              <div className="flex justify-between text-sm text-slate-600">
                <span>Subtotal</span>
                <span className="font-medium">{formatCurrency(purchaseOrder.subtotal || 0)}</span>
              </div>
              <div className="flex justify-between text-sm text-slate-600">
                <span>Total GST</span>
                <span className="font-medium">{formatCurrency(purchaseOrder.gst || 0)}</span>
              </div>
              <div className="pt-3 border-t border-slate-200 flex justify-between">
                <span className="font-bold text-slate-900">Total Amount</span>
                <span className="font-black text-[#3F63AD] text-lg">{formatCurrency(purchaseOrder.totalAmount || 0)}</span>
              </div>
            </div>
          </div>
        </div>

        <DialogFooter className="bg-slate-50 p-4 border-t">
          <Button variant="outline" onClick={onClose}>Close</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
