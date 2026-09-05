import assert from "node:assert/strict";
import test from "node:test";
import { MagicLinkStore } from "../src/magic_link_store.js";

test("a current magic link reveals the dashboard exactly once", () => {
  const store = new MagicLinkStore();
  const now = Date.parse("2026-09-03T10:00:00Z");
  const { token } = store.issue("donor@example.org", now);

  const firstVisit = store.redeem(token, now + 60_000);
  const secondVisit = store.redeem(token, now + 120_000);

  assert.equal(firstVisit?.email, "donor@example.org");
  assert.equal(firstVisit?.receipt.amountCents, 7500);
  assert.equal(firstVisit?.reminder.shift, "Community pantry check-in");
  assert.equal(firstVisit?.campaign.donorCount, 41);
  assert.equal(secondVisit, null);
});

test("an expired magic link does not reveal member content", () => {
  const store = new MagicLinkStore();
  const now = Date.parse("2026-09-03T10:00:00Z");
  const { token } = store.issue("volunteer@example.org", now);

  assert.equal(store.redeem(token, now + 15 * 60 * 1_000), null);
});
