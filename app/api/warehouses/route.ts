import { NextResponse } from "next/server";
import connectToDatabase from "@/lib/db";
import Warehouse from "@/models/Warehouse";

export async function GET() {
  try {
    await connectToDatabase();
    const warehouses = await Warehouse.find({}).sort({ createdAt: -1 });
    return NextResponse.json({ success: true, data: warehouses });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    await connectToDatabase();
    const warehouse = await Warehouse.create(body);
    return NextResponse.json({ success: true, data: warehouse });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 400 });
  }
}

export async function DELETE(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");
    
    if (!id) {
      return NextResponse.json({ success: false, error: "ID is required" }, { status: 400 });
    }
    
    await connectToDatabase();
    const deletedWarehouse = await Warehouse.findByIdAndDelete(id);
    
    if (!deletedWarehouse) {
      return NextResponse.json({ success: false, error: "Warehouse not found" }, { status: 404 });
    }
    
    return NextResponse.json({ success: true, message: "Warehouse deleted successfully" });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
