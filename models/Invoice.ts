import mongoose, { Schema, Document, Model } from "mongoose";

export interface ILineItem {
  itemId: string;
  itemName: string;
  itemCode: string;
  vpCode?: string;
  description?: string;
  quantity: number;
  unit: string;
  rate: number;
  discount: number;
  discountType: "percent" | "amount";
  taxableAmount: number;
  gstRate: number;
  cgst: number;
  sgst: number;
  igst: number;
  amount: number;
  serialNumber?: string;
  batchNumber?: string;
  extendedWarrantyPlan?: string;
  extendedWarrantyAmount?: number;
  extendedWarrantyDuration?: number;
}

export interface IInvoice extends Document {
  invoiceNumber: string;
  type: "tax-invoice" | "proforma" | "credit-note" | "sales-order";
  customerId: string;
  customerName: string;
  customerGST?: string;
  customerPAN?: string;
  customerPhone?: string;
  customerEmail?: string;
  customerAddress?: string;
  customerCity?: string;
  customerState?: string;
  customerPin?: string;
  placeOfSupply?: string;
  vehicleNumber?: string;
  shippingAddress?: string;
  date: string;
  dueDate: string;
  status: "draft" | "sent" | "paid" | "partial" | "overdue" | "cancelled" | "pending";
  items: ILineItem[];
  subtotal: number;
  discount: number;
  taxableAmount: number;
  cgst: number;
  sgst: number;
  igst: number;
  totalGST: number;
  extendedWarrantyTotal?: number;
  roundOff: number;
  total: number;
  paidAmount: number;
  balanceAmount: number;
  paymentMode: "Cash" | "UPI" | "Online" | "Card" | "Finance" | "Multiple";
  paymentTerms: string;
  
  // Payment Details
  cashReceivedBy?: string;
  upiTxnId?: string;
  onlineTxnId?: string;
  onlineGateway?: string;
  cardAmount?: number;
  cardType?: string;
  cardTxnId?: string;
  cardMdrPercent?: number;
  cardMdrAmount?: number;
  cardNetSettlement?: number;

  // Finance Workflow Details
  financeProvider?: string;
  financeDoId?: string;
  financeAppId?: string;
  financeGrossLoan?: number;
  financeNetLoan?: number;
  financeMarginMoney?: number;
  financeDownPayment?: number;
  financeDealerSubsidy?: number;
  financeExpectedDisbursement?: number;
  financeActualDisbursement?: number;
  financeApprovalStatus?: "Pending" | "Under Review" | "Approved" | "Disbursed" | "Reconciled";
  financePdfUrl?: string;
  financeApprovedBy?: string;
  financeApprovalDate?: string;
  financeBankRef?: string;
  
  downPayment?: number;
  downPaymentMode?: string;
  shippingCharges?: number;
  financeTenureMonths?: number;
  financeSchemeType?: string;
  financeInterestRate?: number;
  monthlyEMI?: number;
  deliveryChallanNo?: string;
  creditNoteRef?: string;
  notes?: string;
  salesExecutive?: string;
  reprintCount?: number;
  lastPrintedAt?: string;
  printLogs?: Array<{ printedAt: string; printedBy?: string }>;
}

const LineItemSchema = new Schema({
  itemId: { type: String, required: true },
  itemName: { type: String, required: true },
  itemCode: { type: String, required: true },
  vpCode: { type: String, default: "" },
  description: String,
  quantity: { type: Number, required: true },
  unit: { type: String, required: true, default: "Pcs" },
  rate: { type: Number, required: true },
  discount: { type: Number, default: 0 },
  discountType: { type: String, enum: ["percent", "amount"], default: "amount" },
  taxableAmount: { type: Number, required: true },
  gstRate: { type: Number, required: true },
  cgst: { type: Number, default: 0 },
  sgst: { type: Number, default: 0 },
  igst: { type: Number, default: 0 },
  amount: { type: Number, required: true },
  serialNumber: { type: String, default: "" },
  batchNumber: { type: String, default: "" },
  extendedWarrantyPlan: { type: String, default: "" },
  extendedWarrantyAmount: { type: Number, default: 0 },
  extendedWarrantyDuration: { type: Number, default: 0 },
});

