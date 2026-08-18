import mongoose, { Schema, Document, Model } from "mongoose";

export interface IDeliveryChallan extends Document {
  challanNo: string;
  type: "Outward Delivery" | "Customer Return" | "Warehouse Return" | "Supplier Return" | "Client Return";
  invoiceNumber?: string;
  sourceParty: string;
  sourceAddress: string;
  destinationParty: string;
  destinationAddress: string;
  customerPhone?: string;
  itemName: string;
  vpCode?: string;
  hsn: string;
  serialImei: string;
  quantity: number;
  unit: string;
  financeDoId?: string;
  reason: string;
  date: Date;
  vehicleNo: string;
  driverName: string;
  driverPhone: string;
  status: "dispatched" | "in-transit" | "delivered" | "returned" | "received";
  remarks?: string;
}

const DeliveryChallanSchema = new Schema<IDeliveryChallan>(
  {
    challanNo: { type: String, required: true, unique: true, index: true },
    type: {
      type: String,
      enum: ["Outward Delivery", "Customer Return", "Warehouse Return", "Supplier Return", "Client Return"],
      default: "Outward Delivery",
    },
    invoiceNumber: { type: String, index: true },
    sourceParty: { type: String, default: "M/S ASHOKA ENTERPRISES" },
    sourceAddress: { type: String, default: "H. NO. 116, NEAR SHANTI MARRIAGE HOUSE DEORIA ROAD, KUNRAGHAT GORAKHPUR" },
    destinationParty: { type: String, required: true },
    destinationAddress: { type: String, default: "" },
    customerPhone: { type: String, default: "" },
    itemName: { type: String, required: true },
    vpCode: { type: String, default: "" },
    hsn: { type: String, default: "" },
    serialImei: { type: String, default: "" },
    quantity: { type: Number, required: true, min: 1 },
    unit: { type: String, default: "PCS" },
    financeDoId: { type: String, default: "" },
    reason: { type: String, default: "" },
    date: { type: Date, default: Date.now },
    vehicleNo: { type: String, default: "" },
    driverName: { type: String, default: "" },
    driverPhone: { type: String, default: "" },
    status: {
      type: String,
      enum: ["dispatched", "in-transit", "delivered", "returned", "received"],
      default: "dispatched",
    },
    remarks: { type: String, default: "" },
  },
  { timestamps: true, collection: "delivery_challans" }
);

if (mongoose.models.DeliveryChallan) {
  delete mongoose.models.DeliveryChallan;
}
const DeliveryChallan: Model<IDeliveryChallan> = mongoose.model<IDeliveryChallan>("DeliveryChallan", DeliveryChallanSchema);

export default DeliveryChallan;

