import { NextResponse } from "next/server";
import connectToDatabase from "@/lib/db";
import Lead from "@/models/Lead";
import { notifyWhatsApp } from "@/lib/whatsapp/notify";
import { getActor } from "@/lib/requirePermission";

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const status = searchParams.get("status");
    const staff = searchParams.get("staff");
    const priority = searchParams.get("priority");
    const mobile = searchParams.get("mobile");
    
    await connectToDatabase();
    
    const filter: any = {};
    if (status && status !== "all") filter.status = status;
    if (staff) filter.assignedStaff = staff;
    if (priority) filter.priority = priority;
    if (mobile) filter.mobile = mobile;
    
    const leads = await Lead.find(filter).sort({ createdAt: -1 });
    return NextResponse.json({ success: true, data: leads });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    await connectToDatabase();
    
    if (!body.leadId) {
      const count = await Lead.countDocuments();
      body.leadId = `LEAD-2026-${String(count + 1).padStart(4, "0")}`;
    }
    
    if (!body.timeline) {
      body.timeline = [
        {
          date: new Date(),
          action: "Lead Created",
          notes: body.notes || "New sales enquiry registered",
          staff: body.assignedStaff || "Sales Team",
        },
      ];
    }
    
    const lead = await Lead.create(body);

    const actor = await getActor();
    await notifyWhatsApp({
      event: "lead.created",
      entity: lead.toObject(),
      actor: actor?.name || body.assignedStaff || "Sales Team",
    });

    return NextResponse.json({ success: true, data: lead });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 400 });
  }
}

export async function PUT(req: Request) {
  try {
    const body = await req.json();
    await connectToDatabase();
    
    const { id, leadId, actionNote, ...updates } = body;
    const identifier = id ? { _id: id } : { leadId };
    
    const updateObj: any = { ...updates };
    if (actionNote) {
      updateObj.$push = {
        timeline: {
          date: new Date(),
          action: updates.status ? `Status changed to ${updates.status}` : "Lead Note Added",
          notes: actionNote,
          staff: updates.assignedStaff || "Staff",
        },
      };
    }
    
    // The old status has to be read before the update, or the "changed from"
    // half of the message would just repeat the new value.
    const before: any = await Lead.findOne(identifier).lean();

    const updated = await Lead.findOneAndUpdate(identifier, updateObj, { new: true });
    if (!updated) {
      return NextResponse.json({ success: false, error: "Lead not found" }, { status: 404 });
    }

    if (updates.status && before?.status && updates.status !== before.status) {
      const actor = await getActor();
      await notifyWhatsApp({
        event: "lead.status",
        entity: updated.toObject(),
        previousStatus: before.status,
        actor: actor?.name || updates.assignedStaff || "Staff",
      });
    }

    return NextResponse.json({ success: true, data: updated });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
