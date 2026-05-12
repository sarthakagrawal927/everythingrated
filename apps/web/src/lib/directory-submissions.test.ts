import assert from "node:assert/strict";
import {
  normalizeAspectLabels,
  slugifyDirectoryName,
  validateDirectorySubmission,
} from "./directory-submissions";

assert.equal(slugifyDirectoryName("AI Design Tools!"), "ai-design-tools");
assert.equal(slugifyDirectoryName("  Databases & Queues  "), "databases-queues");
assert.equal(slugifyDirectoryName("'Quoted' \"Things\""), "quoted-things");
assert.equal(slugifyDirectoryName("---"), "");
assert.equal(slugifyDirectoryName("a".repeat(120)).length, 60);

assert.deepEqual(
  normalizeAspectLabels(["Cost", " cost ", "", "Developer Experience"]),
  ["Cost", "Developer Experience"],
);
assert.deepEqual(
  normalizeAspectLabels(["Quality", "QUALITY", "quality"]),
  ["Quality"],
);
assert.deepEqual(
  normalizeAspectLabels(["  whitespace   between  words  "]),
  ["whitespace between words"],
);
assert.equal(
  normalizeAspectLabels(Array.from({ length: 20 }, (_, i) => `Aspect ${i}`)).length,
  8,
);

assert.equal(
  validateDirectorySubmission({
    name: "AI design tools",
    description: "Design agents and creative tools for app builders.",
    heroCopy: "Compare quality, cost, reliability, and workflow fit.",
    aspectLabels: ["Quality", "Cost", "Reliability"],
  }).ok,
  true,
);

const invalid = validateDirectorySubmission({
  name: "AI",
  description: "Too short",
  heroCopy: "Also too short",
  aspectLabels: ["Cost"],
});
assert.equal(invalid.ok, false);

// Whitespace-only inputs should fail length checks after trim.
const whitespace = validateDirectorySubmission({
  name: "   ",
  description: " ".repeat(40),
  heroCopy: " ".repeat(40),
  aspectLabels: ["Quality", "Cost", "Reliability"],
});
assert.equal(whitespace.ok, false);

// Case-insensitive duplicate aspects collapse to below MIN_ASPECTS.
const dupAspects = validateDirectorySubmission({
  name: "AI design tools",
  description: "Design agents and creative tools for app builders.",
  heroCopy: "Compare quality, cost, reliability, and workflow fit.",
  aspectLabels: ["Quality", "QUALITY", "quality"],
});
assert.equal(dupAspects.ok, false);

// Per-field length cap of 500 — single oversized aspect should reject.
const longAspect = validateDirectorySubmission({
  name: "AI design tools",
  description: "Design agents and creative tools for app builders.",
  heroCopy: "Compare quality, cost, reliability, and workflow fit.",
  aspectLabels: ["Quality", "Cost", "a".repeat(501)],
});
assert.equal(longAspect.ok, false);

// Submitter info is optional and may be omitted entirely.
assert.equal(
  validateDirectorySubmission({
    name: "AI design tools",
    description: "Design agents and creative tools for app builders.",
    heroCopy: "Compare quality, cost, reliability, and workflow fit.",
    aspectLabels: ["Quality", "Cost", "Reliability"],
    submitterName: "",
    submitterEmail: "",
  }).ok,
  true,
);
