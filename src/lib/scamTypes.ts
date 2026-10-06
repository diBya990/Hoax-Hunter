// The scam knowledge shared by every part of the game: the red flags a scam
// can contain, and the scam types themselves. Global examples only.

export type RedFlagId =
  | "urgency"
  | "authority"
  | "fear"
  | "greed"
  | "secrecy"
  | "odd-payment"
  | "bad-link"
  | "otp"
  | "personal-info"
  | "bad-sender"
  | "too-good"
  | "emotional";

export const RED_FLAGS: Record<RedFlagId, { label: string; tip: string }> = {
  urgency: {
    label: "Fake urgency",
    tip: "Scammers rush you so you cannot think. Real companies give you time.",
  },
  authority: {
    label: "Pretends to be an authority",
    tip: "A bank, boss or government name is easy to fake. Contact them yourself.",
  },
  fear: {
    label: "Scares you",
    tip: "Threats like 'account locked' or 'legal action' are meant to make you panic.",
  },
  greed: {
    label: "Tempts you with a reward",
    tip: "Prizes and easy money you never asked for are bait.",
  },
  secrecy: {
    label: "Asks you to keep it secret",
    tip: "'Do not tell anyone' stops others from warning you.",
  },
  "odd-payment": {
    label: "Strange payment method",
    tip: "Gift cards, crypto and wire transfers are hard to get back.",
  },
  "bad-link": {
    label: "Suspicious link",
    tip: "Shortened or lookalike links hide where they really go.",
  },
  otp: {
    label: "Asks for a code or password",
    tip: "Nobody legitimate will ever ask for your one-time code or password.",
  },
  "personal-info": {
    label: "Asks for personal details",
    tip: "ID numbers and card details should never be sent in a message.",
  },
  "bad-sender": {
    label: "Odd sender",
    tip: "Unknown numbers or slightly wrong addresses are a warning sign.",
  },
  "too-good": {
    label: "Too good to be true",
    tip: "High pay for little work, or guaranteed returns, are classic lies.",
  },
  emotional: {
    label: "Plays on your feelings",
    tip: "Sad stories and sudden affection are used to lower your guard.",
  },
};

export type ScamTypeId =
  | "bank-phishing"
  | "fake-delivery"
  | "prize-lottery"
  | "fake-job"
  | "tech-support"
  | "romance"
  | "crypto-investment"
  | "boss-impersonation"
  | "otp-theft"
  | "fake-scholarship"
  | "family-emergency"
  | "gov-impersonation"
  | "rental-scam";

export type ScamType = {
  id: ScamTypeId;
  name: string;
  summary: string;
  flags: RedFlagId[]; // the flags this scam usually uses
  difficulty: 1 | 2 | 3; // 1 = easy to spot, 3 = very convincing
};

export const SCAM_TYPES: ScamType[] = [
  {
    id: "bank-phishing",
    name: "Bank Phishing",
    summary: "A fake bank message says your account is in danger and sends you to a fake site.",
    flags: ["fear", "urgency", "bad-link", "authority"],
    difficulty: 1,
  },
  {
    id: "fake-delivery",
    name: "Fake Delivery",
    summary: "A 'missed parcel' text asks for a small fee or your details.",
    flags: ["bad-link", "urgency", "bad-sender"],
    difficulty: 1,
  },
  {
    id: "prize-lottery",
    name: "Prize and Lottery",
    summary: "You 'won' something you never entered, but must pay a fee to claim it.",
    flags: ["greed", "odd-payment", "too-good"],
    difficulty: 1,
  },
  {
    id: "fake-job",
    name: "Fake Job Offer",
    summary: "Great pay for easy remote work, after you pay a 'training' or 'equipment' fee.",
    flags: ["too-good", "odd-payment", "personal-info"],
    difficulty: 2,
  },
  {
    id: "tech-support",
    name: "Tech Support",
    summary: "A pop-up or call says your device is infected and asks for remote access.",
    flags: ["fear", "authority", "urgency", "odd-payment"],
    difficulty: 2,
  },
  {
    id: "romance",
    name: "Romance Scam",
    summary: "Someone you met online builds trust fast, then needs money for an emergency.",
    flags: ["emotional", "secrecy", "odd-payment"],
    difficulty: 3,
  },
  {
    id: "crypto-investment",
    name: "Crypto Investment",
    summary: "A 'guaranteed' investment that shows fake profits until you try to withdraw.",
    flags: ["greed", "too-good", "urgency", "odd-payment"],
    difficulty: 3,
  },
  {
    id: "boss-impersonation",
    name: "Boss Impersonation",
    summary: "A message 'from your boss' asks for an urgent, secret gift-card or payment favor.",
    flags: ["authority", "urgency", "secrecy", "odd-payment", "bad-sender"],
    difficulty: 2,
  },
  {
    id: "otp-theft",
    name: "Code Theft",
    summary: "They trick you into reading out the one-time code sent to your phone.",
    flags: ["otp", "urgency", "authority"],
    difficulty: 2,
  },
  {
    id: "fake-scholarship",
    name: "Fake Scholarship",
    summary: "You are 'selected' for funding, but must pay a fee or share private details.",
    flags: ["greed", "personal-info", "odd-payment", "urgency"],
    difficulty: 2,
  },
  {
    id: "family-emergency",
    name: "Family Emergency",
    summary: "'Hi Mum, this is my new number.' A fake relative needs money right now.",
    flags: ["emotional", "urgency", "bad-sender", "odd-payment"],
    difficulty: 2,
  },
  {
    id: "gov-impersonation",
    name: "Government Impersonation",
    summary: "A fake tax or fine notice promises a refund or threatens a penalty.",
    flags: ["authority", "greed", "bad-link", "urgency", "personal-info"],
    difficulty: 2,
  },
  {
    id: "rental-scam",
    name: "Rental Scam",
    summary: "A too-cheap apartment, with a deposit to pay before you can even see it.",
    flags: ["too-good", "odd-payment", "urgency"],
    difficulty: 2,
  },
];

export function getScamType(id: string): ScamType | undefined {
  return SCAM_TYPES.find((t) => t.id === id);
}
