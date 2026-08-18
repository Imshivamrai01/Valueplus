import mongoose, { Schema, Document, Model } from "mongoose";

export interface IAttendance extends Document {
  staffName: string;
  staffId?: string;
  staffEmail?: string;
  date: string;
  checkInTime: string;
  checkOutTime?: string;
  workingDurationMinutes?: number;
  status: "Present" | "Late" | "Half-Day" | "Absent" | "On Leave";
  notes?: string;
}

const AttendanceSchema = new Schema<IAttendance>(
  {
    staffName: { type: String, required: true, index: true },
    staffId: { type: String },
    staffEmail: { type: String },
    date: { type: String, required: true, index: true },
    checkInTime: { type: String, required: true },
    checkOutTime: { type: String },
    workingDurationMinutes: { type: Number, default: 0 },
    status: {
      type: String,
      enum: ["Present", "Late", "Half-Day", "Absent", "On Leave"],
      default: "Present",
      index: true,
    },
    notes: { type: String, default: "" },
  },
  { timestamps: true, collection: "attendance" }
);

// Ensure one record per staff per date
AttendanceSchema.index({ staffName: 1, date: 1 }, { unique: true });

if (mongoose.models.Attendance) {
  delete mongoose.models.Attendance;
}
const Attendance: Model<IAttendance> = mongoose.model<IAttendance>("Attendance", AttendanceSchema);
export default Attendance;
