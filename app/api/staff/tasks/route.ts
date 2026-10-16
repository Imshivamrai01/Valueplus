import { NextResponse } from "next/server";
import connectToDatabase from "@/lib/db";
import StaffTask from "@/models/StaffTask";
import { notifyAssignee } from "@/lib/notify";
import { getActor } from "@/lib/requirePermission";

const inr = (n: number) => `₹${Math.round(n).toLocaleString("en-IN")}`;

/** "Sell 2 × Haier AC (₹50,000) by 25 Oct" — what a target asks for, in one line. */
function describeTask(t: any): { title: string; message: string; type: "target_assigned" | "task_assigned" } {
  const due = t.dueDate ? ` by ${t.dueDate}${t.dueTime ? " " + t.dueTime : ""}` : "";
  if (t.taskType === "sales_target") {
    const what = [
      Number(t.targetQty) > 0 ? `${t.targetQty} ×` : "",
      t.targetProduct || t.targetBrand || "",
    ].filter(Boolean).join(" ");
    const amount = Number(t.targetAmount) > 0 ? ` (${inr(Number(t.targetAmount))})` : "";
    return {
      type: "target_assigned",
      title: `🎯 New sales target: ${t.taskTitle}`,
      message: `${what ? "Sell " + what : "Target"}${amount}${due}.${t.description ? " " + t.description : ""}`,
    };
  }
  return {
    type: "task_assigned",
    title: `📋 New task: ${t.taskTitle}`,
    message: `${t.priority ? t.priority + " priority" : "Task"}${due}.${t.description ? " " + t.description : ""}`,
  };
}

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

    // The person (or group) it is given to sees it in their bell straight away.
    const actor = await getActor().catch(() => null);
    const note = describeTask(task);
    await notifyAssignee(task.assignedStaff, task.assignedStaffId, {
      ...note,
      link: "/staff/tasks",
      createdBy: actor?.name || String(body.createdBy || ""),
    });

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
    
    const before: any = await StaffTask.findById(targetId).lean();
    const updated: any = await StaffTask.findByIdAndUpdate(targetId, { $set: updates }, { new: true }).lean();
    if (!updated) {
      return NextResponse.json({ success: false, error: "Task not found" }, { status: 404 });
    }

    // Given to someone new → they get it as a new task. Its target or deadline
    // changed → the same person is told. A plain status update by the staff
    // themselves (In Progress / Completed) sends nothing.
    const actor = await getActor().catch(() => null);
    const reassigned = before && String(before.assignedStaff || "") !== String(updated.assignedStaff || "");
    const changed =
      before &&
      ["taskTitle", "dueDate", "dueTime", "targetQty", "targetAmount", "targetProduct", "targetBrand", "priority", "description"].some(
        (k) => String(before[k] ?? "") !== String(updated[k] ?? "")
      );
    if (reassigned) {
      await notifyAssignee(updated.assignedStaff, updated.assignedStaffId, {
        ...describeTask(updated),
        link: "/staff/tasks",
        createdBy: actor?.name || "",
      });
    } else if (changed) {
      const d = describeTask(updated);
      await notifyAssignee(updated.assignedStaff, updated.assignedStaffId, {
        type: "task_updated",
        title: `✏️ Updated: ${updated.taskTitle}`,
        message: d.message,
        link: "/staff/tasks",
        createdBy: actor?.name || "",
      });
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
