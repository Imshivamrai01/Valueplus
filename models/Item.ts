import mongoose, { Schema, Document, Model } from "mongoose";

export interface IItem extends Document {
  code: string;
  name: string;
  description?: string;
  category: string;
  brand: string;
  unit: string;
  hsnCode: string;
  gstRate: number;
  purchasePrice: number;
  sellingPrice: number;
  mrp: number;
  openingStock: number;
  currentStock: number;
  reorderLevel: number;
  warehouse: string;
  status: "active" | "inactive";
  imageUrl?: string;
}

const ItemSchema = new Schema<IItem>(
  {
    code: { type: String, required: true, unique: true },
    name: { type: String, required: true },
    description: { type: String, default: "" },
    category: { type: String, default: "" },
    brand: { type: String, default: "" },
    unit: { type: String, default: "" },
    hsnCode: { type: String, default: "8471" },
    gstRate: { type: Number, default: 18 },
    purchasePrice: { type: Number, required: true },
    sellingPrice: { type: Number, required: true },
    mrp: { type: Number, required: true },
    openingStock: { type: Number, default: 0 },
    currentStock: { type: Number, default: 0 },
    reorderLevel: { type: Number, default: 5 },
    warehouse: { type: String, default: "" },
    status: { type: String, enum: ["active", "inactive"], default: "active" },
    imageUrl: { type: String },
  },
  { timestamps: true, collection: "items" }
);

const Item: Model<IItem> = mongoose.models.Item || mongoose.model<IItem>("Item", ItemSchema);
export default Item;
