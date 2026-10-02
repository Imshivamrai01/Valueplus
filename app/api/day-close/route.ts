import { NextResponse } from "next/server";
import connectToDatabase from "@/lib/db";
import DayClose from "@/models/DayClose";
import { getCashRegisterSummary } from "@/lib/cashRegister";

function toDateStr(d: Date): string {
  return d.toISOString().split("T")[0];
}

function addDays(dateStr: string, days: number): string {
  const d = new Date(dateStr + "T00:00:00.000Z");
  d.setUTCDate(d.getUTCDate() + days);
  return toDateStr(d);
}

/** The earliest past business day with no DayClose record yet, or null if
 *  everything up to yesterday is already closed. Skipping more than one
 *  night naturally pushes this back further rather than just nagging about
 *  the latest day — nothing gets forgotten. */
async function getPendingDate(): Promise<string | null> {
  const todayStr = toDateStr(new Date());
  const yesterdayStr = addDays(todayStr, -1);

  const latest = await DayClose.findOne({}).sort({ date: -1 });
  if (!latest) return yesterdayStr;
  if (latest.date >= yesterdayStr) return null;
  return addDays(latest.date, 1);
}

export async function GET(req: Request) {
  try {
    await connectToDatabase();
    const pendingDate = await getPendingDate();
    return NextResponse.json({ success: true, data: { pendingDate } });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    await connectToDatabase();

    const pendingDate = await getPendingDate();
    if (!pendingDate) {
      return NextResponse.json({ success: false, error: "No day-close is pending right now." }, { status: 400 });
    }

    const countedCash = Number(body.countedCash);
    if (!Number.isFinite(countedCash) || countedCash < 0) {
      return NextResponse.json({ success: false, error: "A valid counted cash amount is required." }, { status: 400 });
    }

    const summary = await getCashRegisterSummary();
    const systemExpectedCash = summary.currentBalance;

    const previous = await DayClose.findOne({}).sort({ date: -1 });
    const openingCash = previous ? previous.countedCash : summary.baseOpening;

    const record = await DayClose.create({
      date: pendingDate,
      openingCash,
      systemExpectedCash,
      countedCash,
      difference: countedCash - systemExpectedCash,
      notes: body.notes || "",
      closedBy: body.closedBy || "Admin / Cashier",
      closedAt: new Date().toISOString(),
    });

    return NextResponse.json({ success: true, message: `Day-close for ${pendingDate} recorded.`, data: record });
  } catch (error: any) {
    if (error.code === 11000) {
      return NextResponse.json({ success: false, error: "That day has already been closed." }, { status: 400 });
    }
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
