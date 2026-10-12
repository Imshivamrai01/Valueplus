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
    // Matched on the last 10 digits so "+91 98765 43210" and "9876543210" are the
    // same customer — the billing form looks a lead up by the typed mobile number.
    if (mobile) {
      const digits = mobile.replace(/\D/g, "").slice(-10);
      filter.mobile = digits.length === 10 ? { $regex: `${digits}$` } : mobile;
    }
    
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
    
    const { id, leadId, actionNote, followUp, ...updates } = body;
    const identifier = id ? { _id: id } : { leadId };
    
    // Logging a follow-up: records when the customer was contacted and when the
    // next contact is due, and keeps the history of every one.
    if (followUp) {
      const date = String(followUp.date || "").slice(0, 10);
      const nextDate = String(followUp.nextDate || "").slice(0, 10);
      if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
        return NextResponse.json({ success: false, error: "The follow-up date is required." }, { status: 400 });
      }
      if (nextDate && nextDate < date) {
        return NextResponse.json(
          { success: false, error: "The next follow-up date cannot be before the follow-up date." },
          { status: 400 }
        );
      }
      const actor = await getActor();
      const staff = String(followUp.staff || actor?.name || "Staff");
      const notes = String(followUp.notes || "").trim();

      const lead: any = await Lead.findOne(identifier);
      if (!lead) {
        return NextResponse.json({ success: false, error: "Lead not found" }, { status: 404 });
      }
      lead.lastFollowUpDate = date;
      lead.followUpDate = nextDate;
      lead.followUps.push({ date, nextDate, notes, staff, loggedAt: new Date() });
      lead.timeline.push({
        date: new Date(),
        action: nextDate ? `Follow-up done on ${date}, next on ${nextDate}` : `Follow-up done on ${date}`,
        notes,
        staff,
      });
      // A lead that has been spoken to and has another call due is in follow-up;
      // one already won or lost keeps its outcome.
      if (nextDate && !["Converted", "Lost"].includes(lead.status)) lead.status = "Follow-up";
      await lead.save();
      return NextResponse.json({ success: true, data: lead });
    }

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
