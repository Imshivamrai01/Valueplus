import { NextResponse } from "next/server";
import connectToDatabase from "@/lib/db";
import PurchaseEntry from "@/models/PurchaseEntry";
import Supplier from "@/models/Supplier";
import Item from "@/models/Item";

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const type = searchParams.get("type");

    await connectToDatabase();
    
    const query = type ? { type } : { type: { $ne: "debit-note" } }; // Default to entries if no type specified
    
    const entries = await PurchaseEntry.find(query).sort({ createdAt: -1 });
    return NextResponse.json({ success: true, data: entries });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    await connectToDatabase();

    // Determine sequence number if not provided
    let newBillNo = body.billNo;
    if (!newBillNo) {
      const isDebitNote = body.type === "debit-note";
      const count = await PurchaseEntry.countDocuments({ type: isDebitNote ? "debit-note" : "entry" });
      const prefix = isDebitNote ? "DN-2026-" : "BILL-2026-";
      newBillNo = `${prefix}${String(count + 1).padStart(4, "0")}`;
    }

    const payload = {
      ...body,
      billNo: newBillNo,
    };

    const entry = await PurchaseEntry.create(payload);

    // Update Supplier Balance
    // If it's a regular bill (entry), it INCREASES the amount we owe the supplier (outstanding balance)
    // If it's a debit-note, it DECREASES the amount we owe the supplier.
    if (body.supplierName) {
      const balanceImpact = body.type === "debit-note" ? -body.balance : body.balance;
      if (balanceImpact !== 0) {
        await Supplier.findOneAndUpdate(
          { name: body.supplierName },
          { $inc: { outstandingBalance: balanceImpact } }
        );
      }
    }

    // Update Inventory Stock
    if (body.items && Array.isArray(body.items)) {
      for (const item of body.items) {
        if (item.itemId) {
          const qtyImpact = body.type === "debit-note" ? -item.quantity : item.quantity;
          if (qtyImpact !== 0) {
            await Item.findByIdAndUpdate(item.itemId, { $inc: { currentStock: qtyImpact } });
          }
        }
      }
    }

    return NextResponse.json({ success: true, data: entry });
  } catch (error: any) {
    if (error.code === 11000) {
       return NextResponse.json({ success: false, error: "Bill number already exists" }, { status: 400 });
    }
    return NextResponse.json({ success: false, error: error.message }, { status: 400 });
  }
}

export async function PUT(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const billNo = searchParams.get("billNo");
    
    if (!billNo) {
      return NextResponse.json({ success: false, error: "billNo is required" }, { status: 400 });
    }

    const body = await req.json();
    await connectToDatabase();
    
    const updatedEntry = await PurchaseEntry.findOneAndUpdate({ billNo }, body, { new: true });
    
    if (!updatedEntry) {
      return NextResponse.json({ success: false, error: "Entry not found" }, { status: 404 });
    }

    return NextResponse.json({ success: true, data: updatedEntry });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const billNo = searchParams.get("billNo");
    
    if (!billNo) {
      return NextResponse.json({ success: false, error: "billNo is required" }, { status: 400 });
    }

    await connectToDatabase();
    
    const entry = await PurchaseEntry.findOne({ billNo });
    if (!entry) {
      return NextResponse.json({ success: false, error: "Entry not found" }, { status: 404 });
    }

    // Reverse the balance impact
    if (entry.supplierName && entry.balance !== 0) {
      const balanceImpact = entry.type === "debit-note" ? entry.balance : -entry.balance;
      await Supplier.findOneAndUpdate(
        { name: entry.supplierName },
        { $inc: { outstandingBalance: balanceImpact } }
      );
    }

    // Reverse Inventory Stock
    if (entry.items && Array.isArray(entry.items)) {
      for (const item of entry.items) {
        if (item.itemId) {
          const qtyImpact = entry.type === "debit-note" ? item.quantity : -item.quantity;
          if (qtyImpact !== 0) {
            await Item.findByIdAndUpdate(item.itemId, { $inc: { currentStock: qtyImpact } });
          }
        }
      }
    }

    await PurchaseEntry.findOneAndDelete({ billNo });

    return NextResponse.json({ success: true, message: "Entry deleted successfully" });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
