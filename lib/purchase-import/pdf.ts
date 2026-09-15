// Must come before the `pdf-parse` import below — this registers pdf-parse's
// own worker/canvas setup that its underlying pdfjs-dist engine needs. Without
// it, pdfjs-dist reaches for the browser's DOMMatrix/DOMPoint/DOMRect globals
// for its text-transform math and there's nothing in Node to answer ("DOMMatrix
// is not defined"). This is pdf-parse's own documented fix for Node/serverless
// use, not a hand-rolled polyfill — see its Next.js/Vercel troubleshooting
// guide. `next.config.mjs`'s `serverExternalPackages` must also list
// "@napi-rs/canvas" alongside "pdf-parse", or webpack bundling this package
// for the server route can still leave CanvasFactory unable to resolve it.
import { CanvasFactory } from "pdf-parse/worker";
import { PDFParse } from "pdf-parse";
import { extractEmbeddedCode } from "./match-item";

/**
 * Break one extracted text line into cells resolveRows() can read as
 * name / quantity / rate / amount.
 *
 *   "LED TV 43 inch    5    20,000.00    100,000.00"  -> multi-space gaps
 *   "LED TV 43 inch 5 20000 100000"                    -> trailing numbers
 */
function splitPdfTextLine(line: string): string[] {
  // pdf-parse/pdfjs itself inserts a real tab between two text runs it saw as
  // separate columns (a wide x-gap in the PDF's own layout) — when a tab
  // survived, it's a far more reliable column boundary than anything this
  // function could guess from whitespace or trailing numbers, and it holds
  // even when the PDF's column ORDER isn't left-to-right the way a normal
  // Name-Qty-Rate-Amount sheet would read (a real supplier invoice was seen
  // to extract its line-item row as Amount ... Qty Description S.No, right
  // to left, because that's the order its own content stream drew them in).
  if (line.includes("\t")) {
    const cells: string[] = [];
    for (const raw of line.split("\t")) {
      const cell = raw.trim();
      if (!cell) continue;
      // Two columns that sit close together in the PDF (e.g. Qty right next
      // to Taxable Value) can land in the same tab-cell separated by just a
      // space instead of a tab — split those back into two cells so each
      // number is still its own column.
      const twoNumbers = cell.match(/^(-?[\d,]+\.?\d*)\s+(-?[\d,]+\.?\d*)$/);
      if (twoNumbers) {
        cells.push(twoNumbers[1], twoNumbers[2]);
      } else {
        cells.push(cell);
      }
    }
    if (cells.length >= 2) return cells;
  }

  const byGaps = line.split(/\s{2,}/).map((c) => c.trim()).filter(Boolean);
  if (byGaps.length >= 2) return byGaps;

  // Lookbehind/lookahead keep this from matching the "14" inside a model
  // number like "M14" — only a token with no letter directly touching it
  // counts as a quantity/rate/amount. matchAll (not match) is used so each
  // hit keeps its position in the string — a plain string search for "where
  // does the last number start" would find the FIRST occurrence of that same
  // digit sequence if it also appears earlier in the line (a quantity "2"
  // reappearing inside a later price, for instance), slicing the name in the
  // wrong place.
  const numberToken = /(?<![A-Za-z])-?[\d,]+\.?\d*(?![A-Za-z])/g;
  const matches = [...line.matchAll(numberToken)];
  if (matches.length === 0) return [line];

  // A product description often carries its own standalone number — "55
  // Inch", "1.5 Ton" — indistinguishable from a real qty/rate/amount by value
  // alone. Only the trailing run is trusted to be the numeric columns; taking
  // the name up to where THAT run starts (not the position of the very last
  // number substring) is what keeps an earlier "55" inside the name instead
  // of truncating everything after it.
  const trailingCount = Math.min(matches.length, 3);
  const firstTrailing = matches[matches.length - trailingCount];
  const name = line.slice(0, firstTrailing.index).trim();
  const trailing = matches.slice(-trailingCount).map((m) => m[0]);

  return name ? [name, ...trailing] : [line];
}

