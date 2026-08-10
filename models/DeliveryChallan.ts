import mongoose, { Schema, Document, Model } from "mongoose";

export interface IDeliveryChallan extends Document {
  challanNo: string;
  type: "Customer Return" | "Warehouse Return" | "Supplier Return" | "Client Return";
  sourceParty: string;
  sourceAddress: string;
  destinationParty: string;
  destinationAddress: string;
  itemName: string;
  hsn: string;
  serialImei: string;
  quantity: number;
  unit: string;
  reason: string;
  date: Date;
  vehicleNo: string;
  driverName: string;
  driverPhone: string;
  status: "dispatched" | "in-transit" | "returned" | "received";
}

const DeliveryChallanSchema = new Schema<IDeliveryChallan>(
  {
    challanNo: { type: String, required: true, unique: true },
    type: { type: String, enum: ["Customer Return", "Warehouse Return", "Supplier Return", "Client Return"], required: true },
    sourceParty: { type: String, required: true },
    sourceAddress: { type: String, default: "" },
    destinationParty: { type: String, required: true },
    destinationAddress: { type: String, default: "" },
    itemName: { type: String, required: true },
    hsn: { type: String, default: "" },
    serialImei: { type: String, default: "" },
    quantity: { type: Number, required: true, min: 1 },
    unit: { type: String, default: "PCS" },
    reason: { type: String, default: "" },
    date: { type: Date, default: Date.now },
    vehicleNo: { type: String, default: "" },
    driverName: { type: String, default: "" },
    driverPhone: { type: String, default: "" },
    status: { type: String, enum: ["dispatched", "in-transit", "returned", "received"], default: "dispatched" },
  },
  { timestamps: true, collection: "delivery_challans" }
);

const DeliveryChallan: Model<IDeliveryChallan> = mongoose.models.DeliveryChallan || mongoose.model<IDeliveryChallan>("DeliveryChallan", DeliveryChallanSchema);
export default DeliveryChallan;
