import { NextResponse } from "next/server";
import connectToDatabase from "@/lib/db";
import Invoice from "@/models/Invoice";

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const rangeParam = searchParams.get("range") || searchParams.get("period") || "month";
    const range = rangeParam.toLowerCase();
    const startDate = searchParams.get("startDate");
    const endDate = searchParams.get("endDate");
    
    await connectToDatabase();
    
    const filter: any = {
      type: { $ne: "sales-order" },
    };
    
    const now = new Date();
    const todayStr = now.toISOString().split("T")[0];
    
    if (range === "today") {
      filter.date = todayStr;
    } else if (range === "week" || range === "this week") {
      const oneWeekAgo = new Date(now.getTime() - 7 * 86400000).toISOString().split("T")[0];
      filter.date = { $gte: oneWeekAgo, $lte: todayStr };
    } else if (range === "month" || range === "this month") {
      const monthStart = `${todayStr.substring(0, 7)}-01`;
      filter.date = { $gte: monthStart, $lte: todayStr };
    } else if (startDate && endDate) {
      filter.date = { $gte: startDate, $lte: endDate };
    }
    
    const invoices = await Invoice.find(filter);
    
    // Group metrics by staff
    const staffMap: Record<string, {
      staffName: string;
      salesAmount: number;
      numberOfBills: number;
      unitsSold: number;
      netSales: number;
      collection: number;
      warrantySales: number;
    }> = {};
    
    invoices.forEach((inv: any) => {
      const staff = inv.salesExecutive || "Amit Kumar";
      if (!staffMap[staff]) {
        staffMap[staff] = {
          staffName: staff,
          salesAmount: 0,
          numberOfBills: 0,
          unitsSold: 0,
          netSales: 0,
          collection: 0,
          warrantySales: 0,
        };
      }
      
      const totalUnits = inv.items?.reduce((sum: number, it: any) => sum + (Number(it.quantity) || 1), 0) || 1;
      const total = Number(inv.total) || 0;
      const paid = Number(inv.paidAmount) || (inv.status === "paid" ? total : 0);
      
      staffMap[staff].salesAmount += total;
      staffMap[staff].numberOfBills += 1;
      staffMap[staff].unitsSold += totalUnits;
      staffMap[staff].netSales += Number(inv.taxableAmount) || (total - (Number(inv.totalGST) || 0));
      staffMap[staff].collection += paid;
      staffMap[staff].warrantySales += Number(inv.extendedWarrantyTotal) || 0;
    });
    
    const rankedStaff = Object.values(staffMap).map((s: any) => ({
      staffName: s.staffName,
      salesAmount: s.salesAmount || 0,
      totalSales: s.salesAmount || 0,
      numberOfBills: s.numberOfBills || 0,
      totalInvoices: s.numberOfBills || 0,
      unitsSold: s.unitsSold || 0,
      netSales: s.netSales || 0,
      collection: s.collection || 0,
      totalCollected: s.collection || 0,
      averageOrderValue: s.numberOfBills > 0 ? Math.round(s.salesAmount / s.numberOfBills) : 0,
      warrantySales: s.warrantySales || 0,
    })).sort((a, b) => b.totalSales - a.totalSales);
    
    return NextResponse.json({
      success: true,
      range,
      data: rankedStaff,
      totalInvoicesInPeriod: invoices.length,
      totalRevenueInPeriod: invoices.reduce((sum: number, inv: any) => sum + (Number(inv.total) || 0), 0),
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
