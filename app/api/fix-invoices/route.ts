import { NextResponse } from "next/server";
import connectToDatabase from "@/lib/db";
import Invoice from "@/models/Invoice";
import Customer from "@/models/Customer";

export async function GET() {
  try {
    await connectToDatabase();
    const invoices = await Invoice.find();
    let updated = 0;

    for (const inv of invoices) {
      if (inv.customerId) {
        const cust = await Customer.findById(inv.customerId);
        if (cust) {
          const updates: any = {};
          if (!inv.customerPhone) updates.customerPhone = cust.phone || "";
          if (!inv.customerEmail) updates.customerEmail = cust.email || "";
          if (!inv.customerAddress) updates.customerAddress = cust.billingAddress?.line1 || cust.address || "";
          if (!inv.customerCity) updates.customerCity = cust.billingAddress?.city || cust.city || "";
          if (!inv.customerPin) updates.customerPin = cust.billingAddress?.pincode || cust.pin || "";
          if (!inv.placeOfSupply) updates.placeOfSupply = cust.billingAddress?.state || cust.state || "Uttar Pradesh (09)";

          if (Object.keys(updates).length > 0) {
            await Invoice.findByIdAndUpdate(inv._id, { $set: updates });
            updated++;
          }
        }
      }
    }

    return NextResponse.json({ success: true, message: `Fixed ${updated} invoices with missing customer data.` });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
