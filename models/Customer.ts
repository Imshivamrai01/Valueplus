import mongoose, { Schema, Document, Model } from "mongoose";

export interface ICustomer extends Document {
  code: string;
  name: string;
  email: string;
  phone: string;
  gstNumber?: string;
  panNumber?: string;
  billingAddress: {
    line1: string;
    line2?: string;
    city: string;
    state: string;
    pincode: string;
    country: string;
  };
  shippingAddress?: {
    line1: string;
    line2?: string;
    city: string;
    state: string;
    pincode: string;
    country: string;
  };
  creditLimit: number;
  creditDays: number;
  outstandingBalance: number;
  loyaltyPoints: number;
  customerGroup: string;
  status: "active" | "inactive";
}

const AddressSchema = new Schema({
  line1: { type: String, required: true },
  line2: { type: String },
  city: { type: String, required: true },
  state: { type: String, required: true },
  pincode: { type: String, required: true },
  country: { type: String, default: "India" },
});

const CustomerSchema = new Schema<ICustomer>(
  {
    code: { type: String, required: true, unique: true },
    name: { type: String, required: true },
    email: { type: String, default: "" },
    phone: { type: String, required: true },
    gstNumber: { type: String },
    panNumber: { type: String },
    billingAddress: { type: AddressSchema, required: true },
    shippingAddress: { type: AddressSchema },
    creditLimit: { type: Number, default: 50000 },
    creditDays: { type: Number, default: 30 },
    outstandingBalance: { type: Number, default: 0 },
    loyaltyPoints: { type: Number, default: 0 },
    customerGroup: { type: String, default: "Retail" },
    status: { type: String, enum: ["active", "inactive"], default: "active" },
  },
  { timestamps: true, collection: "customers" }
);

const Customer: Model<ICustomer> = mongoose.models.Customer || mongoose.model<ICustomer>("Customer", CustomerSchema);
export default Customer;
