import { NextResponse } from "next/server";
import connectToDatabase from "@/lib/db";
import Item from "@/models/Item";

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const brand = searchParams.get("brand");
    const category = searchParams.get("category");

    await connectToDatabase();

    const filter: Record<string, string> = {};
    if (brand) filter.brand = brand;
    if (category) filter.category = category;

    const items = await Item.find(filter).sort({ createdAt: -1 });
    return NextResponse.json({ success: true, data: items });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}


export async function POST(req: Request) {
  try {
    const body = await req.json();
    await connectToDatabase();
    // body includes code, name, category, brand, unit, hsn, gstRate, purchasePrice, sellingPrice, mrp, currentStock, reorderLevel, warehouse, status
    // map hsn to hsnCode for schema if needed, or update schema to use hsn. The schema uses hsnCode.
    const payload = {
      ...body,
      hsnCode: body.hsn || body.hsnCode,
    };
    const item = await Item.create(payload);
    return NextResponse.json({ success: true, data: item });
  } catch (error: any) {
    if (error.code === 11000) {
       return NextResponse.json({ success: false, error: "Item code already exists" }, { status: 400 });
    }
    return NextResponse.json({ success: false, error: error.message }, { status: 400 });
  }
}

export async function DELETE(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const code = searchParams.get("code");
    
    if (!code) {
      return NextResponse.json({ success: false, error: "Item code is required" }, { status: 400 });
    }

    await connectToDatabase();
    await Item.findOneAndDelete({ code });

    return NextResponse.json({ success: true, message: "Item deleted successfully" });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function PUT(req: Request) {
  try {
    const body = await req.json();
    await connectToDatabase();
    const payload = {
      ...body,
      hsnCode: body.hsn || body.hsnCode,
    };
    
    if (!payload.code) {
      return NextResponse.json({ success: false, error: "Item code is required for update" }, { status: 400 });
    }

    const updatedItem = await Item.findOneAndUpdate({ code: payload.code }, payload, { new: true });
    
    if (!updatedItem) {
      return NextResponse.json({ success: false, error: "Item not found" }, { status: 404 });
    }

    return NextResponse.json({ success: true, message: "Item updated successfully", data: updatedItem });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
