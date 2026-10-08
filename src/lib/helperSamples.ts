// The "TRY" buttons in the Scam Helper. Each click builds a NEW message of that kind
// from realistic parts, so there are hundreds of different ones and you never get the
// same message twice in a row. All fictional: generic wording, fake lookalike links.

export type SampleKind = "bank" | "code" | "job";

const pick = <T,>(items: readonly T[]): T => items[Math.floor(Math.random() * items.length)];
const between = (min: number, max: number) => min + Math.floor(Math.random() * (max - min + 1));

// ---------- a fake bank alert (a scam) ----------

const BANK_OPENERS = ["URGENT:", "ALERT:", "SECURITY NOTICE:", "FINAL WARNING:", "Important notice:"];
const BANK_PROBLEMS = [
  "Your bank account has been suspended due to unusual activity.",
  "We detected a suspicious sign-in to your account.",
  "Your card has been temporarily frozen for your protection.",
  () => `A payment of $${between(120, 1800)} from your account was blocked.`,
  "Your online banking access will be disabled today.",
  "Your account has been locked after several failed login attempts.",
];
const BANK_ACTIONS = [
  "Verify your identity now to restore access:",
  () => `Confirm your details within ${pick([2, 6, 12, 24])} hours to avoid permanent closure:`,
  "Log in immediately to unlock your account:",
  "Update your information now to cancel this transaction:",
  "Re-activate your account here:",
];
const BANK_LINKS = [
  "secure-bank-login.top/verify",
  "account-verify-now.co/login",
  "bank-secure-update.xyz/restore",
  "my-card-unlock.info/id",
  "online-banking-help.click/signin",
  "verify-my-account.net/secure",
  "bank-alert-center.top/confirm",
];

// ---------- a real code message (safe) ----------

const CODE_NAMES = ["verification code", "login code", "one-time password", "security code", "confirmation code"];
const CODE_TEMPLATES: ((name: string, code: string, minutes: number) => string)[] = [
  (n, c, m) => `Your ${n} is ${c}. Do not share this code with anyone. It expires in ${m} minutes.`,
  (n, c, m) => `${c} is your ${n}. Never share it with anyone, including our staff. Valid for ${m} minutes.`,
  (n, c, m) => `Your ${n}: ${c}. If you did not request this, you can ignore this message. It expires in ${m} minutes.`,
  (n, c, m) => `Use ${c} to confirm your sign-in. We will never ask you for this code. It is valid for ${m} minutes.`,
  (n, c, m) => `Your ${n} is ${c}. Please do not tell it to anyone. The code expires in ${m} minutes.`,
];

// ---------- a fake job offer (a scam) ----------

const JOB_OPENERS = [
  () => `Earn $${pick([150, 250, 300, 400, 500, 800])} per day from home!`,
  () => `Work from your phone and make $${pick([200, 300, 450, 600])} a day!`,
  () => `We're hiring! Earn $${pick([900, 1200, 1500, 2000])} a week with simple online tasks.`,
  () => `Part-time remote job: $${pick([180, 220, 350, 500])} per day, paid daily.`,
];
const JOB_MIDDLES = ["No experience needed.", "No interview, start today.", "Flexible hours, anyone can do it."];
const JOB_FEES = [
  () => `Just pay a one-time $${pick([40, 60, 80, 100])} registration fee to get started.`,
  () => `A small $${pick([50, 75, 90, 120])} starter-kit fee is required to begin.`,
  () => `Pay a refundable $${pick([60, 100, 150])} training deposit to unlock your account.`,
];
const JOB_CLOSERS = [
  "Limited spots, apply today!",
  "Reply YES now to secure your place.",
  () => `Message us on Telegram @${pick(["hr_jobs_2026", "work_from_home_hr", "easy_hiring_desk"])} to start.`,
  () => `Apply here: ${pick(["jobs-start-now.xyz", "easy-income-hub.top", "remote-work-apply.info", "quick-hire-portal.click"])}`,
];

const resolve = (part: string | (() => string)) => (typeof part === "function" ? part() : part);

function build(kind: SampleKind): string {
  switch (kind) {
    case "bank": {
      const link = `${Math.random() < 0.6 ? "http://" : ""}${pick(BANK_LINKS)}`;
      return `${pick(BANK_OPENERS)} ${resolve(pick(BANK_PROBLEMS))} ${resolve(pick(BANK_ACTIONS))} ${link}`;
    }
    case "code": {
      const code = String(between(100000, 999999));
      return pick(CODE_TEMPLATES)(pick(CODE_NAMES), code, pick([5, 10, 15]));
    }
    case "job":
      return [resolve(pick(JOB_OPENERS)), pick(JOB_MIDDLES), resolve(pick(JOB_FEES)), resolve(pick(JOB_CLOSERS))].join(" ");
  }
}

/** A new sample message of this kind. It is never the same as `previous`. */
export function sampleMessage(kind: SampleKind, previous = ""): string {
  let text = build(kind);
  for (let i = 0; i < 5 && text === previous; i++) text = build(kind);
  return text;
}
