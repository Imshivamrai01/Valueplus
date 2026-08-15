import { NextResponse } from "next/server";
import mongoose from "mongoose";
import connectToDatabase from "@/lib/db";
import PurchaseEntry from "@/models/PurchaseEntry";
import Supplier from "@/models/Supplier";
import Item from "@/models/Item";
import PurchaseOrder from "@/models/PurchaseOrder";
import StockRequest from "@/models/StockRequest";

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

    // Update Supplier Balance and Auto-create if missing
    if (body.supplierName) {
      try {
        const supName = body.supplierName.trim();
        const supPhone = body.supplierPhone?.trim() || "";
        let existingSupplier = null;
        if (supPhone) {
          existingSupplier = await Supplier.findOne({ phone: supPhone });
        }
        if (!existingSupplier) {
          existingSupplier = await Supplier.findOne({ name: { $regex: new RegExp(`^${supName}$`, "i") } });
        }

        const balanceImpact = body.type === "debit-note" ? -(Number(body.balance) || 0) : (Number(body.balance) || 0);

        if (!existingSupplier) {
          const count = await Supplier.countDocuments();
          const suppCode = `SUPP-${String(count + 1).padStart(3, "0")}`;
          await Supplier.create({
            code: suppCode,
            name: supName,
            phone: supPhone || "0000000000",
            email: body.supplierEmail || "",
            gstNumber: body.supplierGstin || "",
            address: {
              line1: "Commercial Trade Hub / Store Outlet",
              city: "Mumbai",
              state: "Maharashtra",
              pincode: "400001",
              country: "India",
            },
            creditLimit: 100000,
            creditDays: 45,
            outstandingBalance: balanceImpact,
            status: "active",
          });
        } else if (balanceImpact !== 0) {
          await Supplier.findByIdAndUpdate(
            existingSupplier._id,
            { $inc: { outstandingBalance: balanceImpact } }
          );
        }
      } catch (supErr) {
        console.warn("Supplier reconciliation note:", supErr);
      }
    }

    // Update Inventory Stock and Auto-Create Item if missing
    if (body.items && Array.isArray(body.items)) {
      for (const item of body.items) {
        const qtyImpact = body.type === "debit-note" ? -(Number(item.quantity) || 0) : (Number(item.quantity) || 0);
        const rate = Number(item.rate) || 0;
        const gstRate = Number(item.gstRate) || 18;

        try {
          // Robust matching: 1. By MongoDB _id, 2. By Item Code, 3. By Item Name
          let existingItem = null;
          if (item.itemId && mongoose.isValidObjectId(item.itemId)) {
            existingItem = await Item.findById(item.itemId);
          }
          if (!existingItem && item.itemCode) {
            existingItem = await Item.findOne({ code: item.itemCode });
          }
          if (!existingItem && item.name) {
            existingItem = await Item.findOne({ name: { $regex: new RegExp(`^${item.name.trim()}$`, "i") } });
          }

          if (existingItem) {
            // Update existing product stock & purchase rate
            await Item.findByIdAndUpdate(existingItem._id, {
              $inc: { currentStock: qtyImpact },
              $set: { purchasePrice: rate > 0 ? rate : existingItem.purchasePrice }
            });
          } else if (item.name && qtyImpact > 0) {
            // Auto-create new Item in Master
            const count = await Item.countDocuments();
            const itemCode = `ITEM-${String(count + 1).padStart(4, "0")}`;
            const sellPrice = rate > 0 ? Math.round(rate * 1.25) : 1000;
            const mrpVal = rate > 0 ? Math.round(rate * 1.30) : 1200;

            await Item.create({
              code: itemCode,
              name: item.name.trim(),
              category: "Electronics",
              brand: "ValuePlus",
              unit: "PCS",
              hsnCode: "8471",
              gstRate: gstRate,
              purchasePrice: rate,
              sellingPrice: sellPrice,
              mrp: mrpVal,
              openingStock: 0,
              currentStock: qtyImpact,
              reorderLevel: 5,
              status: "active"
            });
          }

          // Auto-update any Stock Requests for this item from "Pending" / "Sent" to "Fulfilled"
          if (item.name) {
            await StockRequest.updateMany(
              {
                "items.itemName": { $regex: new RegExp(`^${item.name.trim()}$`, "i") },
                status: { $in: ["Pending", "Approved", "Sent"] }
              },
              { $set: { status: "Fulfilled" } }
            );
          }
        } catch (itemErr) {
          console.warn("Item stock / creation sync note:", itemErr);
        }
      }
    }

    // Update Linked Purchase Order Status
    if (body.linkedPoNo) {
      await PurchaseOrder.findOneAndUpdate(
        { poNo: body.linkedPoNo },
        { status: "received" }
      );
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
