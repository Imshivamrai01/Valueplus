import mongoose, { Schema, Document, Model } from "mongoose";

export interface IEstimateItem {
  itemCode: string;
  name: string;
  quantity: number;
  rate: number;
  tax: number;
  amount: number;
}

export interface IEstimate extends Document {
  estimateNumber: string;
  date: Date;
  expiryDate?: Date;
  customerName: string;
  status: "Draft" | "Sent" | "Accepted" | "Rejected" | "Expired" | "Converted";
  items?: IEstimateItem[];
  subTotal?: number;
  taxTotal?: number;
  total: number;
  notes?: string;
}

const EstimateItemSchema = new Schema<IEstimateItem>({
  itemCode: { type: String, required: true },
  name: { type: String, required: true },
  quantity: { type: Number, required: true, min: 1 },
  rate: { type: Number, required: true, min: 0 },
  tax: { type: Number, default: 0 },
  amount: { type: Number, required: true },
}, { _id: false });

const EstimateSchema = new Schema<IEstimate>(
  {
    estimateNumber: { type: String, required: true, unique: true },
    date: { type: Date, default: Date.now },
    expiryDate: { type: Date },
    customerName: { type: String, required: true },
    status: { type: String, enum: ["Draft", "Sent", "Accepted", "Rejected", "Expired", "Converted"], default: "Draft" },
    items: { type: [EstimateItemSchema], default: [] },
    subTotal: { type: Number, default: 0 },
    taxTotal: { type: Number, default: 0 },
    total: { type: Number, required: true },
    notes: { type: String },
  },
  { timestamps: true, collection: "estimates" }
);

const Estimate: Model<IEstimate> = mongoose.models.Estimate || mongoose.model<IEstimate>("Estimate", EstimateSchema);
export default Estimate;
