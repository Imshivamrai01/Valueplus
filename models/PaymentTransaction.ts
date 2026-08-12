import mongoose, { Schema, Document, Model } from "mongoose";

export interface IPaymentTransaction extends Document {
  transactionId: string;
  partyId: string;
  partyType: "Customer" | "Supplier";
  partyName: string;
  amount: number;
  paymentMode: "Cash" | "UPI" | "Bank Transfer" | "Credit Card" | "Cheque" | "Cash Counter" | "UPI / Card / NetBanking" | "Finance / Consumer EMI" | "UPI / PhonePe / GPay";
  date: string;
  referenceId?: string; // e.g. Invoice Number or Bill Number
  notes?: string;
  type: "received" | "paid"; // received from customer, paid to supplier
}

const PaymentTransactionSchema = new Schema<IPaymentTransaction>(
  {
    transactionId: { type: String, required: true, unique: true },
    partyId: { type: String, required: true },
    partyType: { type: String, enum: ["Customer", "Supplier"], required: true },
    partyName: { type: String, required: true },
    amount: { type: Number, required: true },
    paymentMode: { type: String, enum: ["Cash", "UPI", "Bank Transfer", "Credit Card", "Cheque", "Cash Counter", "UPI / Card / NetBanking", "Finance / Consumer EMI", "UPI / PhonePe / GPay"], required: true },
    date: { type: String, required: true },
    referenceId: { type: String },
    notes: { type: String },
    type: { type: String, enum: ["received", "paid"], required: true },
  },
  { timestamps: true, collection: "payment_transactions" }
);

const PaymentTransaction: Model<IPaymentTransaction> = mongoose.models.PaymentTransaction || mongoose.model<IPaymentTransaction>("PaymentTransaction", PaymentTransactionSchema);
export default PaymentTransaction;
