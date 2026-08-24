import { NextResponse } from "next/server";
import connectToDatabase from "@/lib/db";
import StockTransfer from "@/models/StockTransfer";

export async function GET() {
  try {
    await connectToDatabase();
    const transfers = await StockTransfer.find({}).sort({ createdAt: -1 }).lean();
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
      transferNo: body.transferNo || `STR-${new Date().getFullYear()}-${Date.now().toString().slice(-4)}-${Math.floor(Math.random() * 1000).toString().padStart(3, "0")}`,
      status: body.status || "in-transit",
    };

    const transfer = await StockTransfer.create(payload);
    const Item = (await import("@/models/Item")).default;

    // Deduct stock from source warehouse and transfer
    if (body.items && Array.isArray(body.items)) {
      for (const item of body.items) {
        if (item.itemId && item.quantity) {
          await Item.findByIdAndUpdate(item.itemId, {
            $inc: { currentStock: -Number(item.quantity) }
          });
        }
      }
    }

    return NextResponse.json({ success: true, data: transfer, message: `Stock transfer ${transfer.transferNo} dispatched from ${transfer.fromWarehouse} to ${transfer.toWarehouse}` });
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
    const Item = (await import("@/models/Item")).default;
    
    const existingTransfer = await StockTransfer.findOne({ transferNo });
    if (!existingTransfer) {
      return NextResponse.json({ success: false, error: "Stock Transfer not found" }, { status: 404 });
    }

    // If status changed to 'received' or 'completed', add stock to destination warehouse
    if (body.status === "received" && existingTransfer.status !== "received") {
      for (const item of existingTransfer.items) {
        const sourceItem = await Item.findById(item.itemId);
        if (sourceItem) {
          // Check if item exists in destination warehouse
          const destItem = await Item.findOne({
            code: `${sourceItem.code}-${existingTransfer.toWarehouse.replace(/\s+/g, "").substring(0, 4)}`,
            warehouse: existingTransfer.toWarehouse,
          }) || await Item.findOne({
            name: sourceItem.name,
            warehouse: existingTransfer.toWarehouse,
          });

          if (destItem) {
            destItem.currentStock = (destItem.currentStock || 0) + Number(item.quantity);
            await destItem.save();
          } else {
            // Create item in destination warehouse
            await Item.create({
              code: `${sourceItem.code}-${existingTransfer.toWarehouse.replace(/[^a-zA-Z0-9]/g, "").substring(0, 4).toUpperCase()}`,
              vpCode: sourceItem.vpCode,
              name: sourceItem.name,
              category: sourceItem.category,
              brand: sourceItem.brand,
              unit: sourceItem.unit || "Pcs",
              hsnCode: sourceItem.hsnCode,
              gstRate: sourceItem.gstRate,
              purchasePrice: sourceItem.purchasePrice,
              sellingPrice: sourceItem.sellingPrice,
              mrp: sourceItem.mrp,
              openingStock: Number(item.quantity),
              currentStock: Number(item.quantity),
              reorderLevel: sourceItem.reorderLevel || 5,
              warehouse: existingTransfer.toWarehouse,
              status: "active",
            });
          }
        }
      }
    }

    const updatedTransfer = await StockTransfer.findOneAndUpdate({ transferNo }, body, { new: true });
    return NextResponse.json({ success: true, data: updatedTransfer, message: `Transfer status updated to ${body.status}` });
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
