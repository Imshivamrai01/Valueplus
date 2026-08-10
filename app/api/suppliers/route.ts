import { NextResponse } from "next/server";
import connectToDatabase from "@/lib/db";
import Supplier from "@/models/Supplier";

export async function GET() {
  try {
    await connectToDatabase();
    const suppliers = await Supplier.find({}).sort({ createdAt: -1 });
    return NextResponse.json({ success: true, data: suppliers });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    await connectToDatabase();
    const supplier = await Supplier.create(body);
    return NextResponse.json({ success: true, data: supplier });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 400 });
  }
}

export async function PUT(req: Request) {
  try {
    const body = await req.json();
    await connectToDatabase();
    
    if (!body.code) {
      return NextResponse.json({ success: false, error: "Supplier code is required for update" }, { status: 400 });
    }

    const updatedSupplier = await Supplier.findOneAndUpdate({ code: body.code }, body, { new: true });
    
    if (!updatedSupplier) {
      return NextResponse.json({ success: false, error: "Supplier not found" }, { status: 404 });
    }

    return NextResponse.json({ success: true, message: "Supplier updated successfully!", data: updatedSupplier });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const code = searchParams.get("code");
    
    if (!code) {
      return NextResponse.json({ success: false, error: "Supplier code is required" }, { status: 400 });
    }

    await connectToDatabase();
    await Supplier.findOneAndDelete({ code });

    return NextResponse.json({ success: true, message: "Supplier deleted successfully" });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
