import mongoose, { Schema, Document, Model } from "mongoose";

export interface IWarrantyPlan {
  planName: string;
  durationMonths: number;
  price: number;
}

export interface IItem extends Document {
  code: string;
  vpCode?: string;
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
  isSerialized?: boolean;
  isBatchTracked?: boolean;
  batchNumber?: string;
  warrantyPlans?: IWarrantyPlan[];
}

const WarrantyPlanSchema = new Schema({
  planName: { type: String, required: true },
  durationMonths: { type: Number, required: true },
  price: { type: Number, required: true },
});

const ItemSchema = new Schema<IItem>(
  {
    code: { type: String, required: true, unique: true },
    vpCode: { type: String, index: true },
    name: { type: String, required: true },
    description: { type: String, default: "" },
    category: { type: String, default: "" },
    brand: { type: String, default: "" },
    unit: { type: String, default: "Pcs" },
    hsnCode: { type: String, default: "8528" },
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
    isSerialized: { type: Boolean, default: false },
    isBatchTracked: { type: Boolean, default: false },
    batchNumber: { type: String, default: "" },
    warrantyPlans: [WarrantyPlanSchema],
  },
  { timestamps: true, collection: "items" }
);

if (mongoose.models.Item) {
  delete mongoose.models.Item;
}
const Item: Model<IItem> = mongoose.model<IItem>("Item", ItemSchema);
export default Item;

