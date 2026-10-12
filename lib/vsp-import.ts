import * as XLSX from "xlsx";

/**
 * Brand price-list sheets (e.g. "LG Price List_Oct 26.xlsx") carry one tab per
 * product family. Each tab has a header row with a "Sap code" column, one or two
 * "Model" columns and a "New VSP" column. This reads every tab and matches its
 * rows to catalog products so that only their VSP is updated.
 *
 * The sheet's Sap code (VP0009918) is the brand's own number and does not match
 * the catalog's generated VP code (VP-DWXD9S7054), so a product is recognised by
 * its model number: the sheet says "55UA83006LA", the catalog names the product
 * "55UA83006LA.ATR-LG". Both are reduced to the base model before the first dot.
 */

export interface VspSheetRow {
  sheet: string;
  rowNumber: number;
  sapCode: string;
  /** Model as written in the sheet (the fullest form available). */
  model: string;
  /** Every base model this row can be recognised by. */
  modelKeys: string[];
  vsp: number;
}

export interface VspSheetNote {
  sheet: string;
  message: string;
}

const clean = (value: any) => String(value ?? "").replace(/\s+/g, " ").trim();

/** "GL-B257JPZ3.DSS" → "GLB257JPZ3": the model up to the first dot, letters and digits only. */
export function baseModelKey(value: any): string {
  const text = clean(value).toUpperCase();
  if (!text) return "";
  const beforeDot = text.split(".")[0];
  // A catalog name can carry words after the model ("ABC123 LG LED"); the model
  // itself never contains a space or a bracket.
  const firstToken = beforeDot.split(/[\s(]/)[0];
  return firstToken.replace(/[^A-Z0-9]/g, "");
}

function toNumber(value: any): number {
  if (typeof value === "number") return value;
  const n = Number(clean(value).replace(/[₹,\s]/g, ""));
  return Number.isFinite(n) ? n : NaN;
}

export function parseVspWorkbook(data: Buffer | ArrayBuffer | Uint8Array): { rows: VspSheetRow[]; notes: VspSheetNote[] } {
  const workbook = XLSX.read(data, { type: "buffer" });
  const rows: VspSheetRow[] = [];
  const notes: VspSheetNote[] = [];

  for (const sheet of workbook.SheetNames) {
    const grid: any[][] = XLSX.utils.sheet_to_json(workbook.Sheets[sheet], { header: 1, defval: "", blankrows: false });

    // The header is the first row that names both a model and a VSP column; a tab
    // without one is reported rather than guessed at.
    const headerIndex = grid.findIndex((r) => r.some((c) => /^model$/i.test(clean(c))));
    if (headerIndex < 0) {
      notes.push({ sheet, message: `Sheet "${sheet}" was skipped: it has no "Model" column.` });
      continue;
    }
    const header = grid[headerIndex].map(clean);
    const vspIndex = header.findIndex((c) => /\bvsp\b/i.test(c));
    if (vspIndex < 0) {
      notes.push({ sheet, message: `Sheet "${sheet}" was skipped: it has no "New VSP" column.` });
      continue;
    }
    const modelIndexes = header.map((c, i) => (/^model$/i.test(c) ? i : -1)).filter((i) => i >= 0);
    const sapIndex = header.findIndex((c) => /sap\s*code/i.test(c));

    for (let i = headerIndex + 1; i < grid.length; i++) {
      const row = grid[i];
      const models = modelIndexes.map((idx) => clean(row[idx])).filter(Boolean);
      if (models.length === 0) continue;
      // A header repeated further down the tab is not a product.
      if (models.every((m) => /^model$/i.test(m))) continue;

      const vsp = toNumber(row[vspIndex]);
      const model = models.slice().sort((a, b) => b.length - a.length)[0];
      if (!Number.isFinite(vsp) || vsp <= 0) {
        notes.push({ sheet, message: `${model} (sheet "${sheet}", row ${i + 1}) was skipped: it has no VSP value.` });
        continue;
      }

      const modelKeys = Array.from(new Set(models.map(baseModelKey).filter((k) => k.length >= 3)));
      if (modelKeys.length === 0) continue;

      const sapCode = sapIndex >= 0 ? clean(row[sapIndex]) : "";
      rows.push({
        sheet,
        rowNumber: i + 1,
        sapCode: /^[-–]?$/.test(sapCode) ? "" : sapCode,
        model,
        modelKeys,
        vsp: Math.round(vsp * 100) / 100,
      });
    }
  }

  return { rows, notes };
}

export interface VspMatchResult {
  /** Products whose VSP will change. */
  updates: { itemId: string; name: string; code: string; model: string; sheet: string; oldVsp: number; newVsp: number }[];
  /** Products found, already on this VSP. */
  unchanged: { itemId: string; name: string; model: string; sheet: string; vsp: number }[];
  /** Sheet rows with no product in the catalog. */
  notAdded: { model: string; sapCode: string; sheet: string; vsp: number; message: string }[];
  /** Sheet rows left out, with the reason. */
  skipped: { model: string; sheet: string; message: string }[];
}

export function matchVspRows(rows: VspSheetRow[], items: any[]): VspMatchResult {
  const itemsByModel = new Map<string, any[]>();
  const itemsByCode = new Map<string, any>();
  for (const item of items) {
    const key = baseModelKey(item.name);
    if (key) itemsByModel.set(key, [...(itemsByModel.get(key) || []), item]);
    for (const code of [item.code, item.vpCode]) {
      const c = clean(code).toUpperCase();
      if (c) itemsByCode.set(c, item);
    }
  }

  const result: VspMatchResult = { updates: [], unchanged: [], notAdded: [], skipped: [] };
  const decided = new Map<string, { vsp: number; sheet: string }>();

  for (const row of rows) {
    const matched = new Map<string, any>();
    const byCode = row.sapCode ? itemsByCode.get(row.sapCode.toUpperCase()) : null;
    if (byCode) matched.set(String(byCode._id), byCode);
    for (const key of row.modelKeys) {
      for (const item of itemsByModel.get(key) || []) matched.set(String(item._id), item);
    }

    if (matched.size === 0) {
      result.notAdded.push({
        model: row.model,
        sapCode: row.sapCode,
        sheet: row.sheet,
        vsp: row.vsp,
        message: `Product not added: ${row.model} is not in the product list, so its VSP was not updated.`,
      });
      continue;
    }

    for (const item of matched.values()) {
      const itemId = String(item._id);
      const earlier = decided.get(itemId);
      if (earlier) {
        // The same product listed twice: the first price in the sheet is kept and
        // the later one is reported, never silently applied over it.
        if (earlier.vsp !== row.vsp) {
          result.skipped.push({
            model: row.model,
            sheet: row.sheet,
            message: `${row.model} appears again in sheet "${row.sheet}" with VSP ${row.vsp}; the first value (${earlier.vsp}, sheet "${earlier.sheet}") was used.`,
          });
        }
        continue;
      }
      decided.set(itemId, { vsp: row.vsp, sheet: row.sheet });

      const oldVsp = Number(item.vsp) || 0;
      if (Math.abs(oldVsp - row.vsp) < 0.005) {
        result.unchanged.push({ itemId, name: item.name, model: row.model, sheet: row.sheet, vsp: row.vsp });
      } else {
        result.updates.push({
          itemId,
          name: item.name,
          code: item.code || item.vpCode || "",
          model: row.model,
          sheet: row.sheet,
          oldVsp,
          newVsp: row.vsp,
        });
      }
    }
  }

  return result;
}
