// Runs ONLY the rule engine over the labeled test set (no AI, no network).
// Usage: node --experimental-strip-types eval/rules-only.mjs
import { readFileSync } from "node:fs";
import { runRules } from "../src/lib/riskEngine.ts";

const set = JSON.parse(readFileSync(new URL("./helper-test-set.json", import.meta.url), "utf8"));
const THRESHOLD = 40; // a score at or above this counts as "flagged as a scam"

let tp = 0, fp = 0, tn = 0, fn = 0;
const wrong = [];
for (const item of set) {
  const r = runRules(item.text);
  const flagged = r.score >= THRESHOLD;
  const isScam = item.label === "scam";
  if (flagged && isScam) tp++;
  else if (flagged && !isScam) fp++;
  else if (!flagged && !isScam) tn++;
  else fn++;
  if (flagged !== isScam) {
    wrong.push(`${item.id} (${item.label}, score ${r.score}): ${r.signals.map((s) => `${s.id}${s.points > 0 ? "+" : ""}${s.points}`).join(" ")}`);
  }
}

const pct = (n) => (100 * n).toFixed(1) + "%";
console.log(`Rules only, threshold ${THRESHOLD}`);
console.log(`  accuracy  ${pct((tp + tn) / set.length)}  (${tp + tn}/${set.length})`);
console.log(`  catch rate (recall) ${pct(tp / (tp + fn))}  missed scams: ${fn}`);
console.log(`  false alarms        ${pct(fp / (fp + tn))}  safe flagged: ${fp}`);
console.log(wrong.length ? "Wrong:\n  " + wrong.join("\n  ") : "No mistakes.");
