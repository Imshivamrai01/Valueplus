import { NextResponse } from "next/server";
import connectToDatabase from "@/lib/db";
import Estimate from "@/models/Estimate";
import Lead from "@/models/Lead";

export async function GET(req: Request) {
  try {
    await connectToDatabase();
    const { searchParams } = new URL(req.url);
    const phone = searchParams.get("phone") || searchParams.get("customerPhone");
    const status = searchParams.get("status");

    const query: any = {};
    if (phone) {
      const clean = phone.replace(/\D/g, "");
      query.customerPhone = { $regex: clean, $options: "i" };
    }
    if (status) {
      query.status = status;
    }

    const estimates = await Estimate.find(query).sort({ createdAt: -1 });
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

    // Auto-create / sync corresponding CRM Lead
    try {
      const cleanPhone = (estimate.customerPhone || "").replace(/\D/g, "");
      const itemsList = Array.isArray(estimate.items) ? estimate.items : [];
      const primaryProduct = itemsList.length > 0 
        ? itemsList.map((it: any) => it.name || it.itemName).join(", ") 
        : "Showroom Products";

      const leadCount = await Lead.countDocuments();
      const leadId = `LEAD-2026-${String(leadCount + 1).padStart(4, "0")}`;

      await Lead.create({
        leadId,
        customerName: estimate.customerName,
        mobile: cleanPhone || "9999999999",
        source: "Estimate Quotation",
        interestedProduct: primaryProduct,
        vpCode: itemsList[0]?.itemCode || "",
        assignedStaff: estimate.salesExecutive || estimate.salesperson || "Amit Singh",
        estimatedValue: Number(estimate.total) || 0,
        priority: "High",
        status: "Interested",
        estimateNumber: estimate.estimateNumber,
        estimateId: String(estimate._id),
        items: itemsList,
        notes: `Official Estimate generated: ${estimate.estimateNumber} for ₹${estimate.total}. Valid until ${estimate.expiryDate ? new Date(estimate.expiryDate).toLocaleDateString("en-IN") : "15 days"}.`,
        timeline: [
          {
            date: new Date(),
            action: `Estimate Created (${estimate.estimateNumber})`,
            notes: `Total quotation value: ₹${estimate.total}`,
            staff: estimate.salesExecutive || estimate.salesperson || "Sales Counter",
          },
        ],
      });
    } catch (leadErr) {
      console.error("Error auto-creating Lead from Estimate:", leadErr);
    }

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
