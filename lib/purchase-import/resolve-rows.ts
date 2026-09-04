/**
 * Turns a raw grid of cells — from an Excel sheet or a PDF table — into
 * structured purchase-entry rows.
 *
 * Both source formats end up as the same shape (`string[][]`, one array per
 * row) before reaching this file, so a supplier's Excel sheet and their PDF
 * invoice go through identical column-detection and row-building logic. Only
 * how the grid is produced differs (see excel.ts and pdf.ts).
 */

export interface ParsedPurchaseRow {
  /** 1-based row number in the source file, for the admin to trace a mistake back. */
  sourceRow: number;
  name: string;
  quantity: number;
  rate: number;
  gstRate: number;
  hsn?: string;
  amount?: number;
  /** True when the row's own qty*rate doesn't reasonably match its amount column
   *  (when one was present) — a signal the row is worth a second look. */
  lowConfidence: boolean;
  /** What this row looked like before parsing, shown in the preview on request. */
  rawCells: string[];
}

const HEADER_KEYWORDS = {
  name: ["item", "product", "description", "particular", "goods", "material", "name"],
  quantity: ["qty", "quantity", "units", "nos", "no."],
  rate: ["rate", "price", "unit price", "unit rate", "unitprice"],
  gst: ["gst", "tax%", "tax %", "igst", "cgst", "gst%", "gst %"],
  hsn: ["hsn", "sac"],
  amount: ["amount", "total", "value", "net amt", "line total"],
} as const;

type ColumnRole = keyof typeof HEADER_KEYWORDS;

/** Strip currency symbols, commas and stray whitespace, then parse a number. */
function toNumber(raw: string | undefined): number {
  if (!raw) return 0;
  const cleaned = String(raw).replace(/[₹,]/g, "").replace(/[^\d.\-]/g, "");
  const n = parseFloat(cleaned);
  return isNaN(n) ? 0 : n;
}

function normaliseHeader(cell: string): string {
  return String(cell || "").toLowerCase().trim();
}

/** Does this row look like a header row rather than data? */
function looksLikeHeader(row: string[]): boolean {
  const joined = row.map(normaliseHeader).join(" ");
  let hits = 0;
  for (const keywords of Object.values(HEADER_KEYWORDS)) {
    if (keywords.some((k) => joined.includes(k))) hits += 1;
  }
  return hits >= 2;
}

/** Map each column index to the role its header text suggests, if any. */
function detectColumns(headerRow: string[]): Partial<Record<ColumnRole, number>> {
  const map: Partial<Record<ColumnRole, number>> = {};
  headerRow.forEach((cell, idx) => {
    const text = normaliseHeader(cell);
    if (!text) return;
    for (const [role, keywords] of Object.entries(HEADER_KEYWORDS) as [ColumnRole, readonly string[]][]) {
      if (map[role] !== undefined) continue;
      if (keywords.some((k) => text.includes(k))) {
        map[role] = idx;
      }
    }
  });
  return map;
}

/**
 * Lines that are obviously not a product row — invoice chrome, not goods.
 *
 * Every alternative ends in `\b`, a word boundary. Without it, a bare prefix
 * match on "total" also matched "Totally New Product" and "pan" matched
 * "Panasonic" — real product rows silently vanishing with no indication why.
 * `\b` only fires between a word character and a non-word one, so "total"
 * matches "Total" and "Total:" but not "Totally", and "pan" matches "PAN No:"
 * but not "Panasonic".
 */
const SKIP_LINE_PATTERN =
  /^(sr\.?\s*no\.?\b|s\.?\s*no\.?\b|total\b|sub\s*-?\s*total\b|grand\s*total\b|tax\b|gst\b|cgst\b|sgst\b|igst\b|invoice\b|bill\b|date\b|gstin\b|pan\b|terms\b|amount in words|declaration\b|signature\b|page \d)/i;

export interface ResolveOptions {
  /** Fallback GST rate when no column supplies one. */
  defaultGstRate?: number;
}

/**
 * Build structured rows from a raw grid.
 *
 * If the first row reads as a header, its columns are located by keyword and
 * every following row is mapped through them. If nothing reads as a header —
 * common for a PDF table with no captured header, or a bare data dump — a
 * fixed left-to-right guess (name, qty, rate, gst) is used instead, and every
 * row is marked low-confidence so the preview screen highlights it for a
 * closer look rather than presenting a guess as a fact.
 */
