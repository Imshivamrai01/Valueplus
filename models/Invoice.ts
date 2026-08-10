import mongoose, { Schema, Document, Model } from "mongoose";

export interface ILineItem {
  itemId: string;
  itemName: string;
  itemCode: string;
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
}

export interface IInvoice extends Document {
  invoiceNumber: string;
  type: "tax-invoice" | "proforma" | "credit-note" | "sales-order";
  customerId: string;
  customerName: string;
  customerGST?: string;
  customerPhone?: string;
  customerEmail?: string;
  customerAddress?: string;
  customerCity?: string;
  customerPin?: string;
  placeOfSupply?: string;
  date: string;
  dueDate: string;
  status: "draft" | "sent" | "paid" | "partial" | "overdue" | "cancelled";
  items: ILineItem[];
  subtotal: number;
  discount: number;
  taxableAmount: number;
  cgst: number;
  sgst: number;
  igst: number;
  totalGST: number;
  roundOff: number;
  total: number;
  paidAmount: number;
  balanceAmount: number;
  paymentMode: string;
  paymentTerms: string;
  financeCompany?: string;
  financeApprovalNo?: string;
  downPayment?: number;
  downPaymentMode?: string;
  shippingCharges?: number;
  financeTenureMonths?: number;
  financeSchemeType?: string;
  financeInterestRate?: number;
  monthlyEMI?: number;
  totalInterest?: number;
  notes?: string;
  salesExecutive?: string;
}

const LineItemSchema = new Schema({
  itemId: { type: String, required: true },
  itemName: { type: String, required: true },
  itemCode: { type: String, required: true },
  description: String,
  quantity: { type: Number, required: true },
  unit: { type: String, required: true },
  rate: { type: Number, required: true },
  discount: { type: Number, default: 0 },
  discountType: { type: String, enum: ["percent", "amount"], default: "percent" },
  taxableAmount: { type: Number, required: true },
  gstRate: { type: Number, required: true },
  cgst: { type: Number, default: 0 },
  sgst: { type: Number, default: 0 },
  igst: { type: Number, default: 0 },
  amount: { type: Number, required: true },
});

const InvoiceSchema = new Schema<IInvoice>(
  {
    invoiceNumber: { type: String, required: true, unique: true },
    type: { type: String, enum: ["tax-invoice", "proforma", "credit-note", "sales-order"], default: "tax-invoice" },
    customerId: { type: String, required: true },
    customerName: { type: String, required: true },
    customerGST: String,
    customerPhone: String,
    customerEmail: String,
    customerAddress: String,
    customerCity: String,
    customerPin: String,
    placeOfSupply: String,
    date: { type: String, required: true },
    dueDate: { type: String, required: true },
    status: { type: String, enum: ["draft", "sent", "paid", "partial", "overdue", "cancelled"], default: "sent" },
    items: [LineItemSchema],
    subtotal: { type: Number, required: true },
    discount: { type: Number, default: 0 },
    taxableAmount: { type: Number, required: true },
    cgst: { type: Number, default: 0 },
    sgst: { type: Number, default: 0 },
    igst: { type: Number, default: 0 },
    totalGST: { type: Number, required: true },
    roundOff: { type: Number, default: 0 },
    total: { type: Number, required: true },
    paidAmount: { type: Number, default: 0 },
    balanceAmount: { type: Number, required: true },
    paymentMode: { type: String, default: "Cash" },
    paymentTerms: { type: String, default: "Net 30" },
    financeCompany: String,
    financeApprovalNo: String,
    downPayment: Number,
    downPaymentMode: String,
    shippingCharges: Number,
    financeTenureMonths: Number,
    financeSchemeType: String,
    financeInterestRate: Number,
    monthlyEMI: Number,
    totalInterest: Number,
    notes: String,
    salesExecutive: String,
  },
  { timestamps: true, collection: "invoices" }
);

const Invoice: Model<IInvoice> = mongoose.models.Invoice || mongoose.model<IInvoice>("Invoice", InvoiceSchema);
export default Invoice;
