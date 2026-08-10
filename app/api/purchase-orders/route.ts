import { NextResponse } from "next/server";
import connectToDatabase from "@/lib/db";
import PurchaseOrder from "@/models/PurchaseOrder";

export async function GET() {
  try {
    await connectToDatabase();
    const pos = await PurchaseOrder.find({}).sort({ createdAt: -1 });
    return NextResponse.json({ success: true, data: pos });
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
      poNo: body.poNo || `PO-${new Date().getFullYear()}-${Math.floor(Math.random() * 10000).toString().padStart(4, "0")}`,
    };

    const po = await PurchaseOrder.create(payload);
    return NextResponse.json({ success: true, data: po });
  } catch (error: any) {
    if (error.code === 11000) {
       return NextResponse.json({ success: false, error: "PO number already exists" }, { status: 400 });
    }
    return NextResponse.json({ success: false, error: error.message }, { status: 400 });
  }
}

export async function PUT(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const poNo = searchParams.get("poNo");
    
    if (!poNo) {
      return NextResponse.json({ success: false, error: "poNo is required" }, { status: 400 });
    }

    const body = await req.json();
    await connectToDatabase();
    
    const updatedPO = await PurchaseOrder.findOneAndUpdate({ poNo }, body, { new: true });
    
    if (!updatedPO) {
      return NextResponse.json({ success: false, error: "Purchase Order not found" }, { status: 404 });
    }

    return NextResponse.json({ success: true, data: updatedPO });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const poNo = searchParams.get("poNo");
    
    if (!poNo) {
      return NextResponse.json({ success: false, error: "poNo is required" }, { status: 400 });
    }

    await connectToDatabase();
    const deletedPO = await PurchaseOrder.findOneAndDelete({ poNo });
    
    if (!deletedPO) {
      return NextResponse.json({ success: false, error: "Purchase Order not found" }, { status: 404 });
    }

    return NextResponse.json({ success: true, data: {} });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
