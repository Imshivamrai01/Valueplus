import mongoose, { Schema, Document, Model } from "mongoose";

export interface ILeadTimeline {
  date: Date;
  action: string;
  notes: string;
  staff: string;
}

export interface ILead extends Document {
  leadId: string;
  customerName: string;
  mobile: string;
  email?: string;
  source: string;
  walkInReason?: string;
  interestedProduct: string;
  vpCode?: string;
  assignedStaff: string;
  estimatedValue: number;
  priority: "Low" | "Medium" | "High" | "Urgent";
  status: "New" | "Contacted" | "Interested" | "Follow-up" | "Converted" | "Lost";
  followUpDate?: string;
  notes?: string;
  convertedInvoiceNumber?: string;
  timeline: ILeadTimeline[];
}

const TimelineSchema = new Schema({
  date: { type: Date, default: Date.now },
  action: { type: String, required: true },
  notes: { type: String, default: "" },
  staff: { type: String, default: "Sales Team" },
});

const LeadSchema = new Schema<ILead>(
  {
    leadId: { type: String, required: true, unique: true, index: true },
    customerName: { type: String, required: true, index: true },
    mobile: { type: String, required: true, index: true },
    email: { type: String, default: "" },
    source: { type: String, default: "Walk-in Store" },
    walkInReason: { type: String, default: "" },
    interestedProduct: { type: String, required: true },
    vpCode: { type: String, default: "" },
    assignedStaff: { type: String, default: "Amit Singh" },
    estimatedValue: { type: Number, default: 0 },
    priority: {
      type: String,
      enum: ["Low", "Medium", "High", "Urgent"],
      default: "Medium",
    },
    status: {
      type: String,
      enum: ["New", "Contacted", "Interested", "Follow-up", "Converted", "Lost"],
      default: "New",
      index: true,
    },
    followUpDate: { type: String },
    notes: { type: String, default: "" },
    convertedInvoiceNumber: { type: String },
    timeline: [TimelineSchema],
  },
  { timestamps: true, collection: "leads" }
);

if (mongoose.models.Lead) {
  delete mongoose.models.Lead;
}
const Lead: Model<ILead> = mongoose.model<ILead>("Lead", LeadSchema);
export default Lead;
