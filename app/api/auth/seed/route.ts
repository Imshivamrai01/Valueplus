import { NextResponse } from "next/server";
import connectToDatabase from "@/lib/db";
import User from "@/models/User";
import bcrypt from "bcryptjs";

export async function GET() {
  try {
    await connectToDatabase();
    
    // Check if any users exist
    const count = await User.countDocuments();
    if (count > 0) {
      return NextResponse.json({ success: false, message: "Users already seeded." });
    }

    const hashedPassword = await bcrypt.hash("admin123", 10);
    
    const adminUser = await User.create({
      name: "Admin User",
      email: "admin@valueplus.com",
      password: hashedPassword,
      role: "admin",
      status: "active",
    });

    return NextResponse.json({ success: true, message: "Admin user seeded!", data: { email: adminUser.email, role: adminUser.role } });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
