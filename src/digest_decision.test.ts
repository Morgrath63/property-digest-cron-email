import assert from "node:assert/strict";
import test from "node:test";
import { shouldSendDigest } from "./digest_decision.js";

test("an empty property day does not email subscribers", () => {
  assert.equal(shouldSendDigest({
    subscribers: ["manager@example.com"],
    maintenance_requests: [{ unit: "2B", summary: "Loose handle", priority: "routine" }],
    tenant_documents: [],
    inspection_reminders: [],
  }), false);
});

test("an inspection reminder makes the scheduled digest worth sending", () => {
  assert.equal(shouldSendDigest({
    subscribers: ["manager@example.com"],
    maintenance_requests: [],
    tenant_documents: [],
    inspection_reminders: [{ unit: "7A", due_date: "2026-09-15" }],
  }), true);
});
