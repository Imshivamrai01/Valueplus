import { NextResponse } from "next/server";
import connectToDatabase from "@/lib/db";
import StockTransfer from "@/models/StockTransfer";

export async function GET() {
  try {
    await connectToDatabase();
    const transfers = await StockTransfer.find({}).sort({ createdAt: -1 });
    return NextResponse.json({ success: true, data: transfers });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    await connectToDatabase();

    const payload = {
      ...body,
      transferNo: body.transferNo || `STR-${new Date().getFullYear()}-${Math.floor(Math.random() * 10000).toString().padStart(4, "0")}`,
    };

    const transfer = await StockTransfer.create(payload);
    return NextResponse.json({ success: true, data: transfer });
  } catch (error: any) {
    if (error.code === 11000) {
       return NextResponse.json({ success: false, error: "Transfer number already exists" }, { status: 400 });
    }
    return NextResponse.json({ success: false, error: error.message }, { status: 400 });
  }
}

export async function PUT(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const transferNo = searchParams.get("transferNo");
    
    if (!transferNo) {
      return NextResponse.json({ success: false, error: "transferNo is required" }, { status: 400 });
    }

    const body = await req.json();
    await connectToDatabase();
    
    const updatedTransfer = await StockTransfer.findOneAndUpdate({ transferNo }, body, { new: true });
    
    if (!updatedTransfer) {
      return NextResponse.json({ success: false, error: "Stock Transfer not found" }, { status: 404 });
    }

    return NextResponse.json({ success: true, data: updatedTransfer });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const transferNo = searchParams.get("transferNo");
    
    if (!transferNo) {
      return NextResponse.json({ success: false, error: "transferNo is required" }, { status: 400 });
    }

    await connectToDatabase();
    const deletedTransfer = await StockTransfer.findOneAndDelete({ transferNo });
    
    if (!deletedTransfer) {
      return NextResponse.json({ success: false, error: "Stock Transfer not found" }, { status: 404 });
    }

    return NextResponse.json({ success: true, data: {} });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
