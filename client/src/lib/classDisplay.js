const ROMAN_NUMERALS = ["I", "II", "III", "IV", "V", "VI", "VII", "VIII", "IX", "X", "XI", "XII"];

/** @param {unknown} grade @returns {string | null} */
export function gradeToRoman(grade) {
  const numeric = typeof grade === "number" ? grade : Number(String(grade ?? "").trim());
  return Number.isInteger(numeric) && numeric >= 1 && numeric <= ROMAN_NUMERALS.length
    ? ROMAN_NUMERALS[numeric - 1]
    : null;
}

/** @param {unknown} value @returns {string} */
export function getClassDisplayName(value) {
  if (typeof value === "number") {
    const roman = gradeToRoman(value);
    return roman ? `Class ${roman}` : "Class unavailable";
  }
  const source = typeof value === "string" ? value.trim() : "";
  const match = source.match(/^(?:grade|class)\s*(\d+)$/i);
  if (match) {
    const roman = gradeToRoman(match[1]);
    if (roman) return `Class ${roman}`;
  }
  return source || "Class unavailable";
}

/** @param {unknown} section @returns {string | null} */
export function getSectionLabel(section) {
  if (typeof section !== "string") return null;
  const value = section.trim();
  return value ? `Section ${value}` : null;
}

/** @param {unknown} className @param {unknown} section @returns {string} */
export function formatClassLabel(className, section) {
  const name = getClassDisplayName(className);
  const sectionLabel = getSectionLabel(section);
  return sectionLabel ? `${name} · ${sectionLabel}` : name;
}
