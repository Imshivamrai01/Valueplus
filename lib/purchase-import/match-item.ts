/**
 * Match one parsed row's product name against the existing Item catalog.
 *
 * Matching is deliberately conservative — an exact code match, or a name
 * match once both sides are lower-cased and stripped of punctuation. Fuzzy
 * "close enough" matching was left out on purpose: silently attaching a
 * purchase to the wrong existing product would move stock and cost onto that
 * product's record, which is worse than asking the admin to link an
 * unmatched row by hand in the preview screen.
 */

function normaliseName(value: string): string {
  return String(value || "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

// Some suppliers quote our own VP code back to us embedded inside a longer
// description — e.g. "VP0011286 - HFC-320DPW4- HAIER" — rather than as the
// whole cell. Pulling that token out gives an exact-match-quality signal
// without requiring the entire cell to equal the code.
export function extractEmbeddedCode(text: string): string | null {
  const match = String(text || "").match(/\bVP-?[A-Z0-9]{3,}\b/i);
  return match ? match[0].toUpperCase() : null;
}

export function findMatchingItem(rowName: string, items: any[]): any | null {
  const normalised = normaliseName(rowName);
  if (!normalised) return null;

  const raw = String(rowName || "").trim().toLowerCase();

  // Exact code / VP code hit first — the least ambiguous signal available.
  const byCode = items.find(
    (it) => it.code?.toLowerCase() === raw || it.vpCode?.toLowerCase() === raw
  );
  if (byCode) return byCode;

  // A VP code embedded inside a longer description is just as unambiguous as
  // a whole-cell match — it just needs pulling out first.
  const embedded = extractEmbeddedCode(rowName);
  if (embedded) {
    const byEmbeddedCode = items.find(
      (it) => it.code?.toUpperCase() === embedded || it.vpCode?.toUpperCase() === embedded
    );
    if (byEmbeddedCode) return byEmbeddedCode;
  }

  const byExactName = items.find((it) => normaliseName(it.name) === normalised);
  if (byExactName) return byExactName;

  // A row name that contains the full item name, or vice versa — catches
  // "Samsung 43 Inch LED TV (2024)" matching a master item just named
  // "Samsung 43 Inch LED TV" without guessing across unrelated products.
  const byContains = items.find((it) => {
    const itemName = normaliseName(it.name);
    if (!itemName) return false;
    // A short name on either side ("TV", "SIM") would match almost anything
    // as a substring, so containment only counts once the shorter of the two
    // names is specific enough to mean something on its own.
    const shorterLength = Math.min(itemName.length, normalised.length);
    if (shorterLength < 8) return false;
    return normalised.includes(itemName) || itemName.includes(normalised);
  });
  return byContains || null;
}
