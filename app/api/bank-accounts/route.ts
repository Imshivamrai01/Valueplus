import { NextResponse } from "next/server";
import connectToDatabase from "@/lib/db";
import BankAccount from "@/models/BankAccount";

export async function GET() {
  try {
    await connectToDatabase();
    const accounts = await BankAccount.find({}).sort({ createdAt: -1 });
    return NextResponse.json({ success: true, data: accounts });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
