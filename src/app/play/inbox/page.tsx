import type { Metadata } from "next";
import InboxGame from "@/components/InboxGame";

export const metadata: Metadata = { title: "Inbox Defender · Hoax Hunter" };

export default function InboxPage() {
  return <InboxGame />;
}
