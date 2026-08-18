import { NextResponse } from "next/server";
import connectToDatabase from "@/lib/db";
import PaymentTransaction from "@/models/PaymentTransaction";

export async function GET(request: Request) {
  try {
    await connectToDatabase();
    
    const { searchParams } = new URL(request.url);
    const partyId = searchParams.get("partyId");
    
    const filter = partyId ? { partyId } : {};
    let payments: any[] = await PaymentTransaction.find(filter).sort({ date: -1 }).lean();
    
    // Fetch old invoices that have paidAmount > 0 and include them as transactions if not already there
    const Invoice = (await import("@/models/Invoice")).default;
    const invoiceFilter = partyId ? { customerId: partyId, paidAmount: { $gt: 0 } } : { paidAmount: { $gt: 0 } };
    const paidInvoices = await Invoice.find(invoiceFilter).lean();

    const existingRefs = new Set(payments.map((p: any) => p.referenceId));

    const virtualPayments = paidInvoices
      .filter((inv: any) => !existingRefs.has(inv.invoiceNumber))
      .map((inv: any) => ({
        _id: inv._id,
        transactionId: `TXN-LEGACY-${inv.invoiceNumber}`,
        partyId: inv.customerId,
        partyType: "Customer",
        partyName: inv.customerName,
        amount: inv.paidAmount,
        paymentMode: inv.paymentMode || "Cash",
        date: inv.date,
        referenceId: inv.invoiceNumber,
        notes: `Legacy initial payment for ${inv.type === 'sales-order' ? 'order' : 'invoice'} ${inv.invoiceNumber}`,
        type: "received",
        createdAt: inv.createdAt,
      }));

    if (virtualPayments.length > 0) {
      payments = [...payments, ...virtualPayments].sort((a: any, b: any) => new Date(b.date).getTime() - new Date(a.date).getTime());
    }
    
    return NextResponse.json({ success: true, data: payments });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    await connectToDatabase();
    const data = await request.json();
    
    // Find the customer/supplier to update balance
    if (data.partyType === "Customer") {
      const Customer = (await import("@/models/Customer")).default;
      const customer = await Customer.findById(data.partyId);
      
      if (!customer) {
        return NextResponse.json({ success: false, error: "Customer not found" }, { status: 404 });
      }
      
      const multiplier = data.type === "paid" ? 1 : -1;
      // Decrease outstanding balance if received, increase if paid (refund)
      await Customer.findByIdAndUpdate(data.partyId, {
        $inc: { outstandingBalance: multiplier * Number(data.amount) }
      });
    } else if (data.partyType === "Supplier") {
      const Supplier = (await import("@/models/Supplier")).default;
      const supplier = await Supplier.findById(data.partyId);
      
      if (!supplier) {
        return NextResponse.json({ success: false, error: "Supplier not found" }, { status: 404 });
      }
      
      // If we pay supplier, our outstanding to them decreases (-1)
      // If we receive refund from supplier, our outstanding to them increases (1)
      const multiplier = data.type === "paid" ? -1 : 1;
      await Supplier.findByIdAndUpdate(data.partyId, {
        $inc: { outstandingBalance: multiplier * Number(data.amount) }
      });
    }
    
    const payment = await PaymentTransaction.create(data);
    return NextResponse.json({ success: true, data: payment });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");
    
    if (!id) {
      return NextResponse.json({ success: false, error: "Payment ID is required" }, { status: 400 });
    }

    await connectToDatabase();
    
    const payment = await PaymentTransaction.findById(id);
    if (!payment) {
      return NextResponse.json({ success: false, error: "Payment not found" }, { status: 404 });
    }

    // Reverse the balance update for Customer or Supplier
    if (payment.partyType === "Customer") {
      const Customer = (await import("@/models/Customer")).default;
      const multiplier = payment.type === "paid" ? -1 : 1;
      await Customer.findByIdAndUpdate(payment.partyId, {
        $inc: { outstandingBalance: multiplier * Number(payment.amount) } // add it back or subtract it
      });
    } else if (payment.partyType === "Supplier") {
      const Supplier = (await import("@/models/Supplier")).default;
      // Reverse of POST: if we paid supplier, removing payment INCREASES our outstanding (1)
      // if we received refund, removing payment DECREASES our outstanding (-1)
      const multiplier = payment.type === "paid" ? 1 : -1;
      await Supplier.findByIdAndUpdate(payment.partyId, {
        $inc: { outstandingBalance: multiplier * Number(payment.amount) }
      });
    }

    await PaymentTransaction.findByIdAndDelete(id);

    return NextResponse.json({ success: true, message: "Payment deleted successfully" });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
