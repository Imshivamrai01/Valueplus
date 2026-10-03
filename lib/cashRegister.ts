import CashTransaction from "@/models/CashTransaction";
import Invoice from "@/models/Invoice";
import Expense from "@/models/Expense";
import FinanceTransaction from "@/models/FinanceTransaction";

/**
 * Builds the same consolidated cash ledger + running balance the Cash Register
 * page shows. Pulled out of app/api/cash-register/route.ts so Day-Close can
 * snapshot "what the system expects the drawer to hold" without re-deriving
 * this logic a second time and risking the two drifting apart.
 */
export async function getCashRegisterSummary() {
  const todayStr = new Date().toISOString().split("T")[0];

  const recordedTxns = await CashTransaction.find({}).sort({ createdAt: -1 });

  // Only real completed sales count as cash in hand — see the matching note in
  // the cash-register route for why `type: "tax-invoice"` is required here.
  const cashInvoices = await Invoice.find({
    type: "tax-invoice",
    $or: [
      { paymentMode: "Cash" },
      { paymentMode: "cash" },
      { "payments.mode": { $regex: /cash/i } },
    ],
    status: { $ne: "cancelled" },
  }).sort({ createdAt: -1 });

  const cashExpenses = await Expense.find({
    $or: [{ paymentMode: "Cash" }, { paymentMode: "cash" }],
  }).sort({ createdAt: -1 });

  const financeRecords = await FinanceTransaction.find({}).sort({ createdAt: -1 });

  // FinanceTransaction itself never recorded how the down payment was actually
  // collected — only the Invoice it came from does (financeDownPaymentMode).
  // Without this join, every finance down payment got labelled "Cash" here
  // regardless of whether it was really UPI/card/online.
  const financeInvoiceNumbers = financeRecords.map((f: any) => f.invoiceNumber).filter(Boolean);
  const linkedInvoices = financeInvoiceNumbers.length
    ? await Invoice.find(
        { invoiceNumber: { $in: financeInvoiceNumbers } },
        { invoiceNumber: 1, financeDownPaymentMode: 1 }
      ).lean()
    : [];
  const downPaymentModeByInvoice = new Map(
    linkedInvoices.map((i: any) => [i.invoiceNumber, i.financeDownPaymentMode])
  );

  const consolidatedLedger: any[] = [];
  const seenRefs = new Set<string>();

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

  cashInvoices.forEach((inv: any) => {
    if (!seenRefs.has(inv.invoiceNumber)) {
      seenRefs.add(inv.invoiceNumber);
      const invDate = inv.invoiceDate ? inv.invoiceDate.split("T")[0] : todayStr;

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

  financeRecords.forEach((f) => {
    const downPaymentMode = downPaymentModeByInvoice.get(f.invoiceNumber) || "";
    const isDownPaymentCash = /cash/i.test(downPaymentMode);
    if (Number(f.customerDownPayment) > 0 && isDownPaymentCash) {
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

  consolidatedLedger.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

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

  const baseOpening = 200000;
  const currentBalance = Math.max(0, baseOpening + totalInflow - totalOutflow);

  return {
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
  };
}
