// Tip maths in integer cents (BigInt), so there are no floating-point surprises.
// Shared by the page (served at /tip.js) and the tests.

export const MESSAGES = {
  bill: "Please enter a bill amount of 0 or more.",
  tip: "Pick a tip or type your own percentage.",
  custom: "Please enter a tip percentage of 0 or more.",
  people: "Please enter a whole number of people, 1 or more.",
};

// "12.5" -> { n: 125n, d: 10n }; anything else (negative, 1e5, text, blank) -> null
function parseDecimal(text) {
  const s = String(text ?? "").trim();
  if (!/^(\d+\.?\d*|\.\d+)$/.test(s)) return null;
  const [whole = "", frac = ""] = s.split(".");
  return { n: BigInt(whole + frac), d: 10n ** BigInt(frac.length) };
}

const roundHalfUp = (n, d) => (2n * n + d) / (2n * d);
const ceilDiv = (n, d) => (n + d - 1n) / d;
const money = (cents) => `${cents / 100n}.${String(cents % 100n).padStart(2, "0")}`;

// bill, percent (the applied tip, "" when none), people: raw text from the page.
// Returns { error: { field, message } } or { tip, total, perPerson } as "0.00" strings.
export function calculateTip(bill, percent, people) {
  const b = parseDecimal(bill);
  if (!b) return { error: { field: "bill", message: MESSAGES.bill } };
  if (String(percent ?? "").trim() === "") return { error: { field: "tip", message: MESSAGES.tip } };
  const p = parseDecimal(percent);
  if (!p) return { error: { field: "custom", message: MESSAGES.custom } };
  const count = /^\s*\d+\s*$/.test(String(people ?? "")) ? BigInt(String(people).trim()) : 0n;
  if (count < 1n) return { error: { field: "people", message: MESSAGES.people } };

  const billCents = roundHalfUp(b.n * 100n, b.d);
  const tipCents = roundHalfUp(billCents * p.n, 100n * p.d);
  const totalCents = billCents + tipCents;
  return { tip: money(tipCents), total: money(totalCents), perPerson: money(ceilDiv(totalCents, count)) };
}
