# Scam Helper accuracy

Test set: 40 labeled messages (20 scams, 20 safe), 13 of them hard (real-looking safe messages or convincing scams).
A message counts as flagged when its score is 40 or more. Run on 2026-10-07.

| Method | Accuracy | Scams caught | False alarms | Hard messages correct |
|---|---|---|---|---|
| Rules only | 92.5% (37/40) | 85.0% (17/20) | 0.0% (0/20) | 84.6% |
| AI only | 100.0% (40/40) | 100.0% (20/20) | 0.0% (0/20) | 100.0% |
| **Hybrid (blended)** | 100.0% (40/40) | 100.0% (20/20) | 0.0% (0/20) | 100.0% |

Mistakes: rules s05(38), s16(27), s20(33); AI none; hybrid none.
