import { NextResponse } from "next/server";
import connectToDatabase from "@/lib/db";
import CashTransaction from "@/models/CashTransaction";
import BankAccount from "@/models/BankAccount";
import Invoice from "@/models/Invoice";
import Expense from "@/models/Expense";
import FinanceTransaction from "@/models/FinanceTransaction";

export async function GET(req: Request) {
  try {
    await connectToDatabase();
    const todayStr = new Date().toISOString().split("T")[0];

    // 1. Fetch Recorded Cash Transactions from MongoDB
    const recordedTxns = await CashTransaction.find({}).sort({ createdAt: -1 });

    // 2. Fetch Cash Invoices (Inflows) from MongoDB
    // Split invoices carry paymentMode "Multiple", so an exact "Cash" match would miss
    // the cash portion of a bill settled partly in cash. Fetch those too and pull out
    // just their cash rows below.
    const cashInvoices = await Invoice.find({
      $or: [
        { paymentMode: "Cash" },
        { paymentMode: "cash" },
        { "payments.mode": { $regex: /cash/i } },
      ],
      status: { $ne: "cancelled" },
    }).sort({ createdAt: -1 });

    // 3. Fetch Cash Expenses (Outflows) from MongoDB
    const cashExpenses = await Expense.find({
      $or: [{ paymentMode: "Cash" }, { paymentMode: "cash" }],
    }).sort({ createdAt: -1 });

    // 4. Fetch Cash EMI & Down Payments from Finance in MongoDB
    const financeRecords = await FinanceTransaction.find({}).sort({ createdAt: -1 });

    const consolidatedLedger: any[] = [];
    const seenRefs = new Set<string>();

    // A. Add explicitly recorded cash transactions
    recordedTxns.forEach((tx) => {
      seenRefs.add(tx.referenceNo);
      consolidatedLedger.push({
        _id: tx._id.toString(),
        type: tx.type,
        category: tx.category,
        amount: Number(tx.amount || 0),
        date: tx.date || todayStr,
        time: tx.time || "12:00 PM",
        referenceNo: tx.referenceNo,
        description: tx.description || "",
        partyName: tx.partyName || "",
        targetBankAccount: tx.targetBankAccount || "",
        handedTo: tx.handedTo || "",
        recordedBy: tx.recordedBy || "Cashier / Admin",
        source: "CASH_TRANSACTION",
      });
    });

    // B. Add Cash Invoices (if not already logged)
    cashInvoices.forEach((inv: any) => {
      if (!seenRefs.has(inv.invoiceNumber)) {
        seenRefs.add(inv.invoiceNumber);
        const invDate = inv.invoiceDate ? inv.invoiceDate.split("T")[0] : todayStr;

        // For a split bill only the cash rows belong in the drawer, not the whole bill.
        const cashRows = Array.isArray(inv.payments)
          ? inv.payments.filter((p: any) => /cash/i.test(p?.mode || ""))
          : [];
        const isSplit = Array.isArray(inv.payments) && inv.payments.length > 1;
        const cashAmount = isSplit
          ? cashRows.reduce((sum: number, p: any) => sum + (Number(p.amount) || 0), 0)
          : Number(inv.grandTotal || inv.totalAmount || inv.total || 0);

        if (cashAmount <= 0) return;

        consolidatedLedger.push({
          _id: `INV-${inv._id}`,
          type: "INFLOW",
          category: "CASH_SALE",
          amount: cashAmount,
          date: invDate,
          time: inv.createdAt ? new Date(inv.createdAt).toLocaleTimeString("en-IN") : "10:00 AM",
          referenceNo: inv.invoiceNumber,
          description: isSplit
            ? `Cash portion of Split Bill · ${inv.customerName || "Customer"}`
            : `Cash Sale Bill · ${inv.customerName || "Customer"}`,
          partyName: inv.customerName || "Walk-in Customer",
          recordedBy: "Sales Cashier",
          source: "INVOICE",
        });
      }
    });

    // C. Add Cash Finance Down Payments & EMIs
    financeRecords.forEach((f) => {
      // Cash Down Payment
      if (Number(f.customerDownPayment) > 0) {
        const dpRef = `DP-${f.doId}`;
        if (!seenRefs.has(dpRef)) {
          seenRefs.add(dpRef);
          consolidatedLedger.push({
            _id: `FIN-DP-${f._id}`,
            type: "INFLOW",
            category: "DOWN_PAYMENT",
            amount: Number(f.customerDownPayment),
            date: f.date ? f.date.split(" ")[0] : todayStr,
            time: "11:30 AM",
            referenceNo: dpRef,
            description: `Cash Down Payment for ${f.financeProvider} DO: ${f.doId}`,
            partyName: f.customerName,
            recordedBy: "Finance Desk",
            source: "FINANCE_DP",
          });
        }
      }

      // Cash EMI Payments
      if (Array.isArray(f.emiSchedule)) {
        f.emiSchedule.forEach((inst: any) => {
          if (inst.status === "Paid" && inst.paymentChannel === "Shop Counter" && inst.paymentMode === "Cash") {
            const emiRef = inst.receiptNumber || `EMI-${f.doId}-${inst.installmentNumber}`;
            if (!seenRefs.has(emiRef)) {
              seenRefs.add(emiRef);
              consolidatedLedger.push({
                _id: `FIN-EMI-${f._id}-${inst.installmentNumber}`,
                type: "INFLOW",
                category: "EMI_COLLECTION",
                amount: Number(inst.amount || 0),
                date: inst.paidDate || todayStr,
                time: "02:00 PM",
                referenceNo: emiRef,
                description: `Counter Cash EMI #${inst.installmentNumber} · ${f.financeProvider}`,
                partyName: f.customerName,
                recordedBy: inst.collectedBy || "Store Cashier",
                source: "FINANCE_EMI",
              });
            }
          }
        });
      }
    });

    // D. Add Cash Expenses (if not already logged)
    cashExpenses.forEach((exp) => {
      if (!seenRefs.has(exp.expenseNo)) {
        seenRefs.add(exp.expenseNo);
        const expDate = exp.date ? exp.date.split("T")[0] : todayStr;
        consolidatedLedger.push({
          _id: `EXP-${exp._id}`,
          type: "OUTFLOW",
          category: "CASH_EXPENSE",
          amount: Number(exp.amount || 0),
          date: expDate,
          time: exp.createdAt ? new Date(exp.createdAt).toLocaleTimeString("en-IN") : "04:30 PM",
          referenceNo: exp.expenseNo,
          description: `Store Expense · ${exp.category} (${exp.description || ""})`,
          partyName: exp.category,
          recordedBy: "Store Manager",
          source: "EXPENSE",
        });
      }
    });

    // Sort by Date descending
    consolidatedLedger.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

    // Calculate Financial Summary Metrics
    let totalInflow = 0;
    let totalOutflow = 0;
    let todayInflow = 0;
    let todayOutflow = 0;
    let bankDepositsTotal = 0;
    let mdHandoversTotal = 0;
    let cashExpensesTotal = 0;

    consolidatedLedger.forEach((item) => {
      const amt = Number(item.amount || 0);
      const isToday = item.date === todayStr;

      if (item.type === "INFLOW") {
        totalInflow += amt;
        if (isToday) todayInflow += amt;
      } else {
        totalOutflow += amt;
        if (isToday) todayOutflow += amt;

        if (item.category === "BANK_DEPOSIT") bankDepositsTotal += amt;
        else if (item.category === "MD_HANDOVER") mdHandoversTotal += amt;
        else if (item.category === "CASH_EXPENSE") cashExpensesTotal += amt;
      }
    });

    // Base initial opening float from register
    const baseOpening = 200000;
    const currentBalance = Math.max(0, baseOpening + totalInflow - totalOutflow);

    return NextResponse.json({
      success: true,
      data: {
        currentBalance,
        baseOpening,
        totalInflow,
        totalOutflow,
        todayInflow,
        todayOutflow,
        bankDepositsTotal,
        mdHandoversTotal,
        cashExpensesTotal,
        ledger: consolidatedLedger,
      },
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    await connectToDatabase();

    const {
      type, // "INFLOW" | "OUTFLOW"
      category, // "BANK_DEPOSIT" | "MD_HANDOVER" | "CASH_EXPENSE" | "OTHER_RECEIPT"
      amount,
      date,
      referenceNo,
      description, // Mandatory Reason
      partyName, // Expense Category or MD Name or Bank
      targetBankAccount,
      handedTo,
      recordedBy,
    } = body;

    if (!type || !category || !amount || Number(amount) <= 0) {
      return NextResponse.json(
        { success: false, error: "Valid Type, Category and positive Amount are required" },
        { status: 400 }
      );
    }

    if (category === "CASH_EXPENSE" && (!description || !description.trim())) {
      return NextResponse.json(
        { success: false, error: "Expense Reason / Particulars description is required" },
        { status: 400 }
      );
    }

    const todayStr = new Date().toISOString().split("T")[0];
    const genRef = referenceNo || (category === "CASH_EXPENSE" ? `EXP-${Date.now().toString().slice(-6)}` : `CSH-${Date.now().toString().slice(-6)}`);

    // Create Cash Transaction Entry in MongoDB
    const newTxn = await CashTransaction.create({
      type,
      category,
      amount: Number(amount),
      date: date || todayStr,
      time: new Date().toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" }),
      referenceNo: genRef,
      description: description.trim(),
      partyName: partyName || (category === "MD_HANDOVER" ? handedTo : targetBankAccount) || "Showroom Expense",
      targetBankAccount: targetBankAccount || "",
      handedTo: handedTo || "",
      recordedBy: recordedBy || "Admin / Cashier",
    });

    // If Outflow is Bank Deposit -> Automatically credit target Bank Account in MongoDB
    if (category === "BANK_DEPOSIT" && targetBankAccount) {
      const bankAcc = await BankAccount.findOne({
        $or: [
          { name: targetBankAccount },
          { number: targetBankAccount.split("(").pop()?.replace(")", "").trim() },
          { bank: targetBankAccount },
        ],
      });

      if (bankAcc) {
        bankAcc.balance = Number(bankAcc.balance || 0) + Number(amount);
        await bankAcc.save();
      }
    }

    // If Outflow is Cash Expense -> Automatically create record in Expense collection with exact reason!
    if (category === "CASH_EXPENSE") {
      await Expense.create({
        expenseNo: genRef,
        category: partyName || "General Petty Cash & Miscellaneous",
        description: description.trim(),
        amount: Number(amount),
        date: date || todayStr,
        paymentMode: "Cash",
        status: "paid",
      });
    }

    return NextResponse.json({
      success: true,
      message: "Cash movement recorded and saved to MongoDB!",
      data: newTxn,
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
