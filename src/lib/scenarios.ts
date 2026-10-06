// Hand-written game rounds (global examples, no real company names).
// Later, AI-generated scenarios use the same Scenario shape.

import { CLUES } from "@/lib/clues";
import type { Scenario } from "@/lib/scenarioTypes";

const BASE_SCENARIOS: Scenario[] = [
  // ---------------- scams ----------------
  {
    id: "bank-1",
    channel: "sms",
    sender: "Your Bank",
    text: "ALERT: Unusual sign-in on your account. Your card has been frozen. Confirm your identity now: secure-bank-verify.co/login",
    kind: "scam",
    scamType: "bank-phishing",
    redFlags: ["fear", "urgency", "bad-link", "authority"],
    explanation:
      "Banks do not freeze cards by text and ask you to log in through a link. The link goes to a lookalike site that steals your password. Open your bank's real app yourself instead.",
    difficulty: 1,
  },
  {
    id: "delivery-1",
    channel: "sms",
    sender: "+44 7700 900123",
    text: "Your parcel could not be delivered. Pay a $1.99 redelivery fee within 24 hours: parcel-redeliver.xyz/pay",
    kind: "scam",
    scamType: "fake-delivery",
    redFlags: ["bad-link", "urgency", "bad-sender"],
    explanation:
      "A tiny fee looks harmless, but the payment page steals your card details. Real couriers use their official app or a tracking number you already have.",
    difficulty: 1,
  },
  {
    id: "prize-1",
    channel: "email",
    sender: "Global Prize Center",
    subject: "Congratulations! You won $50,000",
    text: "You were randomly selected as our grand prize winner! To release your $50,000, send a $150 processing fee by gift card within 48 hours.",
    kind: "scam",
    scamType: "prize-lottery",
    redFlags: ["greed", "too-good", "odd-payment", "urgency"],
    explanation:
      "You cannot win a contest you never entered, and real prizes never cost money to claim. Gift cards are a favourite of scammers because they are almost impossible to trace.",
    difficulty: 1,
  },
  {
    id: "job-1",
    channel: "whatsapp",
    sender: "Recruiter Amy",
    text: "Hi! We saw your profile. Earn $300 a day liking videos from home, no experience needed. Just pay a $60 starter-kit fee to begin today.",
    kind: "scam",
    scamType: "fake-job",
    redFlags: ["too-good", "odd-payment"],
    explanation:
      "Real employers pay you, you do not pay them. High pay for almost no work plus an upfront fee is the classic fake-job pattern.",
    difficulty: 2,
  },
  {
    id: "tech-1",
    channel: "email",
    sender: "Tech Support Team",
    subject: "Your computer is infected!",
    text: "We detected 5 viruses on your device. Call 1-800-555-0199 immediately and do not turn off your computer. A technician will need remote access to fix it.",
    kind: "scam",
    scamType: "tech-support",
    redFlags: ["fear", "urgency", "authority"],
    explanation:
      "No company can detect viruses on your computer from an email. Giving remote access lets the scammer steal files and passwords.",
    difficulty: 2,
  },
  {
    id: "romance-1",
    channel: "dm",
    sender: "Sophia",
    text: "I know we only met last week, but I feel such a connection with you. I'm stuck abroad and my card got blocked. Could you send $400 in gift cards? Please don't tell anyone, I'm so embarrassed.",
    kind: "scam",
    scamType: "romance",
    redFlags: ["emotional", "secrecy", "odd-payment"],
    explanation:
      "Fast affection followed by an emergency money request is the heart of a romance scam. The 'keep it secret' line is there so nobody can warn you.",
    difficulty: 3,
  },
  {
    id: "crypto-1",
    channel: "dm",
    sender: "Crypto Mentor",
    text: "My students made 40% in 3 days with our trading bot. Guaranteed returns! Deposit $200 today, spots close tonight.",
    kind: "scam",
    scamType: "crypto-investment",
    redFlags: ["greed", "too-good", "urgency", "odd-payment"],
    explanation:
      "Nobody can guarantee investment returns. The fake dashboard shows growing profits until you try to withdraw, and then the money is gone.",
    difficulty: 2,
  },
  {
    id: "boss-1",
    channel: "email",
    sender: "Mark (CEO) <mark.ceo@mail-corp.net>",
    subject: "Quick favor",
    text: "I'm in a meeting and can't talk. Buy 5 gift cards ($100 each) for a client and send me the codes. Keep this between us. Thanks.",
    kind: "scam",
    scamType: "boss-impersonation",
    redFlags: ["authority", "urgency", "secrecy", "odd-payment", "bad-sender"],
    explanation:
      "The address is not your company's real domain, and no boss asks for gift-card codes in secret. Call your boss on a number you already have.",
    difficulty: 2,
  },
  {
    id: "otp-1",
    channel: "sms",
    sender: "+1 (555) 013-4410",
    text: "Your bank here: we blocked a suspicious transfer. A code was just sent to your phone. Please read it out to our agent to cancel the payment.",
    kind: "scam",
    scamType: "otp-theft",
    redFlags: ["otp", "urgency", "authority"],
    explanation:
      "That code is what approves the scammer's own payment. A real bank will never ask you to read out a one-time code.",
    difficulty: 2,
  },
  {
    id: "scholar-1",
    channel: "email",
    sender: "Scholarship Office",
    subject: "You have been selected!",
    text: "You have been selected for a $5,000 scholarship! To release the funds, reply with a copy of your ID and pay a $75 processing fee today.",
    kind: "scam",
    scamType: "fake-scholarship",
    redFlags: ["greed", "personal-info", "odd-payment", "urgency"],
    explanation:
      "Real scholarships never charge a fee, and you apply for them first. Sending your ID also opens the door to identity theft.",
    difficulty: 2,
  },
  {
    id: "family-1",
    channel: "sms",
    sender: "+1 (555) 013-7788",
    text: "Hi, it's me! I lost my phone and this is my new number. Can you send $300 for an urgent bill? I'll pay you back tonight.",
    kind: "scam",
    scamType: "family-emergency",
    redFlags: ["emotional", "urgency", "bad-sender", "odd-payment"],
    explanation:
      "Scammers pretend to be a relative on a 'new number'. Call the person on their old number before sending anything.",
    difficulty: 2,
  },

  // ---------------- legitimate ----------------
  {
    id: "legit-pharmacy",
    channel: "sms",
    sender: "Your Pharmacy",
    text: "Your prescription is ready for pickup at the Main Street store. Reply STOP to opt out.",
    kind: "safe",
    scamType: "legit",
    redFlags: [],
    explanation:
      "No link, no pressure, no money and no personal details. It is the kind of simple reminder real businesses send.",
    difficulty: 1,
  },
  {
    id: "legit-carrier",
    channel: "sms",
    sender: "Mobile Carrier",
    text: "Your monthly bill of $45 is ready. You can view it any time in the official app. No action needed.",
    kind: "safe",
    scamType: "legit",
    redFlags: [],
    explanation:
      "It points you to the official app and asks for nothing. Notice there is no link and no deadline.",
    difficulty: 1,
  },
  {
    id: "legit-mom",
    channel: "whatsapp",
    sender: "Mom",
    text: "Don't forget dinner at 7 tonight. Bring a dessert if you can!",
    kind: "safe",
    scamType: "legit",
    redFlags: [],
    explanation:
      "A normal message from a saved contact, with no money or link. Not every message is a trap.",
    difficulty: 1,
  },
  {
    id: "legit-library",
    channel: "email",
    sender: "University Library",
    subject: "Book due on Friday",
    text: "Your library book 'Intro to Algorithms' is due on Friday. You can renew it in the library portal or at the front desk.",
    kind: "safe",
    scamType: "legit",
    redFlags: [],
    explanation:
      "It is about something you actually did, offers two normal ways to act, and asks for no payment or password.",
    difficulty: 2,
  },
  {
    id: "legit-store",
    channel: "email",
    sender: "Online Store",
    subject: "Your order has shipped",
    text: "Thanks for your order #48213. It will ship in 2-3 business days. You can track it any time from your account page.",
    kind: "safe",
    scamType: "legit",
    redFlags: [],
    explanation:
      "If you did place this order, it is normal. If you do not remember it, do not click anything: log in to the store yourself to check.",
    difficulty: 2,
  },
  {
    id: "legit-bank",
    channel: "email",
    sender: "Your Bank",
    subject: "Your statement is ready",
    text: "Your monthly statement is available. Log in through the official app to view it. We will never ask for your password by email or text.",
    kind: "safe",
    scamType: "legit",
    redFlags: [],
    explanation:
      "It sends you to the official app, not a link, and it even warns you about password scams. Good banks do this.",
    difficulty: 3,
  },

  // ---------------- more scams ----------------
  {
    id: "gov-1",
    channel: "sms",
    sender: "Tax Office",
    text: "You are owed a tax refund of $412. Claim it before it expires today: gov-refund-claim.co/id",
    kind: "scam",
    scamType: "gov-impersonation",
    redFlags: ["authority", "greed", "bad-link", "urgency"],
    explanation:
      "Tax offices do not text refund links. The page asks for your ID and bank details. Check your refund by logging in to the official government site yourself.",
    difficulty: 2,
  },
  {
    id: "rental-1",
    channel: "email",
    sender: "Lakeside Homes",
    subject: "Amazing apartment, $400 a month",
    text: "Gorgeous 2-bedroom near campus for only $400/month! Many applicants, so wire a $800 deposit today to hold it. You can view it after payment.",
    kind: "scam",
    scamType: "rental-scam",
    redFlags: ["too-good", "odd-payment", "urgency"],
    explanation:
      "A price far below the market, a rush, and a deposit before you have even seen the place. Never pay for a home you have not visited.",
    difficulty: 2,
  },

  // ---------------- more safe messages ----------------
  {
    id: "legit-dentist",
    channel: "sms",
    sender: "Smile Dental",
    text: "Reminder: your appointment is tomorrow at 10:00. Reply C to confirm or call the clinic to reschedule.",
    kind: "safe",
    scamType: "legit",
    redFlags: [],
    explanation:
      "It is about an appointment you made, it has no link, and it asks for no money or personal details.",
    difficulty: 1,
  },
  {
    id: "legit-study",
    channel: "whatsapp",
    sender: "Study Group",
    text: "Library room 204 is booked for 6pm. Bring your laptops!",
    kind: "safe",
    scamType: "legit",
    redFlags: [],
    explanation: "A normal message in a group you know. Nothing is being asked of you.",
    difficulty: 1,
  },
  {
    id: "legit-subscription",
    channel: "email",
    sender: "Streaming Service",
    subject: "Your plan renews on the 5th",
    text: "Your subscription renews on the 5th for $9.99. You can change or cancel it any time in Settings, then Billing.",
    kind: "safe",
    scamType: "legit",
    redFlags: [],
    explanation:
      "It tells you where to manage things yourself inside the app, instead of giving you a link or a deadline.",
    difficulty: 2,
  },

  // ---------------- unsure: the right move is to VERIFY ----------------
  {
    id: "unsure-signin",
    channel: "email",
    sender: "Account Security",
    subject: "New sign-in to your account",
    text: "We noticed a sign-in from a new device in another city. If this was you, no action is needed. If not, review your recent activity in your account settings.",
    kind: "unsure",
    scamType: "unclear",
    redFlags: ["fear", "authority"],
    explanation:
      "This could be a real security alert, or a copy of one. There is no link, which is a good sign, but you cannot be sure. Open the official app yourself and check your activity there.",
    difficulty: 2,
  },
  {
    id: "unsure-package",
    channel: "sms",
    sender: "Courier Service",
    text: "Your package from an order you placed will arrive tomorrow between 2pm and 4pm.",
    kind: "unsure",
    scamType: "unclear",
    redFlags: ["bad-sender"],
    explanation:
      "If you are expecting a package, this is probably real. If not, it is a way to start a scam conversation. Check your order history in your account to be sure.",
    difficulty: 2,
  },
  {
    id: "unsure-gym",
    channel: "whatsapp",
    sender: "+1 (555) 014-9921",
    text: "Hey! It's Jordan from the gym. I got your number from Sam. Want to join our weekend run group?",
    kind: "unsure",
    scamType: "unclear",
    redFlags: ["bad-sender"],
    explanation:
      "It may be a genuine invitation. But strangers also use a friendly mutual contact to build trust. Ask Sam whether Jordan is real before replying.",
    difficulty: 3,
  },
  {
    id: "unsure-invoice",
    channel: "email",
    sender: "Accounts Team",
    subject: "Updated bank details",
    text: "Hello, please note that our bank details have changed. Use the new account number in the attached file for this month's invoice.",
    kind: "unsure",
    scamType: "unclear",
    redFlags: ["odd-payment", "authority"],
    explanation:
      "Changed payment details are a common way to redirect money. It might be genuine, so phone the company on a number you already have before paying.",
    difficulty: 3,
  },
  {
    id: "unsure-reset",
    channel: "sms",
    sender: "Account Help",
    text: "Your password reset code is 482910. If you did not request this, you can ignore this message.",
    kind: "unsure",
    scamType: "unclear",
    redFlags: ["otp"],
    explanation:
      "If you asked for a reset, this is normal. If you did not, someone may be trying to get into your account. Never share the code, and check your account security.",
    difficulty: 2,
  },
  {
    id: "unsure-recruiter",
    channel: "email",
    sender: "Talent Partner",
    subject: "A role that matches your profile",
    text: "Hi, I'm a recruiter and we have a role that matches your profile. Could we schedule a 15-minute call this week to talk it through?",
    kind: "unsure",
    scamType: "unclear",
    redFlags: ["too-good", "bad-sender"],
    explanation:
      "Real recruiters write like this, and so do fake ones. Look the company and the recruiter up on the official careers site before sharing anything.",
    difficulty: 2,
  },
  {
    id: "unsure-friend",
    channel: "dm",
    sender: "Alex",
    text: "Is this you in this video?? lol watch: vid-share.me/watch/8841",
    kind: "unsure",
    scamType: "unclear",
    redFlags: ["bad-link", "emotional"],
    explanation:
      "Hacked friend accounts send links like this. It might really be Alex, but do not click. Message Alex another way and ask if they sent it.",
    difficulty: 2,
  },
];

// Attach the Detective-mode clues (see clues.ts) to the scenarios that have them.
export const SCENARIOS: Scenario[] = BASE_SCENARIOS.map((s) =>
  CLUES[s.id] ? { ...s, clues: CLUES[s.id] } : s
);
