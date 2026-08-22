import { NextResponse } from "next/server";
import connectToDatabase from "@/lib/db";
import WalkInQuery from "@/models/WalkInQuery";
import Lead from "@/models/Lead";

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const date = searchParams.get("date");
    const status = searchParams.get("status");
    const mobile = searchParams.get("mobile");
    
    await connectToDatabase();
    
    const filter: any = {};
    if (date) filter.date = date;
    if (status) filter.status = status;
    if (mobile) filter.mobile = mobile;
    
    const queries = await WalkInQuery.find(filter).sort({ createdAt: -1 });
    return NextResponse.json({ success: true, data: queries });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    await connectToDatabase();
    
    if (!body.date) {
      body.date = new Date().toISOString().split("T")[0];
    }
    
    const leadCount = await Lead.countDocuments();
    const leadId = `LEAD-2026-${String(leadCount + 1).padStart(4, "0")}`;

    const query = await WalkInQuery.create({
      ...body,
      status: "Converted to Lead",
      leadId,
    });

    try {
      await Lead.create({
        leadId,
        customerName: body.customerName,
        mobile: (body.mobile || "").replace(/\D/g, ""),
        source: "Walk-in Store",
        walkInReason: body.reason || "Product Enquiry",
        interestedProduct: body.interestedProduct || "Showroom Product",
        assignedStaff: body.staff || "Amit Singh",
        estimatedValue: Number(body.budget) || 0,
        priority: "Medium",
        status: "New",
        followUpDate: body.followUpDate,
        notes: body.notes || `Walk-in enquiry for ${body.interestedProduct}`,
        timeline: [
          {
            date: new Date(),
            action: `Walk-in Visit (${body.reason || "Enquiry"})`,
            notes: `Customer visited showroom. Interested in ${body.interestedProduct}. Budget: ₹${body.budget || 0}`,
            staff: body.staff || "Sales Counter",
          },
        ],
      });
    } catch (leadErr) {
      console.error("Error auto-creating Lead from WalkIn:", leadErr);
    }

    return NextResponse.json({ success: true, data: query });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 400 });
  }
}

// Convert Walk-in to Lead or update status
export async function PUT(req: Request) {
  try {
    const body = await req.json();
    await connectToDatabase();
    
    const { id, action, ...updates } = body;
    if (!id) {
      return NextResponse.json({ success: false, error: "ID is required" }, { status: 400 });
    }
    
    if (action === "convert_to_lead") {
      const walkIn = await WalkInQuery.findById(id);
      if (!walkIn) {
        return NextResponse.json({ success: false, error: "Walk-in query not found" }, { status: 404 });
      }
      
      const leadCount = await Lead.countDocuments();
      const leadId = `LEAD-2026-${String(leadCount + 1).padStart(4, "0")}`;
      
      const newLead = await Lead.create({
        leadId,
        customerName: walkIn.customerName,
        mobile: walkIn.mobile,
        source: "Walk-in Store",
        walkInReason: walkIn.reason,
        interestedProduct: walkIn.interestedProduct,
        assignedStaff: walkIn.staff || "Amit Singh",
        estimatedValue: walkIn.budget || 0,
        priority: "High",
        status: "Interested",
        followUpDate: walkIn.followUpDate,
        notes: walkIn.notes,
        timeline: [
          {
            date: new Date(),
            action: "Converted from Walk-in Query",
            notes: `Walk-in reason: ${walkIn.reason}`,
            staff: walkIn.staff || "Amit Singh",
          },
        ],
      });
      
      walkIn.status = "Converted to Lead";
      walkIn.leadId = leadId;
      await walkIn.save();
      
      return NextResponse.json({
        success: true,
        message: "Successfully converted to Lead",
        data: { walkIn, lead: newLead },
      });
    }
    
    const updated = await WalkInQuery.findByIdAndUpdate(id, updates, { new: true });
    return NextResponse.json({ success: true, data: updated });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
