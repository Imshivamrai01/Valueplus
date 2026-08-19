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
    
    // 1. Customer Auto-Add Logic & Offline Sync Reconciliation
    if (body.customerId === "new" || !body.customerId || body.customerId.startsWith("OFFLINE-CUST-")) {
      let matchedCust = body.customerPhone ? await Customer.findOne({ phone: body.customerPhone }) : null;
      if (!matchedCust) {
        const count = await Customer.countDocuments();
        const nextNum = count + 1;
        const custCode = `CUST-${String(nextNum).padStart(3, "0")}`;
        
        matchedCust = await Customer.create({
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
      }
      body.customerId = matchedCust._id.toString();
    }
    
    // 2. Create Invoice with offline deduplication check
    const existingInvoice = await Invoice.findOne({ invoiceNumber: body.invoiceNumber });
    if (existingInvoice) {
      return NextResponse.json({ success: true, data: existingInvoice, message: "Invoice already synced" });
    }

    const invoice = await Invoice.create(body);
    
    try {
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
          notes: invoice.type === 'credit-note' ? `Refund for Credit Note ${invoice.invoiceNumber}` : `Initial payment for ${invoice.type === 'sales-order' ? 'order' : 'invoice'} ${invoice.invoiceNumber}`,
          type: invoice.type === 'credit-note' ? "paid" : "received"
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

      // 4. Inventory Stock Deduction & Serial Number Status Update
      if (body.type !== "proforma") {
        if (body.items && body.items.length > 0) {
          for (const item of body.items) {
            // Deduct / add stock
            if (item.itemId && (item.itemId.length === 24 || item.itemId.length > 10)) {
              await Item.findByIdAndUpdate(item.itemId, {
                $inc: { currentStock: body.type === "credit-note" ? item.quantity : -item.quantity },
              });
            }

            // Lock Serial Number if serialized item was sold
            if (item.serialNumber && body.type !== "credit-note") {
              const SerialNumber = (await import("@/models/SerialNumber")).default;
              await SerialNumber.findOneAndUpdate(
                { serialNumber: item.serialNumber },
                {
                  status: "SOLD",
                  invoiceId: invoice._id.toString(),
                  invoiceNumber: invoice.invoiceNumber,
                  customerName: invoice.customerName,
                  customerPhone: invoice.customerPhone || "",
                  soldDate: invoice.date,
                  $push: {
                    history: {
                      action: "Sold via Tax Invoice",
                      date: new Date(),
                      performedBy: invoice.salesExecutive || "Sales Team",
                      details: `Invoice #${invoice.invoiceNumber}`,
                    },
                  },
                }
              );
            }

            // Record Extended Warranty if purchased
            if (item.extendedWarrantyPlan && (item.extendedWarrantyAmount || 0) > 0) {
              const ExtendedWarranty = (await import("@/models/ExtendedWarranty")).default;
              const duration = item.extendedWarrantyDuration || 12;
              const startDate = invoice.date;
              const startObj = new Date(startDate);
              startObj.setMonth(startObj.getMonth() + duration);
              const endDate = startObj.toISOString().split("T")[0];

              const warrantyCount = await ExtendedWarranty.countDocuments();
              await ExtendedWarranty.create({
                warrantyId: `EW-2026-${String(warrantyCount + 1).padStart(4, "0")}-${Math.floor(1000 + Math.random() * 9000)}`,
                customerName: invoice.customerName,
                customerPhone: invoice.customerPhone || "N/A",
                customerEmail: invoice.customerEmail || "",
                invoiceNumber: invoice.invoiceNumber,
                itemId: item.itemId,
                productName: item.itemName,
                vpCode: item.vpCode || item.itemCode,
                serialNumber: item.serialNumber || "",
                planName: item.extendedWarrantyPlan,
                durationMonths: duration,
                startDate,
                endDate,
                warrantyAmount: item.extendedWarrantyAmount,
                salesStaff: invoice.salesExecutive || "Amit Singh",
                status: "Active",
              });
            }
          }
        }
      }

      // 4.5 Auto-generate Delivery Challan if Vehicle Number is provided or outward delivery
      if (body.vehicleNumber || body.createChallan) {
        const DeliveryChallan = (await import("@/models/DeliveryChallan")).default;
        const count = await DeliveryChallan.countDocuments();
        const challanNo = `DC-2026-${String(count + 1).padStart(4, "0")}`;
        const firstItem = body.items?.[0];
        
        await DeliveryChallan.create({
          challanNo,
          type: "Outward Delivery",
          invoiceNumber: invoice.invoiceNumber,
          sourceParty: "M/S ASHOKA ENTERPRISES",
          sourceAddress: "H. NO. 116, NEAR SHANTI MARRIAGE HOUSE DEORIA ROAD, KUNRAGHAT GORAKHPUR",
          destinationParty: invoice.customerName,
          destinationAddress: invoice.customerAddress || invoice.customerCity || "Gorakhpur",
          customerPhone: invoice.customerPhone || "",
          itemName: firstItem?.itemName || "Assorted Products",
          vpCode: firstItem?.vpCode || firstItem?.itemCode || "",
          hsn: firstItem?.hsnCode || firstItem?.hsn || "8528",
          serialImei: body.items?.map((it: any) => it.serialNumber).filter(Boolean).join(", ") || "",
          quantity: body.items?.reduce((sum: number, it: any) => sum + (it.quantity || 1), 0) || 1,
          unit: firstItem?.unit || "PCS",
          financeDoId: body.financeDoId || "",
          reason: "Tax Invoice Dispatch",
          date: new Date(),
          vehicleNo: body.vehicleNumber || "",
          driverName: body.driverName || "Store Dispatch",
          driverPhone: body.driverPhone || "",
          status: "dispatched",
        });

        invoice.deliveryChallanNo = challanNo;
        await invoice.save();
      }

      // 4.6 Register Finance Transaction ONLY if Payment Mode is Finance
      if (body.paymentMode === "Finance") {
        const FinanceTransaction = (await import("@/models/FinanceTransaction")).default;
        const doId = body.financeDoId || `DO-2026-${Math.floor(100000000 + Math.random() * 900000000)}`;
        
        const existingDO = await FinanceTransaction.findOne({ doId });
        if (!existingDO) {
          const grossLoan = Number(body.financeGrossLoan || body.total || 0);
          const downPayment = Number(body.downPayment || body.financeDownPayment || 0);
          const subsidy = Number(body.financeDealerSubsidy || Math.round(grossLoan * 0.0354));
          const deductions = downPayment + subsidy + 270; // Matching typical DO calculations
          const netDisb = Math.max(0, grossLoan - deductions);

          await FinanceTransaction.create({
            financeProvider: body.financeProvider || "Bajaj Finance Limited",
            customerName: invoice.customerName,
            customerMobile: invoice.customerPhone || "N/A",
            deliveryAddress: invoice.customerAddress || "Gorakhpur, Uttar Pradesh",
            invoiceNumber: invoice.invoiceNumber,
            atosDealId: body.financeAppId || `CS${Date.now()}`,
            doId,
            date: invoice.date,
            assetCategory: body.items?.[0]?.category || "Electronics",
            oemCategory: body.items?.[0]?.itemName || "Electronics",
            manufacturer: body.items?.[0]?.brand || "Havells (Lloyd)",
            brand: body.items?.[0]?.brand || "Havells (Lloyd)",
            model: body.items?.[0]?.itemName || "",
            productModel: body.items?.[0]?.itemName || "",
            productPrice: invoice.total,
            grossLoanAmount: grossLoan,
            netLoanAmount: grossLoan,
            marginMoney: 0,
            advanceEmi: 0,
            dealerInterestSubsidy: subsidy,
            totalGst: 118,
            convenienceFee: 270,
            customerDownPayment: downPayment,
            totalDeductions: deductions,
            netDisbursement: netDisb,
            approvalStatus: body.financeApprovalStatus || "Pending",
            uploadedPdfUrl: body.financePdfUrl || "",
          });
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
      await Invoice.findByIdAndDelete(invoice._id);
      throw new Error(error.message);
    }
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