const InvoiceSchema = new Schema<IInvoice>(
  {
    invoiceNumber: { type: String, required: true, unique: true, index: true },
    type: { type: String, enum: ["tax-invoice", "proforma", "credit-note", "sales-order"], default: "tax-invoice" },
    customerId: { type: String, required: true, index: true },
    customerName: { type: String, required: true, index: true },
    customerGST: { type: String, default: "" },
    customerPAN: { type: String, default: "" },
    customerPhone: { type: String, index: true },
    customerEmail: String,
    customerAddress: String,
    customerCity: String,
    customerState: { type: String, default: "Uttar Pradesh" },
    customerPin: String,
    placeOfSupply: { type: String, default: "Uttar Pradesh(09)" },
    vehicleNumber: { type: String, default: "" },
    shippingAddress: String,
    date: { type: String, required: true, index: true },
    dueDate: { type: String, required: true },
    status: { type: String, enum: ["draft", "sent", "paid", "partial", "overdue", "cancelled", "pending"], default: "sent", index: true },
    items: [LineItemSchema],
    subtotal: { type: Number, required: true },
    discount: { type: Number, default: 0 },
    taxableAmount: { type: Number, required: true },
    cgst: { type: Number, default: 0 },
    sgst: { type: Number, default: 0 },
    igst: { type: Number, default: 0 },
    totalGST: { type: Number, required: true },
    extendedWarrantyTotal: { type: Number, default: 0 },
    roundOff: { type: Number, default: 0 },
    total: { type: Number, required: true },
    paidAmount: { type: Number, default: 0 },
    balanceAmount: { type: Number, required: true },
    paymentMode: { type: String, default: "Cash" },
    paymentTerms: { type: String, default: "Net 30" },

    cashReceivedBy: String,
    upiTxnId: String,
    onlineTxnId: String,
    onlineGateway: String,
    cardAmount: Number,
    cardType: String,
    cardTxnId: String,
    cardMdrPercent: Number,
    cardMdrAmount: Number,
    cardNetSettlement: Number,

    financeProvider: String,
    financeDoId: { type: String, index: true },
    financeAppId: String,
    financeGrossLoan: Number,
    financeNetLoan: Number,
    financeMarginMoney: Number,
    financeDownPayment: Number,
    financeDealerSubsidy: Number,
    financeExpectedDisbursement: Number,
    financeActualDisbursement: Number,
    financeApprovalStatus: {
      type: String,
      enum: ["Pending", "Under Review", "Approved", "Disbursed", "Reconciled"],
      default: "Pending",
    },
    financePdfUrl: String,
    financeApprovedBy: String,
    financeApprovalDate: String,
    financeBankRef: String,

    downPayment: Number,
    downPaymentMode: String,
    shippingCharges: Number,
    financeTenureMonths: Number,
    financeSchemeType: String,
    financeInterestRate: Number,
    monthlyEMI: Number,
    totalInterest: Number,

    deliveryChallanNo: String,
    creditNoteRef: String,
    notes: String,
    salesExecutive: { type: String, default: "AMIT SINGH" },
    reprintCount: { type: Number, default: 0 },
    lastPrintedAt: { type: String },
    printLogs: [
      {
        printedAt: { type: String },
        printedBy: { type: String, default: "User" },
      }
    ],
  },
  { timestamps: true, collection: "invoices" }
);

if (mongoose.models.Invoice) {
  delete mongoose.models.Invoice;
}
const Invoice: Model<IInvoice> = mongoose.model<IInvoice>("Invoice", InvoiceSchema);
export default Invoice;