/**
 * Read a PDF into the same kind of raw grid extractRowsFromExcel() produces,
 * so both feed the identical resolveRows() logic.
 *
 * Only text-based PDFs are supported — a scanned or photographed invoice has
 * no text layer for pdf-parse to read, and this deliberately does not fall
 * back to OCR (that belongs to a different, paid extraction path, not this
 * free one). `usedTableExtraction: false` tells the caller which case this
 * was, so the UI can say plainly that a scanned document isn't supported
 * rather than silently returning nothing.
 */
export async function extractRowsFromPdf(
  buffer: Buffer
): Promise<{ grid: string[][]; serialGrid: string[][]; usedTableExtraction: boolean; rawText: string }> {
  const parser = new PDFParse({ data: buffer, CanvasFactory });

  try {
    // A real table structure, when pdf-parse can find one, is far more
    // reliable than guessing columns from flat text — column boundaries are
    // taken from the PDF's own layout instead of inferred from whitespace.
    const tableResult = await parser.getTable();
    const tables = tableResult.mergedTables || [];

    // A multi-page supplier invoice can carry a second table listing one row
    // per physical unit's serial/IMEI number (see SERIAL NUMBER DETAILS in
    // the sample invoice) — that table must not compete with the line-items
    // table for "biggest", or it either wins and replaces the real line items,
    // or loses and gets silently discarded. Pull it out by its header first.
    const serialGrid =
      tables.find((t) => (t[0] || []).some((cell) => /serial/i.test(String(cell || "")))) || [];
    const lineItemTables = serialGrid.length ? tables.filter((t) => t !== serialGrid) : tables;

    const biggest = lineItemTables.reduce<string[][] | null>((best, t) => {
      if (!best || t.length > best.length) return t;
      return best;
    }, null);

    if (biggest && biggest.length >= 2 && biggest[0].length >= 2) {
      return { grid: biggest, serialGrid, usedTableExtraction: true, rawText: "" };
    }

    // No usable table — fall back to line-by-line text. resolveRows() still
    // needs the numbers split into their own cells to find quantity and rate,
    // so each line is split here before handing it over: first by wherever
    // the PDF's own multi-space column gaps survived extraction, and where a
    // line came through as one unbroken run of text, by peeling the trailing
    // numeric tokens (qty / rate / amount) off the end of it instead.
    const textResult = await parser.getText();
    const lines = (textResult.text || "")
      .split("\n")
      .map((l) => l.trim())
      .filter(Boolean);

    // A "SERIAL NUMBER DETAILS" section (one line per physical unit, not a
    // line item) sits after the item table on a multi-page invoice — its
    // lines still carry the same embedded product code a real item line
    // does, so left in with the rest they get parsed as extra, bogus line
    // items instead of being recognised as serial data. Splitting them out
    // here keeps them out of the line-item grid entirely.
    const serialMarkerIdx = lines.findIndex((l) => /serial\s*number\s*details/i.test(l));
    const itemLines = serialMarkerIdx === -1 ? lines : lines.slice(0, serialMarkerIdx);
    const serialSectionLines = serialMarkerIdx === -1 ? [] : lines.slice(serialMarkerIdx + 1);

    const grid = itemLines.map((line) => splitPdfTextLine(line));

    // Column positions in this section aren't reliable as flat text (the
    // same reversed/merged-cell issue the item table has), so each unit's
    // serial is pulled straight off its "S/R : <value>" marker and matched
    // to a product by the embedded code on the same line, instead of trying
    // to align it to the section's own header cell-by-cell.
    let textSerialGrid: string[][] = [];
    const serialEntries = serialSectionLines
      .map((line) => {
        const serialMatch = line.match(/S\/?R\s*:\s*([A-Za-z0-9]+)/i);
        const code = extractEmbeddedCode(line);
        return serialMatch && code ? { code, serial: serialMatch[1] } : null;
      })
      .filter((e): e is { code: string; serial: string } => e !== null);
    if (serialEntries.length > 0) {
      textSerialGrid = [["Description", "Serial Number"], ...serialEntries.map((e) => [e.code, e.serial])];
    }

    return { grid, serialGrid: textSerialGrid, usedTableExtraction: false, rawText: textResult.text || "" };
  } finally {
    await parser.destroy();
  }
}
