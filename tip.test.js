import { test } from "node:test";
import assert from "node:assert/strict";
import { calculateTip as ok, MESSAGES } from "./tip.js";

test("quick tip: 80 at 15% (AC-3)", () => {
  assert.deepEqual(ok("80", "15", "1"), { tip: "12.00", total: "92.00", perPerson: "92.00" });
  assert.equal(ok("80", "10", "1").tip, "8.00");
  assert.equal(ok("80", "20", "1").total, "96.00");
});

test("custom percentage: 50 at 12.5% (AC-4)", () => {
  const r = ok("50.00", "12.5", "1");
  assert.equal(r.tip, "6.25");
  assert.equal(r.total, "56.25");
});

test("even split does not gain a cent (AC-6, AC-8)", () => {
  assert.equal(ok("80", "15", "4").perPerson, "23.00");
});

test("uneven split rounds each share up to the next cent (AC-8)", () => {
  assert.equal(ok("100", "0", "3").perPerson, "33.34");
  assert.equal(ok("100", "0", "3").total, "100.00");
});

test("amounts always have two decimals (AC-7)", () => {
  const r = ok("10", "10", "1");
  assert.deepEqual([r.tip, r.total, r.perPerson], ["1.00", "11.00", "11.00"]);
  assert.equal(ok("0.5", "0", "1").total, "0.50");
});

test("half-cent amounts round up without float errors", () => {
  assert.equal(ok("0.10", "5", "1").tip, "0.01");
  assert.equal(ok("1.005", "0", "1").total, "1.01");
});

test("blank, negative or non-numeric bill is rejected (AC-10, AC-11)", () => {
  for (const bill of ["", "  ", "-5", "abc", "1e5", "1,5", "NaN", "Infinity"]) {
    assert.deepEqual(ok(bill, "15", "1").error, { field: "bill", message: MESSAGES.bill }, bill);
  }
});

test("a bill of zero is accepted (AC-12)", () => {
  assert.deepEqual(ok("0", "15", "1"), { tip: "0.00", total: "0.00", perPerson: "0.00" });
});

test("bad number of people is rejected (AC-13)", () => {
  for (const people of ["0", "-2", "", "1.5", "abc", "1e2"]) {
    assert.deepEqual(ok("80", "15", people).error, { field: "people", message: MESSAGES.people }, people);
  }
});

test("bad custom percentage is rejected, zero is accepted (AC-14)", () => {
  for (const pct of ["-3", "abc", "1e999"]) {
    assert.deepEqual(ok("80", pct, "1").error, { field: "custom", message: MESSAGES.custom }, pct);
  }
  assert.equal(ok("80", "0", "1").tip, "0.00");
});

test("no tip chosen asks for one (AC-15)", () => {
  assert.deepEqual(ok("80", "", "1").error, { field: "tip", message: MESSAGES.tip });
});

test("huge input never produces NaN, Infinity or negatives (AC-16)", () => {
  const r = ok("9".repeat(400), "15", "1");
  assert.doesNotMatch(JSON.stringify(r), /NaN|Infinity|-/);
});
