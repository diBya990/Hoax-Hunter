// Measures how well the Scam Helper works, on a labeled test set.
// This is EVALUATION, not training: nothing is learned from the test set.
//
// It sends every message to the running app's /api/analyze and compares three
// ways of deciding:  rules only  |  AI only  |  blended (what the app shows).
//
// Usage (the app must be running):  node eval/run-eval.mjs [baseUrl]
import { readFileSync, writeFileSync } from "node:fs";

const BASE = process.argv[2] ?? "http://localhost:3000";
const THRESHOLD = 40; // a score at or above this counts as "flagged as a scam"
const DELAY_MS = 2500; // be gentle with the free AI quota

const set = JSON.parse(readFileSync(new URL("./helper-test-set.json", import.meta.url), "utf8"));
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const rows = [];
for (const [i, item] of set.entries()) {
  let data = null;
  for (let attempt = 0; attempt < 3 && !data; attempt++) {
    try {
      const res = await fetch(`${BASE}/api/analyze`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: item.text }),
      });
      if (res.ok) data = await res.json();
      else await sleep(4000);
    } catch {
      await sleep(4000);
    }
  }
  const row = {
    id: item.id,
    label: item.label,
    hard: item.hard,
    rule: data?.ruleScore ?? null,
    ai: data?.aiScore ?? null,
    blended: data?.score ?? null,
    source: data?.source ?? "failed",
  };
  rows.push(row);
  console.log(
    `${String(i + 1).padStart(2)}/${set.length} ${item.id} ${item.label.padEnd(5)} rule=${row.rule} ai=${row.ai} blended=${row.blended} [${row.source}]`
  );
  await sleep(DELAY_MS);
}

function metrics(key) {
  let tp = 0, fp = 0, tn = 0, fn = 0, skipped = 0;
  const wrong = [];
  for (const r of rows) {
    const score = r[key];
    if (score === null) {
      skipped++;
      continue;
    }
    const flagged = score >= THRESHOLD;
    const isScam = r.label === "scam";
    if (flagged && isScam) tp++;
    else if (flagged && !isScam) fp++;
    else if (!flagged && !isScam) tn++;
    else fn++;
    if (flagged !== isScam) wrong.push(`${r.id}(${score})`);
  }
  const n = tp + fp + tn + fn;
  return {
    n,
    skipped,
    accuracy: (tp + tn) / n,
    catchRate: tp / (tp + fn || 1), // share of scams caught (recall)
    falseAlarm: fp / (fp + tn || 1), // share of safe messages wrongly flagged
    precision: tp / (tp + fp || 1),
    tp, fp, tn, fn,
    wrong,
  };
}

const pct = (x) => (100 * x).toFixed(1) + "%";
const results = { rules: metrics("rule"), ai: metrics("ai"), blended: metrics("blended") };

// the hard messages only
const hardRows = rows.filter((r) => r.hard);
const hardAcc = (key) => {
  const ok = hardRows.filter((r) => r[key] !== null && (r[key] >= THRESHOLD) === (r.label === "scam")).length;
  return ok / hardRows.length;
};

let md = `# Scam Helper accuracy\n\n`;
md += `Test set: ${set.length} labeled messages (${set.filter((s) => s.label === "scam").length} scams, ${set.filter((s) => s.label === "safe").length} safe), `;
md += `${hardRows.length} of them hard (real-looking safe messages or convincing scams).\n`;
md += `A message counts as flagged when its score is ${THRESHOLD} or more. Run on ${new Date().toISOString().slice(0, 10)}.\n\n`;
md += `| Method | Accuracy | Scams caught | False alarms | Hard messages correct |\n|---|---|---|---|---|\n`;
for (const [name, key, m] of [
  ["Rules only", "rule", results.rules],
  ["AI only", "ai", results.ai],
  ["**Hybrid (blended)**", "blended", results.blended],
]) {
  md += `| ${name} | ${pct(m.accuracy)} (${m.tp + m.tn}/${m.n}) | ${pct(m.catchRate)} (${m.tp}/${m.tp + m.fn}) | ${pct(m.falseAlarm)} (${m.fp}/${m.fp + m.tn}) | ${pct(hardAcc(key))} |\n`;
}
md += `\nMistakes: rules ${results.rules.wrong.join(", ") || "none"}; AI ${results.ai.wrong.join(", ") || "none"}; hybrid ${results.blended.wrong.join(", ") || "none"}.\n`;
if (results.ai.skipped) md += `\n(The AI was unavailable for ${results.ai.skipped} message(s); they are left out of the AI-only column.)\n`;

writeFileSync(new URL("./RESULTS.md", import.meta.url), md);
writeFileSync(new URL("./results.json", import.meta.url), JSON.stringify({ rows, results }, null, 2));
console.log("\n" + md);
