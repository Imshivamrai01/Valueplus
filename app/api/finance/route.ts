import { NextResponse } from "next/server";
import connectToDatabase from "@/lib/db";
import FinanceTransaction from "@/models/FinanceTransaction";
import Invoice from "@/models/Invoice";

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const invoiceNumber = searchParams.get("invoiceNumber");
    const doId = searchParams.get("doId");
    const status = searchParams.get("status");
    const provider = searchParams.get("provider");
    
    await connectToDatabase();
    
    const filter: any = {};
    if (invoiceNumber) filter.invoiceNumber = invoiceNumber;
    if (doId) filter.doId = doId;
    if (status) filter.approvalStatus = status;
    if (provider) filter.financeProvider = provider;
    
    const transactions = await FinanceTransaction.find(filter).sort({ createdAt: -1 });
    return NextResponse.json({ success: true, data: transactions });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    await connectToDatabase();
    
    if (!body.doId) {
      const count = await FinanceTransaction.countDocuments();
      body.doId = `DO-2026-${String(count + 1).padStart(4, "0")}-${Math.floor(1000 + Math.random() * 9000)}`;
    }
    
    const financeTxn = await FinanceTransaction.create(body);
    
    // Also update invoice finance fields if invoice exists
    if (body.invoiceNumber) {
      await Invoice.findOneAndUpdate(
        { invoiceNumber: body.invoiceNumber },
        {
          financeProvider: body.financeProvider,
          financeDoId: body.doId,
          financeGrossLoan: body.grossLoanAmount,
          financeNetLoan: body.netLoanAmount,
          financeDownPayment: body.customerDownPayment,
          financeApprovalStatus: body.approvalStatus || "Pending",
          financeExpectedDisbursement: body.netDisbursement,
        }
      );
    }
    
    return NextResponse.json({ success: true, data: financeTxn });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 400 });
  }
}

export async function PUT(req: Request) {
  try {
    const body = await req.json();
    await connectToDatabase();
    
    const { doId, approvalStatus, approvedBy, actualReceivedAmount, bankAccountRef, transactionRef, remarks } = body;
    if (!doId) {
      return NextResponse.json({ success: false, error: "DO ID is required" }, { status: 400 });
    }
    
    const updateData: any = {};
    if (approvalStatus) {
      updateData.approvalStatus = approvalStatus;
      if (approvalStatus === "Approved" || approvalStatus === "Disbursed" || approvalStatus === "Reconciled") {
        updateData.approvalDate = new Date().toISOString();
        if (approvedBy) updateData.approvedBy = approvedBy;
      }
    }
    if (actualReceivedAmount !== undefined) updateData.actualReceivedAmount = actualReceivedAmount;
    if (bankAccountRef) updateData.bankAccountRef = bankAccountRef;
    if (transactionRef) updateData.transactionRef = transactionRef;
    if (remarks) updateData.remarks = remarks;
    if (body.uploadedPdfUrl) updateData.uploadedPdfUrl = body.uploadedPdfUrl;
    
    const updated = await FinanceTransaction.findOneAndUpdate({ doId }, updateData, { new: true });
    if (!updated) {
      return NextResponse.json({ success: false, error: "Finance record not found" }, { status: 404 });
    }
    
    // Sync status with invoice
    if (updated.invoiceNumber && approvalStatus) {
      await Invoice.findOneAndUpdate(
        { invoiceNumber: updated.invoiceNumber },
        {
          financeApprovalStatus: approvalStatus,
          financeActualDisbursement: actualReceivedAmount || updated.actualReceivedAmount,
        }
      );
    }
    
    return NextResponse.json({ success: true, data: updated });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
