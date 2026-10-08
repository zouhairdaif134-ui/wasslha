#!/usr/bin/env node
import { readdirSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

const root = process.cwd();
const migrationsDir = resolve(root, "supabase", "migrations");
const baselinePath = resolve(root, "docs", "database", "migration-lineage-baseline.json");

const files = readdirSync(migrationsDir)
  .filter((name) => name.endsWith(".sql"))
  .sort();

const baseline = JSON.parse(readFileSync(baselinePath, "utf8"));
const errors = [];

const timestampGroups = new Map();

for (const file of files) {
  const match = /^(\d{14})_([a-z0-9_]+)\.sql$/.exec(file);
  if (!match) {
    errors.push(`Invalid migration filename: ${file}`);
    continue;
  }

  const [, timestamp] = match;
  const list = timestampGroups.get(timestamp) ?? [];
  list.push(file);
  timestampGroups.set(timestamp, list);
}

for (const [timestamp, group] of timestampGroups) {
  if (group.length < 2) continue;

  const allowed = new Set(baseline.known_duplicate_timestamps[timestamp] ?? []);
  const unexpected = group.filter((file) => !allowed.has(file));
  const missing = [...allowed].filter((file) => !group.includes(file));

  if (unexpected.length || missing.length) {
    errors.push(
      `Migration timestamp collision changed for ${timestamp}. Unexpected: ${unexpected.join(", ") || "none"}. Missing baseline entries: ${missing.join(", ") || "none"}.`
    );
  }
}

const expectedKnownGroups = Object.entries(baseline.known_duplicate_timestamps);
for (const [timestamp, expected] of expectedKnownGroups) {
  const actual = timestampGroups.get(timestamp) ?? [];
  if (actual.length !== expected.length || expected.some((file) => !actual.includes(file))) {
    errors.push(`Known migration collision baseline mismatch for ${timestamp}.`);
  }
}

if (errors.length) {
  console.error("MIGRATION INTEGRITY GATE: FAIL");
  for (const error of errors) console.error(`- ${error}`);
  process.exit(1);
}

console.log("MIGRATION INTEGRITY GATE: PASS");
console.log(`Migration files checked: ${files.length}`);
console.log(
  `Known timestamp-collision groups: ${expectedKnownGroups.length}`
);
console.log(
  "Live Supabase migration-history verification is intentionally separate and read-only; do not edit schema_migrations directly."
);
