import mongoose, { Schema, Document, Model } from "mongoose";

export interface IDayClose extends Document {
  date: string; // YYYY-MM-DD, one record per business day
  openingCash: number;
  /** Snapshot of the cash-register's computed balance at the moment of closing —
   *  what the system expects the drawer to hold, for comparison against the
   *  physical count below. */
  systemExpectedCash: number;
  countedCash: number;
  difference: number;
  notes?: string;
  closedBy: string;
  closedByRole?: string;
  closedAt: string;
}

const DayCloseSchema = new Schema<IDayClose>(
  {
    date: { type: String, required: true, unique: true },
    openingCash: { type: Number, default: 0 },
    systemExpectedCash: { type: Number, required: true },
    countedCash: { type: Number, required: true },
    difference: { type: Number, required: true },
    notes: { type: String, default: "" },
    closedBy: { type: String, required: true },
    closedByRole: { type: String, default: "" },
    closedAt: { type: String, required: true },
  },
  { timestamps: true, collection: "day_closes" }
);

const DayClose: Model<IDayClose> = mongoose.models.DayClose || mongoose.model<IDayClose>("DayClose", DayCloseSchema);
export default DayClose;
