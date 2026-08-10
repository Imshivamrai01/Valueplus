import { NextResponse } from "next/server";
import connectToDatabase from "@/lib/db";
import Estimate from "@/models/Estimate";

export async function GET() {
  try {
    await connectToDatabase();
    const estimates = await Estimate.find({}).sort({ createdAt: -1 });
    return NextResponse.json({ success: true, data: estimates });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    await connectToDatabase();
    const estimate = await Estimate.create(body);
    return NextResponse.json({ success: true, data: estimate });
  } catch (error: any) {
    if (error.code === 11000) {
       return NextResponse.json({ success: false, error: "Estimate number already exists" }, { status: 400 });
    }
    return NextResponse.json({ success: false, error: error.message }, { status: 400 });
  }
}

export async function PUT(req: Request) {
  try {
    const body = await req.json();
    await connectToDatabase();
    
    if (!body.estimateNumber) {
      return NextResponse.json({ success: false, error: "Estimate number is required for update" }, { status: 400 });
    }

    const updatedEstimate = await Estimate.findOneAndUpdate({ estimateNumber: body.estimateNumber }, body, { new: true });
    
    if (!updatedEstimate) {
      return NextResponse.json({ success: false, error: "Estimate not found" }, { status: 404 });
    }

    return NextResponse.json({ success: true, message: "Estimate updated successfully", data: updatedEstimate });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const estimateNumber = searchParams.get("estimateNumber");
    
    if (!estimateNumber) {
      return NextResponse.json({ success: false, error: "Estimate number is required" }, { status: 400 });
    }

    await connectToDatabase();
    await Estimate.findOneAndDelete({ estimateNumber });

    return NextResponse.json({ success: true, message: "Estimate deleted successfully" });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
