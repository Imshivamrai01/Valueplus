import mongoose, { Schema, Document, Model } from "mongoose";

export interface IPurchaseEntry extends Document {
  billNo: string;
  supplierName: string;
  type: "entry" | "debit-note";
  billDate: string;
  dueDate?: string;
  items?: Array<{
    itemId: string;
    name: string;
    quantity: number;
    rate: number;
    gstRate: number;
  }>;
  subtotal: number;
  gst: number;
  total: number;
  paid: number;
  balance: number;
  status: "paid" | "partial" | "pending" | "overdue";
}

const PurchaseEntrySchema = new Schema<IPurchaseEntry>(
  {
    billNo: { type: String, required: true },
    supplierName: { type: String, required: true },
    type: { type: String, enum: ["entry", "debit-note"], default: "entry" },
    billDate: { type: String, required: true },
    dueDate: { type: String },
    items: [
      {
        itemId: { type: String },
        name: { type: String },
        quantity: { type: Number },
        rate: { type: Number },
        gstRate: { type: Number },
      }
    ],
    subtotal: { type: Number, default: 0 },
    gst: { type: Number, default: 0 },
    total: { type: Number, required: true },
    paid: { type: Number, default: 0 },
    balance: { type: Number, default: 0 },
    status: { type: String, enum: ["paid", "partial", "pending", "overdue"], default: "pending" },
  },
  { timestamps: true, collection: "purchase_entries" }
);

const PurchaseEntry: Model<IPurchaseEntry> = mongoose.models.PurchaseEntry || mongoose.model<IPurchaseEntry>("PurchaseEntry", PurchaseEntrySchema);
export default PurchaseEntry;
