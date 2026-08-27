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
  minSellingPrice?: number;
  maxDiscountPercent?: number;
  maxDiscountAmount?: number;
  incentiveTargetAmount?: number;
  incentiveAmount?: number;
  incentiveType?: "none" | "fixed" | "percentage";
  incentiveValue?: number;
  mrp: number;
  openingStock: number;
  currentStock: number;
  showroomStock?: number;
  godownStock?: number;
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
    minSellingPrice: { type: Number, default: 0 },
    maxDiscountPercent: { type: Number, default: 0 },
    maxDiscountAmount: { type: Number, default: 0 },
    incentiveTargetAmount: { type: Number, default: 0 },
    incentiveAmount: { type: Number, default: 0 },
    incentiveType: { type: String, enum: ["none", "fixed", "percentage"], default: "none" },
    incentiveValue: { type: Number, default: 0 },
    mrp: { type: Number, required: true },
    openingStock: { type: Number, default: 0 },
    currentStock: { type: Number, default: 0 },
    showroomStock: { type: Number, default: 0 },
    godownStock: { type: Number, default: 0 },
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

ItemSchema.index({ currentStock: -1, name: 1 });
ItemSchema.index({ category: 1, brand: 1 });
ItemSchema.index({ code: 1 });
ItemSchema.index({ vpCode: 1 });
ItemSchema.index({ status: 1, warehouse: 1 });

const Item: Model<IItem> = mongoose.models.Item || mongoose.model<IItem>("Item", ItemSchema);
export default Item;
