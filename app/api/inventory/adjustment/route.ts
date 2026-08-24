import { NextResponse } from "next/server";
import connectToDatabase from "@/lib/db";
import StockAdjustment from "@/models/StockAdjustment";
import Item from "@/models/Item";

export async function GET() {
  try {
    await connectToDatabase();
    const adjustments = await StockAdjustment.find({}).sort({ createdAt: -1 }).lean();
    return NextResponse.json({ success: true, data: adjustments });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    await connectToDatabase();

    const adjustmentNo = body.adjustmentNo || `ADJ-${new Date().getFullYear()}-${Math.floor(Math.random() * 10000).toString().padStart(4, "0")}`;
    const payload = { ...body, adjustmentNo };

    const adjustment = await StockAdjustment.create(payload);

    // Update stock for each item based on type
    if (body.items && Array.isArray(body.items)) {
      for (const item of body.items) {
        if (item.itemId && item.quantity) {
          const qty = Number(item.quantity);
          const incValue = item.type === "in" ? qty : -qty;
          await Item.findByIdAndUpdate(item.itemId, {
            $inc: { currentStock: incValue }
          });
        }
      }
    }

    return NextResponse.json({ success: true, data: adjustment });
  } catch (error: any) {
    if (error.code === 11000) {
      return NextResponse.json({ success: false, error: "Adjustment number already exists" }, { status: 400 });
    }
    return NextResponse.json({ success: false, error: error.message }, { status: 400 });
  }
}

export async function DELETE(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const adjustmentNo = searchParams.get("adjustmentNo");
    
    if (!adjustmentNo) {
      return NextResponse.json({ success: false, error: "adjustmentNo is required" }, { status: 400 });
    }

    await connectToDatabase();
    const deletedAdjustment = await StockAdjustment.findOneAndDelete({ adjustmentNo });
    
    if (!deletedAdjustment) {
      return NextResponse.json({ success: false, error: "Stock Adjustment not found" }, { status: 404 });
    }

    // Reverse the stock impact
    if (deletedAdjustment.items && Array.isArray(deletedAdjustment.items)) {
      for (const item of deletedAdjustment.items) {
        if (item.itemId && item.quantity) {
          const qty = Number(item.quantity);
          const incValue = item.type === "in" ? -qty : qty; // Reversing the original operation
          await Item.findByIdAndUpdate(item.itemId, {
            $inc: { currentStock: incValue }
          });
        }
      }
    }

    return NextResponse.json({ success: true, data: {} });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
