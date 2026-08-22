import { NextResponse } from "next/server";
import connectToDatabase from "@/lib/db";
import Item from "@/models/Item";

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const brand = searchParams.get("brand");
    const category = searchParams.get("category");
    const warehouse = searchParams.get("warehouse") || searchParams.get("location");

    await connectToDatabase();

    const filter: any = {};
    if (brand && brand !== "all") {
      filter.brand = { $regex: new RegExp(`^${brand.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, "i") };
    }
    if (category && category !== "all") {
      filter.category = { $regex: new RegExp(`^${category.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, "i") };
    }

    if (warehouse && warehouse !== "all") {
      const isAshoka = warehouse.toLowerCase().includes("ashoka") || warehouse.toLowerCase().includes("kunraghat") || warehouse === "VP-KUN";
      if (!isAshoka) {
        const cleanWh = warehouse.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        filter.warehouse = { $regex: new RegExp(cleanWh, "i") };
      } else {
        filter.$or = [
          { warehouse: { $exists: false } },
          { warehouse: "" },
          { warehouse: null },
          { warehouse: { $regex: /ashoka|kunraghat|vp-kun|main showroom/i } }
        ];
      }
    }

    const items = await Item.find(filter).sort({ currentStock: -1, name: 1 });
    return NextResponse.json({ success: true, data: items });
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
      hsnCode: body.hsn || body.hsnCode,
    };

    // Check if item exists by exact name (case-insensitive)
    // Escape regex characters in payload.name just in case
    const escapedName = payload.name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const existingItem = await Item.findOne({ name: { $regex: new RegExp(`^${escapedName}$`, "i") } });

    if (existingItem) {
      // Update existing item
      existingItem.currentStock = (existingItem.currentStock || 0) + (Number(payload.currentStock) || 0);
      if (payload.hsnCode) {
        existingItem.hsnCode = payload.hsnCode;
      }
      await existingItem.save();
      return NextResponse.json({ success: true, data: existingItem, message: "Existing item stock and HSN updated" });
    } else {
      // Create new item
      const item = await Item.create(payload);
      return NextResponse.json({ success: true, data: item });
    }
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