export function resolveRows(grid: string[][], options: ResolveOptions = {}): ParsedPurchaseRow[] {
  const defaultGst = options.defaultGstRate ?? 18;
  const rows = grid
    .map((r) => (r || []).map((c) => String(c ?? "").trim()))
    .filter((r) => r.some((c) => c.length > 0));

  if (rows.length === 0) return [];

  const firstRowIsHeader = looksLikeHeader(rows[0]);
  const columns = firstRowIsHeader ? detectColumns(rows[0]) : {};
  const dataRows = firstRowIsHeader ? rows.slice(1) : rows;
  const startIndex = firstRowIsHeader ? 2 : 1;

  const nameCol = columns.name ?? 0;
  const qtyCol = columns.quantity;
  const rateCol = columns.rate;
  const gstCol = columns.gst;
  const hsnCol = columns.hsn;
  const amountCol = columns.amount;

  const results: ParsedPurchaseRow[] = [];

  dataRows.forEach((row, i) => {
    const sourceRow = startIndex + i;
    const name = (row[nameCol] || "").trim();
    if (!name || SKIP_LINE_PATTERN.test(name)) return;
    // A row that is entirely numeric in its first cell is almost always a
    // stray total/subtotal line that slipped past the keyword filter.
    if (/^[\d.,₹\s\-]+$/.test(name)) return;
    // Fewer than 3 letters isn't a product name — page-footer fragments like
    // "-- 1 of 1 --" land here when a line has no other numeric structure to
    // flag it as chrome.
    if ((name.match(/[a-zA-Z]/g) || []).length < 3) return;
    // No header row was found for the WHOLE grid (common for a PDF with no
    // captured table), so a repeated column-heading line — "Item Description
    // Qty Rate Amount" — reads as an ordinary data row unless it's checked
    // here too, not just against row 0.
    if (!firstRowIsHeader && looksLikeHeader(row)) return;

    let quantity = qtyCol !== undefined ? toNumber(row[qtyCol]) : 0;
    let rate = rateCol !== undefined ? toNumber(row[rateCol]) : 0;
    const amount = amountCol !== undefined ? toNumber(row[amountCol]) : undefined;
    const gstRate = gstCol !== undefined ? toNumber(row[gstCol]) || defaultGst : defaultGst;
    const hsn = hsnCol !== undefined ? (row[hsnCol] || "").trim() : undefined;

    let lowConfidence = !firstRowIsHeader;

    // Neither a quantity nor a rate column was found — recover them from
    // whatever numeric cells the row has. The count of numbers decides the
    // reading: three trailing numbers on an invoice line are conventionally
    // qty, rate, amount — the LAST one is the derived total, not a second
    // price, so taking the final two ([rate, amount]) as [qty, rate] read a
    // ₹90,000 line item as "45,000 units at ₹90,000 each". Two numbers means
    // no amount column exists, so they are read as [qty, rate] directly.
    if (!qtyCol && !rateCol) {
      const numericCells = row.map(toNumber).filter((n, idx) => idx !== nameCol && n > 0);
      if (numericCells.length >= 3) {
        [quantity, rate] = numericCells.slice(-3, -1);
      } else if (numericCells.length === 2) {
        [quantity, rate] = numericCells;
      } else if (numericCells.length === 1) {
        quantity = 1;
        rate = numericCells[0];
      }
      // This whole branch is a guess made with no column headers to anchor
      // it, so every row through it is flagged for a look regardless of how
      // clean the numbers seem.
      lowConfidence = true;
    } else if (!quantity && amount && rate) {
      quantity = Math.round((amount / rate) * 100) / 100;
    } else if (!rate && amount && quantity) {
      rate = Math.round((amount / quantity) * 100) / 100;
    }

    if (!quantity) quantity = 1;

    // A row whose declared amount disagrees with qty × rate by more than a
    // rounding margin is flagged, not rejected — the admin decides, this
    // never silently drops or "corrects" a number on its own.
    if (amount && rate && quantity) {
      const expected = quantity * rate;
      if (Math.abs(expected - amount) / Math.max(amount, 1) > 0.05) {
        lowConfidence = true;
      }
    }

    if (!(rate > 0)) lowConfidence = true;

    results.push({
      sourceRow,
      name,
      quantity: quantity || 1,
      rate: Math.round(rate * 100) / 100,
      gstRate,
      hsn: hsn || undefined,
      amount,
      lowConfidence,
      rawCells: row,
    });
  });

  return results;
}
