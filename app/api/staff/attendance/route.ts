import { NextResponse } from "next/server";
import connectToDatabase from "@/lib/db";
import Attendance from "@/models/Attendance";

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const date = searchParams.get("date") || new Date().toISOString().split("T")[0];
    const staffName = searchParams.get("staff");
    
    await connectToDatabase();
    
    const filter: any = {};
    if (date && date !== "all") filter.date = date;
    if (staffName) filter.staffName = staffName;
    
    const records = await Attendance.find(filter).sort({ createdAt: -1 });
    return NextResponse.json({ success: true, data: records });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

// Check-in / Check-out handler
export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { staffName, action, notes } = body;
    
    if (!staffName) {
      return NextResponse.json({ success: false, error: "Staff name is required" }, { status: 400 });
    }
    
    await connectToDatabase();
    const today = new Date().toISOString().split("T")[0];
    const currentTime = new Date().toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit", hour12: true });
    
    let record = await Attendance.findOne({ staffName, date: today });
    
    if (action === "check_in") {
      if (record) {
        return NextResponse.json({ success: false, error: "Staff is already checked in for today" }, { status: 400 });
      }
      
      record = await Attendance.create({
        staffName,
        date: today,
        checkInTime: currentTime,
        status: "Present",
        notes: notes || "Checked in on time",
      });
      
      return NextResponse.json({ success: true, data: record, message: `${staffName} Checked In at ${currentTime}` });
    } else if (action === "check_out") {
      if (!record) {
        return NextResponse.json({ success: false, error: "No active check-in record found for today" }, { status: 400 });
      }
      if (record.checkOutTime) {
        return NextResponse.json({ success: false, error: "Staff has already checked out for today" }, { status: 400 });
      }
      
      record.checkOutTime = currentTime;
      // Calculate working duration roughly in minutes
      try {
        const inParts = record.checkInTime.match(/(\d+):(\d+)\s*(AM|PM)?/i);
        const outParts = currentTime.match(/(\d+):(\d+)\s*(AM|PM)?/i);
        if (inParts && outParts) {
          let inH = parseInt(inParts[1]);
          if (inParts[3]?.toUpperCase() === "PM" && inH < 12) inH += 12;
          if (inParts[3]?.toUpperCase() === "AM" && inH === 12) inH = 0;
          const inMin = inH * 60 + parseInt(inParts[2]);

          let outH = parseInt(outParts[1]);
          if (outParts[3]?.toUpperCase() === "PM" && outH < 12) outH += 12;
          if (outParts[3]?.toUpperCase() === "AM" && outH === 12) outH = 0;
          const outMin = outH * 60 + parseInt(outParts[2]);

          record.workingDurationMinutes = Math.max(0, outMin - inMin);
        }
      } catch (e) {
        record.workingDurationMinutes = 480; // default 8 hours
      }
      
      await record.save();
      return NextResponse.json({ success: true, data: record, message: `${staffName} Checked Out at ${currentTime}` });
    }
    
    return NextResponse.json({ success: false, error: "Invalid action. Use 'check_in' or 'check_out'" }, { status: 400 });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
