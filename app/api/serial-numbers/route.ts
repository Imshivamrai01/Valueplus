import { NextResponse } from "next/server";
import connectToDatabase from "@/lib/db";
import SerialNumber from "@/models/SerialNumber";
import PurchaseEntry from "@/models/PurchaseEntry";
import Invoice from "@/models/Invoice";
import Item from "@/models/Item";

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const vpCode = searchParams.get("vpCode");
    const itemId = searchParams.get("itemId");
    const itemName = searchParams.get("name");
    const status = searchParams.get("status") || "AVAILABLE";
    
    await connectToDatabase();
    
    // 1. Reconcile / Sync serial numbers from existing Purchase Entries into SerialNumber collection
    const purchaseEntries = await PurchaseEntry.find({}).lean();
    const items = await Item.find({}).lean();
    const itemMap = new Map();
    items.forEach((it: any) => {
      itemMap.set(it._id.toString(), it);
      if (it.code) itemMap.set(it.code.toLowerCase(), it);
      if (it.name) itemMap.set(it.name.toLowerCase().trim(), it);
    });

    for (const pe of purchaseEntries) {
      if (Array.isArray(pe.items)) {
        for (const line of pe.items) {
          if (Array.isArray(line.serialNumbers) && line.serialNumbers.length > 0) {
            const matchedItem = (line.itemId && itemMap.get(line.itemId.toString())) ||
                                (line.name && itemMap.get(line.name.toLowerCase().trim())) ||
                                null;
            const itId = matchedItem?._id ? matchedItem._id.toString() : (line.itemId || "");
            const vp = matchedItem?.vpCode || matchedItem?.code || "VP-GEN";
            const itName = matchedItem?.name || line.name || "";

            for (const sn of line.serialNumbers) {
              const cleanSn = String(sn || "").trim();
              if (cleanSn) {
                await SerialNumber.findOneAndUpdate(
                  { serialNumber: cleanSn },
                  {
                    $setOnInsert: {
                      serialNumber: cleanSn,
                      itemId: itId,
                      vpCode: vp,
                      itemName: itName,
                      status: pe.type === "debit-note" ? "RETURNED" : "AVAILABLE",
                      purchaseEntryId: pe._id.toString(),
                      price: line.rate || 0,
                      warehouse: matchedItem?.warehouse || "Main Store - Gorakhpur",
                      history: [{
                        action: `Inward via Bill #${pe.billNo}`,
                        date: new Date(pe.billDate || pe.createdAt || Date.now()),
                        performedBy: "Purchase Inward",
                        details: `Supplier: ${pe.supplierName}`,
                      }]
                    }
                  },
                  { upsert: true, new: true }
                );
              }
            }
          }
        }
      }
    }

    // 2. Mark any serial numbers that have already been billed in active Invoices as SOLD
    const activeInvoices = await Invoice.find({ status: { $ne: "cancelled" } }).lean();
    const soldSerialsSet = new Set<string>();
    for (const inv of activeInvoices) {
      if (Array.isArray(inv.items)) {
        for (const line of inv.items) {
          if (line.serialNumber && String(line.serialNumber).trim()) {
            const sn = String(line.serialNumber).trim();
            soldSerialsSet.add(sn);
            await SerialNumber.findOneAndUpdate(
              { serialNumber: sn },
              {
                $set: {
                  status: "SOLD",
                  invoiceId: inv._id.toString(),
                  invoiceNumber: inv.invoiceNumber,
                  customerName: inv.customerName,
                  customerPhone: inv.customerPhone || "",
                  soldDate: inv.date,
                }
              }
            );
          }
        }
      }
    }

    // 3. Build Query Filter
    const filter: any = {};
    if (status && status !== "ALL") {
      filter.status = status;
    }
    if (vpCode) filter.vpCode = vpCode;
    if (itemId) filter.itemId = itemId;
    if (itemName) {
      filter.itemName = { $regex: new RegExp(itemName.trim(), "i") };
    }
    
    const serials = await SerialNumber.find(filter).sort({ createdAt: -1 }).lean();

    // Final safety filter: ensure sold serials never leak into AVAILABLE response
    const result = status === "AVAILABLE" 
      ? serials.filter(s => !soldSerialsSet.has(s.serialNumber) && s.status === "AVAILABLE")
      : serials;

    return NextResponse.json({ success: true, data: result });
  } catch (error: any) {
    console.error("Error fetching serial numbers:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    await connectToDatabase();
    
    if (Array.isArray(body)) {
      const created = await SerialNumber.insertMany(body);
      return NextResponse.json({ success: true, data: created, message: `${created.length} serials registered` });
    }
    
    const serial = await SerialNumber.create(body);
    return NextResponse.json({ success: true, data: serial });
  } catch (error: any) {
    if (error.code === 11000) {
      return NextResponse.json({ success: false, error: "Serial number already exists in the system" }, { status: 400 });
    }
    return NextResponse.json({ success: false, error: error.message }, { status: 400 });
  }
}

export async function PUT(req: Request) {
  try {
    const body = await req.json();
    await connectToDatabase();
    
    const { serialNumber, status, invoiceNumber, customerName, customerPhone, notes } = body;
    if (!serialNumber) {
      return NextResponse.json({ success: false, error: "Serial number is required" }, { status: 400 });
    }
    
    const updateData: any = {};
    if (status) updateData.status = status;
    if (invoiceNumber) updateData.invoiceNumber = invoiceNumber;
    if (customerName) updateData.customerName = customerName;
    if (customerPhone) updateData.customerPhone = customerPhone;
    if (status === "SOLD") updateData.soldDate = new Date().toISOString().split("T")[0];
    
    updateData.$push = {
      history: {
        action: status ? `Status changed to ${status}` : "Updated details",
        date: new Date(),
        performedBy: body.performedBy || "Staff",
        details: notes || `Updated via system`,
      },
    };
    
    const updated = await SerialNumber.findOneAndUpdate({ serialNumber }, updateData, { new: true });
    if (!updated) {
      return NextResponse.json({ success: false, error: "Serial number not found" }, { status: 404 });
    }
    
    return NextResponse.json({ success: true, data: updated });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
