import { NextResponse } from "next/server";
import connectToDatabase from "@/lib/db";
import Invoice from "@/models/Invoice";
import PurchaseEntry from "@/models/PurchaseEntry";

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const type = searchParams.get("type"); // "GSTR1" or "GSTR2"
    
    await connectToDatabase();
    
    if (type === "GSTR1") {
      const invoices = await Invoice.find({ type: "tax-invoice" }).sort({ date: 1 }).lean();
      const mappedGSTR1 = invoices.map((inv: any) => ({
        reportId: inv.invoiceNumber,
        date: inv.date,
        partyName: inv.customerName,
        gstin: inv.customerGST || "URD",
        amount: inv.taxableAmount,
        cgst: inv.cgst,
        sgst: inv.sgst,
        igst: inv.igst,
        totalTax: inv.totalGST
      }));
      return NextResponse.json({ success: true, data: mappedGSTR1 });
    } else if (type === "GSTR2") {
      const purchases = await PurchaseEntry.find({}).sort({ date: 1 }).lean();
      const mappedGSTR2 = purchases.map((pur: any) => ({
        reportId: pur.billNo,
        date: pur.billDate || pur.createdAt,
        partyName: pur.supplierName,
        gstin: pur.supplierGST || "URD", 
        amount: pur.subtotal || 0,
        cgst: (pur.gst || 0) / 2,
        sgst: (pur.gst || 0) / 2,
        igst: 0,
        totalTax: pur.gst || 0
      }));
      return NextResponse.json({ success: true, data: mappedGSTR2 });
    }
    
    return NextResponse.json({ success: true, data: [] });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
