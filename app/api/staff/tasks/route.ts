import { NextResponse } from "next/server";
import connectToDatabase from "@/lib/db";
import StaffTask from "@/models/StaffTask";

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const assignedStaff = searchParams.get("staff");
    const status = searchParams.get("status");
    
    await connectToDatabase();
    
    const filter: any = {};
    if (assignedStaff) filter.assignedStaff = assignedStaff;
    if (status && status !== "all") filter.status = status;
    
    const tasks = await StaffTask.find(filter).sort({ dueDate: 1, createdAt: -1 });
    return NextResponse.json({ success: true, data: tasks });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    await connectToDatabase();
    
    const task = await StaffTask.create(body);
    return NextResponse.json({ success: true, data: task });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 400 });
  }
}

export async function PUT(req: Request) {
  try {
    const body = await req.json();
    await connectToDatabase();
    
    const { id, ...updates } = body;
    if (!id) {
      return NextResponse.json({ success: false, error: "Task ID is required" }, { status: 400 });
    }
    
    if (updates.status === "Completed") {
      updates.completedAt = new Date();
    }
    
    const updated = await StaffTask.findByIdAndUpdate(id, updates, { new: true });
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
