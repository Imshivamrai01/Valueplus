import { NextResponse } from "next/server";
import connectToDatabase from "@/lib/db";
import Item from "@/models/Item";
import { getActor } from "@/lib/requirePermission";
import { extractRowsFromExcel } from "@/lib/purchase-import/excel";
import { extractRowsFromPdf } from "@/lib/purchase-import/pdf";
import { resolveRows } from "@/lib/purchase-import/resolve-rows";
import { findMatchingItem } from "@/lib/purchase-import/match-item";

/**
 * Parse an uploaded Excel/CSV or PDF purchase sheet into a preview — never
 * writes anything. The admin reviews and edits the returned rows in the UI;
 * only a later, separate save (through the existing purchase-entry flow)
 * touches the database.
 */

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10 MB
const EXCEL_EXTENSIONS = [".xlsx", ".xls", ".csv"];
const PDF_EXTENSION = ".pdf";

export async function POST(req: Request) {
  const actor = await getActor();
  if (!actor) {
    return NextResponse.json({ success: false, error: "You must be signed in to do this." }, { status: 401 });
  }
  // Matches who can already create a purchase entry / add a product.
  if (!["admin", "superadmin", "manager", "warehouse"].includes(actor.role)) {
    return NextResponse.json(
      { success: false, error: "Only an admin or manager can import a purchase sheet." },
      { status: 403 }
    );
  }

  try {
    const form = await req.formData();
    const file = form.get("file");

    if (!file || !(file instanceof File)) {
      return NextResponse.json({ success: false, error: "No file was uploaded." }, { status: 400 });
    }
    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json({ success: false, error: "File is larger than 10 MB." }, { status: 400 });
    }

    const name = file.name.toLowerCase();
    const isExcel = EXCEL_EXTENSIONS.some((ext) => name.endsWith(ext));
    const isPdf = name.endsWith(PDF_EXTENSION);

    if (!isExcel && !isPdf) {
      return NextResponse.json(
        { success: false, error: "Upload an Excel (.xlsx, .xls, .csv) or PDF file." },
        { status: 400 }
      );
    }

    const buffer = Buffer.from(await file.arrayBuffer());

    let grid: string[][];
    let sourceType: "excel" | "pdf" = "excel";
    let usedTableExtraction = true;
    let pdfHadNoText = false;

    if (isExcel) {
      grid = extractRowsFromExcel(buffer);
    } else {
      sourceType = "pdf";
      const result = await extractRowsFromPdf(buffer);
      grid = result.grid;
      usedTableExtraction = result.usedTableExtraction;
      pdfHadNoText = !result.rawText && !result.usedTableExtraction && grid.length === 0;
    }

    if (pdfHadNoText) {
      return NextResponse.json({
        success: false,
        error:
          "No readable text found in this PDF. A scanned or photographed invoice has no text layer this can read — try the Excel upload instead, or type the bill in manually.",
      });
    }

    const parsedRows = resolveRows(grid);

    if (parsedRows.length === 0) {
      return NextResponse.json({
        success: false,
        error: "No product rows could be found in this file. Check the file and try again.",
      });
    }

    await connectToDatabase();
    const allItems = await Item.find(
      {},
      { name: 1, code: 1, vpCode: 1, purchasePrice: 1, gstRate: 1, category: 1, brand: 1 }
    ).lean();

    const rows = parsedRows.map((row) => {
      const matched = findMatchingItem(row.name, allItems);
      return {
        ...row,
        matchedItem: matched
          ? {
              _id: String(matched._id),
              code: matched.code,
              vpCode: matched.vpCode,
              name: matched.name,
              category: matched.category,
              brand: matched.brand,
              gstRate: matched.gstRate,
            }
          : null,
      };
    });

    const matchedCount = rows.filter((r) => r.matchedItem).length;

    return NextResponse.json({
      success: true,
      data: {
        rows,
        meta: {
          sourceType,
          usedTableExtraction,
          totalRows: rows.length,
          matchedCount,
          newCount: rows.length - matchedCount,
          lowConfidenceCount: rows.filter((r) => r.lowConfidence).length,
        },
      },
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || "Could not read this file." },
      { status: 500 }
    );
  }
}
