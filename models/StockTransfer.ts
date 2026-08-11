import mongoose, { Schema, Document } from "mongoose";

export interface IStockTransfer extends Document {
  transferNo: string;
  fromWarehouse: string;
  toWarehouse: string;
  items: Array<{
    itemId: string;
    itemName: string;
    quantity: number;
    unit: string;
  }>;
  date: string;
  status: string;
  createdAt: Date;
  updatedAt: Date;
}

const StockTransferSchema: Schema = new Schema(
  {
    transferNo: { type: String, required: true, unique: true },
    fromWarehouse: { type: String, required: true },
    toWarehouse: { type: String, required: true },
    items: [
      {
        itemId: { type: String, required: true },
        itemName: { type: String, required: true },
        quantity: { type: Number, required: true },
        unit: { type: String, default: "PCS" },
      }
    ],
    date: { type: String, required: true },
    status: { type: String, required: true, default: "in-transit" },
  },
  { timestamps: true }
);

if (mongoose.models.StockTransfer) {
  delete mongoose.models.StockTransfer;
}
export default mongoose.model<IStockTransfer>("StockTransfer", StockTransferSchema);
