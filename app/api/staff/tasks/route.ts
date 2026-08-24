import { NextResponse } from "next/server";
import connectToDatabase from "@/lib/db";
import StaffTask from "@/models/StaffTask";

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const assignedStaff = searchParams.get("staff");
    const status = searchParams.get("status");
    const role = searchParams.get("role");
    
    await connectToDatabase();
    
    const filter: any = {};
    
    // If specific staff is requested or non-admin user
    if (assignedStaff && assignedStaff !== "all") {
      const firstName = assignedStaff.trim().split(" ")[0];
      filter.$or = [
        { assignedStaff: { $regex: new RegExp(assignedStaff, "i") } },
        { assignedStaff: { $regex: new RegExp(firstName, "i") } },
        { assignedStaff: "All Staff" },
        { assignedStaff: "Sales Staff" },
      ];
    }
    
    if (status && status !== "all") {
      filter.status = status;
    }
    
    const tasks = await StaffTask.find(filter).sort({ dueDate: 1, createdAt: -1 }).lean();
    return NextResponse.json({ success: true, data: tasks });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    await connectToDatabase();
    
    // Auto-populate assignedDate if not provided
    const payload = {
      ...body,
      assignedDate: body.assignedDate || (() => {
        try {
          return new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Kolkata" }).format(new Date());
        } catch (e) {
          return new Date().toISOString().split("T")[0];
        }
      })(),
      currentQty: Number(body.currentQty) || 0,
      currentAmount: Number(body.currentAmount) || 0,
    };

    const task = await StaffTask.create(payload);
    return NextResponse.json({ success: true, data: task });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 400 });
  }
}

export async function PUT(req: Request) {
  try {
    const body = await req.json();
    await connectToDatabase();
    
    const { id, _id, ...updates } = body;
    const targetId = id || _id;
    if (!targetId) {
      return NextResponse.json({ success: false, error: "Task ID is required" }, { status: 400 });
    }
    
    if (updates.status === "Completed") {
      if (!updates.completedAt) {
        updates.completedAt = new Date();
      }
    }
    
    const updated = await StaffTask.findByIdAndUpdate(targetId, { $set: updates }, { new: true }).lean();
    if (!updated) {
      return NextResponse.json({ success: false, error: "Task not found" }, { status: 404 });
    }
    
    return NextResponse.json({ success: true, data: updated });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");
    if (!id) {
      return NextResponse.json({ success: false, error: "Task ID is required" }, { status: 400 });
    }
    await connectToDatabase();
    await StaffTask.findByIdAndDelete(id);
    return NextResponse.json({ success: true, message: "Task deleted successfully" });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
