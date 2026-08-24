import { NextResponse } from "next/server";
import connectToDatabase from "@/lib/db";
import StockDiscrepancy from "@/models/StockDiscrepancy";
import Item from "@/models/Item";

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const status = searchParams.get("status");
    
    await connectToDatabase();
    
    const filter: any = {};
    if (status && status !== "all") filter.status = status;
    
    const discrepancies = await StockDiscrepancy.find(filter).sort({ createdAt: -1 }).lean();
    return NextResponse.json({ success: true, data: discrepancies });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    await connectToDatabase();
    
    if (!body.discrepancyNumber) {
      const count = await StockDiscrepancy.countDocuments();
      body.discrepancyNumber = `DISC-2026-${String(count + 1).padStart(4, "0")}`;
    }
    
    const discrepancy = await StockDiscrepancy.create(body);
    return NextResponse.json({ success: true, data: discrepancy });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 400 });
  }
}

// Approve / Reject Discrepancy & adjust physical stock safely
export async function PUT(req: Request) {
  try {
    const body = await req.json();
    await connectToDatabase();
    
    const { id, status, approvedBy, resolutionNotes } = body;
    if (!id) {
      return NextResponse.json({ success: false, error: "Discrepancy ID is required" }, { status: 400 });
    }
    
    const record = await StockDiscrepancy.findById(id);
    if (!record) {
      return NextResponse.json({ success: false, error: "Discrepancy record not found" }, { status: 404 });
    }
    
    record.status = status;
    if (approvedBy) record.approvedBy = approvedBy;
    if (resolutionNotes) record.resolutionNotes = resolutionNotes;
    
    // If approved, update Item stock with audit trail
    if (status === "Approved" && record.productId) {
      await Item.findByIdAndUpdate(record.productId, {
        currentStock: record.physicalStock,
      });
    }
    
    await record.save();
    return NextResponse.json({ success: true, data: record, message: `Discrepancy status updated to ${status}` });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
