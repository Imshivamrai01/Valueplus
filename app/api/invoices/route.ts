import { NextResponse } from "next/server";
import connectToDatabase from "@/lib/db";
import Invoice from "@/models/Invoice";
import Customer from "@/models/Customer";
import Item from "@/models/Item";
import Estimate from "@/models/Estimate";

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const type = searchParams.get("type");
    
    await connectToDatabase();
    
    const query = type ? { type } : { type: { $ne: "sales-order" } };
    
    const invoices = await Invoice.find(query).sort({ createdAt: -1 });
    return NextResponse.json({ success: true, data: invoices });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    await connectToDatabase();
    
    // 1. Customer Auto-Add Logic
    if (body.customerId === "new" || !body.customerId) {
      const count = await Customer.countDocuments();
      const nextNum = count + 1;
      const custCode = `CUST-${String(nextNum).padStart(3, "0")}`;
      
      const newCustomer = await Customer.create({
        code: custCode,
        name: body.customerName,
        phone: body.customerPhone || "0000000000",
        email: body.customerEmail || "",
        gstNumber: body.customerGST || "",
        billingAddress: {
          line1: body.customerAddress || "Address not provided",
          city: body.customerCity || "City Not Specified",
          state: body.placeOfSupply ? body.placeOfSupply.replace(/ —.*$/, '').replace(/ \(\d+\)/, '').trim() : "Unknown",
          pincode: body.customerPin || "",
          country: "India"
        }
      });
      body.customerId = newCustomer._id.toString();
    }
    
    // 2. Create Invoice
    const invoice = await Invoice.create(body);
    
    // 2.5 Create Payment Transaction if paidAmount > 0
    if (body.paidAmount > 0) {
      const PaymentTransaction = (await import("@/models/PaymentTransaction")).default;
      await PaymentTransaction.create({
        transactionId: `TXN-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
        partyId: invoice.customerId,
        partyType: "Customer",
        partyName: invoice.customerName,
        amount: body.paidAmount,
        paymentMode: body.paymentMode || "Cash",
        date: body.date || new Date().toISOString().split("T")[0],
        referenceId: invoice.invoiceNumber,
        notes: `Initial payment for ${invoice.type === 'sales-order' ? 'order' : 'invoice'} ${invoice.invoiceNumber}`,
        type: "received"
      });
    }
    
    // 3. Update Customer Balance and Master Data
    const updateData: any = {};
    if (body.balanceAmount > 0) {
      updateData.$inc = { 
        outstandingBalance: body.type === "credit-note" ? -body.balanceAmount : body.balanceAmount 
      };
    }
    
    if (body.customerId && body.customerId !== "new" && body.customerPin) {
      if (!updateData.$set) updateData.$set = {};
      updateData.$set["billingAddress.pincode"] = body.customerPin;
    }

    if (Object.keys(updateData).length > 0) {
      await Customer.findByIdAndUpdate(body.customerId, updateData);
    }

    // 4. Inventory Stock Deduction
    if (body.type !== "proforma") {
      if (body.items && body.items.length > 0) {
        for (const item of body.items) {
          if (item.itemId && item.itemId.length === 24) {
            await Item.findByIdAndUpdate(item.itemId, {
              $inc: { currentStock: body.type === "credit-note" ? item.quantity : -item.quantity }
            });
          }
        }
      }
    }

    // 5. Update Estimate Status if linked
    if (body.linkedEstimateNumber) {
      await Estimate.findOneAndUpdate(
        { estimateNumber: body.linkedEstimateNumber },
        { status: "Converted" }
      );
    }

    return NextResponse.json({ success: true, data: invoice });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 400 });
  }
}

export async function PUT(req: Request) {
  try {
    const body = await req.json();
    await connectToDatabase();
    
    if (!body.invoiceNumber) {
      return NextResponse.json({ success: false, error: "Invoice number is required for update" }, { status: 400 });
    }

    const updatedInvoice = await Invoice.findOneAndUpdate({ invoiceNumber: body.invoiceNumber }, body, { new: true });
    
    if (!updatedInvoice) {
      return NextResponse.json({ success: false, error: "Invoice not found" }, { status: 404 });
    }

    return NextResponse.json({ success: true, message: "Invoice updated successfully", data: updatedInvoice });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const invoiceNumber = searchParams.get("invoiceNumber");
    
    if (!invoiceNumber) {
      return NextResponse.json({ success: false, error: "Invoice number is required" }, { status: 400 });
    }

    await connectToDatabase();
    
    const invoice = await Invoice.findOne({ invoiceNumber });
    if (!invoice) {
      return NextResponse.json({ success: false, error: "Invoice not found" }, { status: 404 });
    }

    if (invoice.balanceAmount > 0) {
      await Customer.findByIdAndUpdate(invoice.customerId, {
        $inc: { outstandingBalance: invoice.type === "credit-note" ? invoice.balanceAmount : -invoice.balanceAmount }
      });
    }

    if (invoice.type !== "proforma") {
      if (invoice.items && invoice.items.length > 0) {
        for (const item of invoice.items) {
          if (item.itemId) {
            await Item.findByIdAndUpdate(item.itemId, {
              $inc: { currentStock: invoice.type === "credit-note" ? -item.quantity : item.quantity }
            });
          }
        }
      }
    }

    await Invoice.findOneAndDelete({ invoiceNumber });

    return NextResponse.json({ success: true, message: "Invoice deleted successfully" });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
