// The exact phrases that give each hand-written scam away (for Detective mode).
// Every phrase must appear word-for-word in that scenario's text.

import type { Clue } from "@/lib/scenarioTypes";

export const CLUES: Record<string, Clue[]> = {
  "bank-1": [
    { phrase: "Your card has been frozen", flag: "fear" },
    { phrase: "Confirm your identity now", flag: "urgency" },
    { phrase: "secure-bank-verify.co/login", flag: "bad-link" },
  ],
  "delivery-1": [
    { phrase: "Pay a $1.99 redelivery fee", flag: "odd-payment" },
    { phrase: "within 24 hours", flag: "urgency" },
    { phrase: "parcel-redeliver.xyz/pay", flag: "bad-link" },
  ],
  "prize-1": [
    { phrase: "randomly selected as our grand prize winner", flag: "greed" },
    { phrase: "$50,000", flag: "too-good" },
    { phrase: "send a $150 processing fee by gift card", flag: "odd-payment" },
    { phrase: "within 48 hours", flag: "urgency" },
  ],
  "job-1": [
    { phrase: "Earn $300 a day liking videos from home", flag: "too-good" },
    { phrase: "no experience needed", flag: "too-good" },
    { phrase: "pay a $60 starter-kit fee", flag: "odd-payment" },
  ],
  "tech-1": [
    { phrase: "We detected 5 viruses on your device", flag: "fear" },
    { phrase: "immediately", flag: "urgency" },
    { phrase: "do not turn off your computer", flag: "fear" },
    { phrase: "A technician will need remote access", flag: "authority" },
  ],
  "romance-1": [
    { phrase: "I feel such a connection with you", flag: "emotional" },
    { phrase: "Could you send $400 in gift cards", flag: "odd-payment" },
    { phrase: "Please don't tell anyone", flag: "secrecy" },
  ],
  "crypto-1": [
    { phrase: "made 40% in 3 days", flag: "greed" },
    { phrase: "Guaranteed returns", flag: "too-good" },
    { phrase: "Deposit $200 today", flag: "odd-payment" },
    { phrase: "spots close tonight", flag: "urgency" },
  ],
  "boss-1": [
    { phrase: "I'm in a meeting and can't talk", flag: "urgency" },
    { phrase: "Buy 5 gift cards ($100 each)", flag: "odd-payment" },
    { phrase: "Keep this between us", flag: "secrecy" },
  ],
  "otp-1": [
    { phrase: "Your bank here", flag: "authority" },
    { phrase: "we blocked a suspicious transfer", flag: "fear" },
    { phrase: "Please read it out to our agent", flag: "otp" },
  ],
  "scholar-1": [
    { phrase: "selected for a $5,000 scholarship", flag: "greed" },
    { phrase: "reply with a copy of your ID", flag: "personal-info" },
    { phrase: "pay a $75 processing fee", flag: "odd-payment" },
  ],
  "family-1": [
    { phrase: "this is my new number", flag: "bad-sender" },
    { phrase: "Can you send $300", flag: "odd-payment" },
    { phrase: "an urgent bill", flag: "urgency" },
  ],
  "gov-1": [
    { phrase: "You are owed a tax refund of $412", flag: "greed" },
    { phrase: "before it expires today", flag: "urgency" },
    { phrase: "gov-refund-claim.co/id", flag: "bad-link" },
  ],
  "rental-1": [
    { phrase: "for only $400/month", flag: "too-good" },
    { phrase: "Many applicants", flag: "urgency" },
    { phrase: "wire a $800 deposit today", flag: "odd-payment" },
  ],
};
