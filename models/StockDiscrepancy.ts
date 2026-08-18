import mongoose, { Schema, Document, Model } from "mongoose";

export interface IStockDiscrepancy extends Document {
  discrepancyNumber: string;
  productId: string;
  productName: string;
  vpCode: string;
  systemStock: number;
  physicalStock: number;
  difference: number;
  reason: string;
  reportedBy: string;
  approvedBy?: string;
  status: "Pending Approval" | "Approved" | "Rejected";
  resolutionNotes?: string;
  adjustmentDate: string;
}

const StockDiscrepancySchema = new Schema<IStockDiscrepancy>(
  {
    discrepancyNumber: { type: String, required: true, unique: true, index: true },
    productId: { type: String, required: true, index: true },
    productName: { type: String, required: true },
    vpCode: { type: String, default: "" },
    systemStock: { type: Number, required: true },
    physicalStock: { type: Number, required: true },
    difference: { type: Number, required: true },
    reason: { type: String, required: true },
    reportedBy: { type: String, required: true, default: "Store Auditor" },
    approvedBy: { type: String },
    status: {
      type: String,
      enum: ["Pending Approval", "Approved", "Rejected"],
      default: "Pending Approval",
      index: true,
    },
    resolutionNotes: { type: String, default: "" },
    adjustmentDate: { type: String, required: true, default: () => new Date().toISOString().split("T")[0] },
  },
  { timestamps: true, collection: "stock_discrepancies" }
);

if (mongoose.models.StockDiscrepancy) {
  delete mongoose.models.StockDiscrepancy;
}
const StockDiscrepancy: Model<IStockDiscrepancy> = mongoose.model<IStockDiscrepancy>("StockDiscrepancy", StockDiscrepancySchema);
export default StockDiscrepancy;
