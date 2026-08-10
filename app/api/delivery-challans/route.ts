import { NextResponse } from "next/server";
import connectToDatabase from "@/lib/db";
import DeliveryChallan from "@/models/DeliveryChallan";

export async function GET() {
  try {
    await connectToDatabase();
    const challans = await DeliveryChallan.find({}).sort({ createdAt: -1 });
    return NextResponse.json({ success: true, data: challans });
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
      challanNo: body.challanNo || `DC-${new Date().getFullYear()}-${Math.floor(Math.random() * 10000).toString().padStart(4, "0")}`,
    };

    const challan = await DeliveryChallan.create(payload);
    return NextResponse.json({ success: true, data: challan });
  } catch (error: any) {
    if (error.code === 11000) {
       return NextResponse.json({ success: false, error: "Challan number already exists" }, { status: 400 });
    }
    return NextResponse.json({ success: false, error: error.message }, { status: 400 });
  }
}

export async function PUT(req: Request) {
  try {
    const body = await req.json();
    await connectToDatabase();
    
    if (!body.challanNo) {
      return NextResponse.json({ success: false, error: "Challan number is required for update" }, { status: 400 });
    }

    const updatedChallan = await DeliveryChallan.findOneAndUpdate({ challanNo: body.challanNo }, body, { new: true });
    
    if (!updatedChallan) {
      return NextResponse.json({ success: false, error: "Challan not found" }, { status: 404 });
    }

    return NextResponse.json({ success: true, message: "Challan updated successfully", data: updatedChallan });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const challanNo = searchParams.get("challanNo");
    
    if (!challanNo) {
      return NextResponse.json({ success: false, error: "Challan number is required" }, { status: 400 });
    }

    await connectToDatabase();
    await DeliveryChallan.findOneAndDelete({ challanNo });

    return NextResponse.json({ success: true, message: "Challan deleted successfully" });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
