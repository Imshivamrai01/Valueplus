import mongoose, { Schema, Document, Model } from "mongoose";

export interface IStaffTask extends Document {
  taskTitle: string;
  assignedStaff: string;
  assignedStaffId?: string;
  priority: "Low" | "Medium" | "High" | "Urgent";
  dueDate: string;
  dueTime?: string;
  description: string;
  reminder?: boolean;
  status: "Pending" | "In Progress" | "Completed" | "Overdue";
  createdBy: string;
  completedAt?: Date;
  notes?: string;
}

const StaffTaskSchema = new Schema<IStaffTask>(
  {
    taskTitle: { type: String, required: true },
    assignedStaff: { type: String, required: true, index: true },
    assignedStaffId: { type: String },
    priority: {
      type: String,
      enum: ["Low", "Medium", "High", "Urgent"],
      default: "Medium",
    },
    dueDate: { type: String, required: true, index: true },
    dueTime: { type: String, default: "18:00" },
    description: { type: String, default: "" },
    reminder: { type: Boolean, default: false },
    status: {
      type: String,
      enum: ["Pending", "In Progress", "Completed", "Overdue"],
      default: "Pending",
      index: true,
    },
    createdBy: { type: String, default: "Admin" },
    completedAt: { type: Date },
    notes: { type: String, default: "" },
  },
  { timestamps: true, collection: "staff_tasks" }
);

if (mongoose.models.StaffTask) {
  delete mongoose.models.StaffTask;
}
const StaffTask: Model<IStaffTask> = mongoose.model<IStaffTask>("StaffTask", StaffTaskSchema);
export default StaffTask;
