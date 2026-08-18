import { NextResponse } from "next/server";
import connectToDatabase from "@/lib/db";
import PurchaseOrder from "@/models/PurchaseOrder";
import Supplier from "@/models/Supplier";

export async function GET() {
  try {
    await connectToDatabase();
    const pos = await PurchaseOrder.find({}).sort({ createdAt: -1 });
    return NextResponse.json({ success: true, data: pos });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  let body: any = {};
  try {
    body = await req.json();
    await connectToDatabase();

    // 1. Auto-create Supplier in Master if doesn't exist
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
            outstandingBalance: 0,
            status: "active",
          });
        }
      } catch (supErr) {
        console.warn("Supplier auto-create note:", supErr);
      }
    }

    let targetPoNo = body.poNo?.trim();
    if (!targetPoNo) {
      const count = await PurchaseOrder.countDocuments();
      targetPoNo = `PO-${new Date().getFullYear()}-${String(count + 1).padStart(4, "0")}`;
    }

    // Check if poNo already exists in DB
    let existing = await PurchaseOrder.findOne({ poNo: targetPoNo });
    if (existing) {
      // Auto-increment to next available number
      const count = await PurchaseOrder.countDocuments();
      const randomSuffix = Math.floor(1000 + Math.random() * 9000);
      targetPoNo = `PO-${new Date().getFullYear()}-${String(count + 1).padStart(4, "0")}-${randomSuffix}`;
    }

    const payload = {
      ...body,
      poNo: targetPoNo,
    };

    const po = await PurchaseOrder.create(payload);
    return NextResponse.json({ success: true, data: po });
  } catch (error: any) {
    if (error.code === 11000) {
      // Fallback in case of race condition
      try {
        const randomSuffix = Math.floor(1000 + Math.random() * 9000);
        const fallbackPoNo = `PO-${new Date().getFullYear()}-${Date.now().toString().slice(-4)}-${randomSuffix}`;
        const fallbackPayload = { ...body, poNo: fallbackPoNo };
        const po = await PurchaseOrder.create(fallbackPayload);
        return NextResponse.json({ success: true, data: po });
      } catch (retryErr: any) {
        return NextResponse.json({ success: false, error: "Failed to allocate unique PO number. Please try again." }, { status: 400 });
      }
    }
    return NextResponse.json({ success: false, error: error.message }, { status: 400 });
  }
}

export async function PUT(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const poNo = searchParams.get("poNo");
    
    if (!poNo) {
      return NextResponse.json({ success: false, error: "poNo is required" }, { status: 400 });
    }

    const body = await req.json();
    await connectToDatabase();
    
    const updatedPO = await PurchaseOrder.findOneAndUpdate({ poNo }, body, { new: true });
    
    if (!updatedPO) {
      return NextResponse.json({ success: false, error: "Purchase Order not found" }, { status: 404 });
    }

    return NextResponse.json({ success: true, data: updatedPO });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const poNo = searchParams.get("poNo");
    
    if (!poNo) {
      return NextResponse.json({ success: false, error: "poNo is required" }, { status: 400 });
    }

    await connectToDatabase();
    const deletedPO = await PurchaseOrder.findOneAndDelete({ poNo });
    
    if (!deletedPO) {
      return NextResponse.json({ success: false, error: "Purchase Order not found" }, { status: 404 });
    }

    return NextResponse.json({ success: true, data: {} });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
