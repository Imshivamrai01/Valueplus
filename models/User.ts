import mongoose, { Schema, Document, Model } from "mongoose";

export interface IUser extends Document {
  name: string;
  email: string;
  password?: string;
  role: "admin" | "warehouse" | "salesman" | "cashier" | "accounts" | "hr" | "supplier" | "manager" | "sales";
  mobile?: string;
  avatar?: string;
  address?: string;
  city?: string;
  state?: string;
  pincode?: string;
  idProofType?: "Aadhaar Card" | "PAN Card" | "Voter ID" | "Driving License" | "Passport";
  idProofNumber?: string;
  idProofDoc?: string;
  designation?: string;
  monthlySalary?: number;
  salaryType?: "Fixed" | "Fixed + Incentive" | "Commission Only";
  joiningDate?: string;
  advanceBalance?: number;
  monthlyAdvanceDeduction?: number;
  bankName?: string;
  bankAccountNo?: string;
  bankIfsc?: string;
  assignedWarehouseId?: string;
  assignedWarehouseName?: string;
  status: "active" | "inactive";
}

const UserSchema = new Schema<IUser>(
  {
    name: { type: String, required: true },
    email: { type: String, required: true, unique: true },
    password: { type: String },
    role: {
      type: String,
      enum: ["admin", "warehouse", "salesman", "cashier", "accounts", "hr", "supplier", "manager", "sales"],
      default: "salesman",
      index: true,
    },
    mobile: { type: String, default: "" },
    avatar: { type: String, default: "" },
    address: { type: String, default: "" },
    city: { type: String, default: "Gorakhpur" },
    state: { type: String, default: "Uttar Pradesh" },
    pincode: { type: String, default: "273008" },
    idProofType: {
      type: String,
      enum: ["Aadhaar Card", "PAN Card", "Voter ID", "Driving License", "Passport"],
      default: "Aadhaar Card",
    },
    idProofNumber: { type: String, default: "" },
    idProofDoc: { type: String, default: "" },
    designation: { type: String, default: "Sales Executive" },
    monthlySalary: { type: Number, default: 0 },
    salaryType: {
      type: String,
      enum: ["Fixed", "Fixed + Incentive", "Commission Only"],
      default: "Fixed",
    },
    joiningDate: { type: String, default: () => new Date().toISOString().split("T")[0] },
    advanceBalance: { type: Number, default: 0 },
    monthlyAdvanceDeduction: { type: Number, default: 0 },
    bankName: { type: String, default: "" },
    bankAccountNo: { type: String, default: "" },
    bankIfsc: { type: String, default: "" },
    assignedWarehouseId: { type: String, default: "" },
    assignedWarehouseName: { type: String, default: "" },
    status: { type: String, enum: ["active", "inactive"], default: "active" },
  },
  { timestamps: true, collection: "users" }
);

if (mongoose.models.User) {
  delete mongoose.models.User;
}
const User: Model<IUser> = mongoose.model<IUser>("User", UserSchema);
export default User;
