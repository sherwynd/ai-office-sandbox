import { test } from "node:test";
import assert from "node:assert/strict";
import { calculateTip as ok, MESSAGES, initialState, update, view, filterInput } from "./tip.js";

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

test("fresh state is blank with 1 person and shows only the hint (AC-2, AC-19)", () => {
  const v = view(initialState());
  assert.equal(v.result, null);
  assert.equal(v.shownError, null);
  assert.equal(v.hint, true);
  assert.equal(v.applied, "");
  assert.equal(initialState().people, "1");
});

test("tapping a quick tip on an empty bill shows no error (AC-2)", () => {
  const v = view(update(initialState(), { quick: "15" }));
  assert.equal(v.shownError, null);
  assert.equal(v.hint, true);
  assert.equal(v.applied, "Applied tip: 15%");
});

test("bill with no tip asks for a tip under the tip group (AC-15)", () => {
  const v = view(update(initialState(), { bill: "80" }));
  assert.equal(v.shownError.field, "tip");
  assert.equal(v.result, null);
});

test("custom and quick replace each other (AC-4, AC-5)", () => {
  let s = update(update(initialState(), { bill: "50" }), { quick: "15" });
  s = update(s, { custom: "12.5" });
  assert.equal(s.quick, "");
  let v = view(s);
  assert.equal(v.result.tip, "6.25");
  assert.equal(v.result.total, "56.25");
  assert.equal(v.applied, "Applied tip: 12.5% (custom)");
  s = update(s, { quick: "20" });
  assert.equal(s.custom, "");
  v = view(s);
  assert.equal(v.result.tip, "10.00");
  assert.equal(v.applied, "Applied tip: 20%");
});

test("clearing the bill shows the message, fixing it brings results back (AC-10, AC-16)", () => {
  let s = update(update(update(initialState(), { bill: "80" }), { quick: "15" }), { people: "4" });
  assert.equal(view(s).result.perPerson, "23.00");
  s = update(s, { bill: "" });
  let v = view(s);
  assert.equal(v.shownError.field, "bill");
  assert.equal(v.result, null);
  assert.equal(v.fix, true);
  s = update(s, { bill: "80" });
  v = view(s);
  assert.equal(v.shownError, null);
  assert.equal(v.result.perPerson, "23.00");
});

test("a custom tip typed as '12.' is shown as 12%", () => {
  const v = view(update(update(initialState(), { bill: "80" }), { custom: "12." }));
  assert.equal(v.applied, "Applied tip: 12% (custom)");
});

test("an invalid custom tip hides the applied line (AC-14)", () => {
  const v = view(update(update(initialState(), { bill: "80" }), { custom: "-3" }));
  assert.equal(v.shownError.field, "custom");
  assert.equal(v.applied, "");
});

test("an invalid custom tip hides the applied line even with a blank bill (AC-5)", () => {
  for (const bad of ["-3", "abc"]) {
    const v = view(update(initialState(), { custom: bad }));
    assert.equal(v.applied, "", bad);
    assert.equal(v.shownError, null, bad);
  }
});

test("filterInput keeps only allowed characters (AC-21)", () => {
  assert.equal(filterInput("8a0", "decimal"), "80");
  assert.equal(filterInput("1.2.3", "decimal"), "1.23");
  assert.equal(filterInput("$1,250.75", "decimal"), "1250.75");
  assert.equal(filterInput("-5", "decimal"), "5");
  assert.equal(filterInput("+ 5", "decimal"), "5");
  assert.equal(filterInput(".", "decimal"), ".");
  assert.equal(filterInput("12.", "decimal"), "12.");
  assert.equal(filterInput("2x", "whole"), "2");
  assert.equal(filterInput("1.5", "whole"), "15");
  assert.equal(filterInput("-3", "whole"), "3");
  assert.equal(filterInput("", "whole"), "");
  assert.equal(filterInput("80", "decimal"), "80");
});
